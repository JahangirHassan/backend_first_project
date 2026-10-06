import { Request, Response } from "express";
import { Types } from "mongoose";
import { Budget, IBudget, BudgetPeriod } from "../models/budget.model.js";
import { Expense } from "../models/expense.model.js";
import { Income } from "../models/income.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                               Helper Methods                               */
/* -------------------------------------------------------------------------- */

export interface AuthRequest extends Request {
  user: {
    _id: Types.ObjectId;
  };
}

/**
 * Find budget by id
 */
const findBudgetById = async (
  budgetId: string,
  userId: Types.ObjectId
): Promise<IBudget> => {
  const budget = await Budget.findOne({
    _id: budgetId,
    user: userId,
  });

  if (!budget) {
    throw new ApiError(404, "Budget not found.");
  }

  return budget;
};

/**
 * Check duplicate budget
 */
const checkDuplicateBudget = async (
  userId: Types.ObjectId,
  name: string
): Promise<void> => {
  const existing = await Budget.findOne({
    user: userId,
    name,
  });

  if (existing) {
    throw new ApiError(
      409,
      "Budget already exists for this expense and period."
    );
  }
};

/**
 * Calculate total spent in a budget
 */
const calculateSpentAmount = async (
  budgetId: Types.ObjectId
): Promise<number> => {
  const result = await Expense.aggregate([
    {
      $match: {
        budget: budgetId,
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$amount",
        },
      },
    },
  ]);

  return result.length ? result[0].total : 0;
};

/**
 * Calculate remaining budget
 */
const calculateRemainingBudget = async (
  budgetId: Types.ObjectId,
  limitAmount: number
): Promise<number> => {
  const spent = await calculateSpentAmount(budgetId);

  return limitAmount - spent;
};

/* -------------------------------------------------------------------------- */
/*                              Create Budget                                 */
/* -------------------------------------------------------------------------- */

export const createBudget = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user._id;

    const {
      expense,
      limitAmount,
      period,
      description,
      name,
      rollover,
      startDate,
    } = req.body;
    if (!name) {
      throw new ApiError(400, "Budget name is required.");
    }

    if (!limitAmount || limitAmount <= 0) {
      throw new ApiError(400, "Budget amount must be greater than zero.");
    }

    if (!period) {
      throw new ApiError(400, "Budget period is required.");
    }

    const expenseId = expense ? new Types.ObjectId(expense) : null;

    await checkDuplicateBudget(userId, name);
    // budget limit never be exceeded by income
    const income = await Income.aggregate([
      {
        $match: {
          user: userId,
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: "$amount",
          },
        },
      },
    ]);
    if (!income || income.length === 0) {
      throw new ApiError(400, "You have to set income first");
    }
    if (limitAmount > income[0].totalIncome) {
      throw new ApiError(400, "Budget limit exceeds from total income");
    }

    const budget = await Budget.create({
      user: userId,
      expense: expenseId,
      limitAmount,
      period,
      name,
      description,
      rollover: rollover ?? false,
      startDate: startDate ?? new Date(),
    });

    return res
      .status(201)
      .json(new ApiResponse(201, budget, "Budget created successfully."));
  }
);

/* -------------------------------------------------------------------------- */
/*                            Get User Budgets                                */
/* -------------------------------------------------------------------------- */

export const getUserBudgets = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user._id;

    const budgets = await Budget.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
        },
      },

      {
        $lookup: {
          from: "expenses",
          localField: "_id",
          foreignField: "budget",
          as: "expenses",
        },
      },

      {
        $addFields: {
          spentAmount: {
            $sum: "$expenses.amount",
          },
        },
      },

      {
        $addFields: {
          remainingAmount: {
            $subtract: ["$limitAmount", "$spentAmount"],
          },
        },
      },

      {
        $addFields: {
          percentageUsed: {
            $cond: [
              {
                $eq: ["$limitAmount", 0],
              },
              0,
              {
                $multiply: [
                  {
                    $divide: ["$spentAmount", "$limitAmount"],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },

      {
        $addFields: {
          status: {
            $switch: {
              branches: [
                { case: { $gte: ["$percentageUsed", 80] }, then: "red" },
                { case: { $gte: ["$percentageUsed", 50] }, then: "yellow" },
              ],
              default: "green",
            },
          },
          alert: { $gte: ["$percentageUsed", 80] },
          message: {
            $cond: [
              { $gte: ["$percentageUsed", 80] },
              {
                $concat: [
                  "You've used ",
                  { $toString: { $round: ["$percentageUsed", 0] } },
                  '% of your "',
                  "$name",
                  '" budget',
                ],
              },
              null,
            ],
          },
        },
      },

      {
        $project: {
          expenses: 0,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, budgets, "Budgets fetched successfully."));
  }
);

/* -------------------------------------------------------------------------- */
/*                            Get Budget By Id                                */
/* -------------------------------------------------------------------------- */

export const getBudgetById = asyncHandler(
  async (req: Request, res: Response) => {
    const { budgetId } = req.params as {
      budgetId: string;
    };
    const userId = (req as AuthRequest).user._id;

    const budget = await findBudgetById(budgetId, userId);

    const spentAmount = await calculateSpentAmount(
      budget._id as Types.ObjectId
    );

    const remainingAmount = budget.limitAmount - spentAmount;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          ...budget.toObject(),
          spentAmount,
          remainingAmount,
          percentageUsed:
            budget.limitAmount === 0
              ? 0
              : Number(((spentAmount / budget.limitAmount) * 100).toFixed(2)),
        },
        "Budget fetched successfully."
      )
    );
  }
);

/* -------------------------------------------------------------------------- */
/*                              Update Budget                                 */
/* -------------------------------------------------------------------------- */

export const updateBudget = asyncHandler(
  async (req: Request, res: Response) => {
    const { budgetId } = req.params as {
      budgetId: string;
    };
    const userId = (req as AuthRequest).user._id;

    const budget = await findBudgetById(budgetId, userId);

    const { limitAmount, period, rollover, startDate, name, description } =
      req.body;
    if (limitAmount !== undefined && limitAmount <= 0) {
      throw new ApiError(400, "Budget amount must be greater than zero.");
    }

    if (period !== undefined) {
      const duplicate = await Budget.findOne({
        _id: { $ne: budgetId },
        user: userId,
        period: period ?? budget.period,
      });

      if (duplicate) {
        throw new ApiError(
          409,
          "Another budget already exists with the same expense and period."
        );
      }
    }

    budget.limitAmount = limitAmount ?? budget.limitAmount;
    budget.name = name ?? budget.name;
    budget.description = description ?? budget.description;

    budget.period = period ?? budget.period;

    budget.rollover = rollover ?? budget.rollover;

    budget.startDate = startDate ?? budget.startDate;

    await budget.save();

    return res
      .status(200)
      .json(new ApiResponse(200, budget, "Budget updated successfully."));
  }
);

/* -------------------------------------------------------------------------- */
/*                              Delete Budget                                 */
/* -------------------------------------------------------------------------- */

export const deleteBudget = asyncHandler(
  async (req: Request, res: Response) => {
    if (!(req as AuthRequest)?.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const { budgetId } = req.params as { budgetId: string };

    if (!mongoose.Types.ObjectId.isValid(budgetId)) {
      throw new ApiError(400, "Invalid budget id");
    }

    const session = await mongoose.startSession();

    try {
      let deletedExpenseCount = 0;

      await session.withTransaction(async () => {
        // Ownership check — budget must belong to this user
        const budget = await Budget.findOne({
          _id: budgetId,
          user: (req as AuthRequest).user._id,
        }).session(session);

        if (!budget) {
          throw new ApiError(404, "Budget not found");
        }

        // Cascade delete — remove every expense linked to this budget
        const deleteResult = await Expense.deleteMany({
          budget: budgetId,
          user: (req as AuthRequest).user._id,
        }).session(session);

        deletedExpenseCount = deleteResult.deletedCount ?? 0;

        await Budget.deleteOne({ _id: budgetId }).session(session);
      });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { deletedExpenseCount },
            `Budget and ${deletedExpenseCount} associated expense(s) deleted successfully`
          )
        );
    } finally {
      await session.endSession();
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                         Budget Statistics                                  */
/* -------------------------------------------------------------------------- */

export const getBudgetStatistics = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user._id;

    const budgets = await Budget.find({
      user: userId,
    });

    const statistics = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await calculateSpentAmount(budget._id as Types.ObjectId);

        return {
          budgetId: budget._id,
          limitAmount: budget.limitAmount,
          spentAmount: spent,
          remainingAmount: budget.limitAmount - spent,
          percentageUsed:
            budget.limitAmount === 0
              ? 0
              : Number(((spent / budget.limitAmount) * 100).toFixed(2)),
        };
      })
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          statistics,
          "Budget statistics fetched successfully."
        )
      );
  }
);
