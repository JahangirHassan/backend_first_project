import { asyncHandler } from "../utils/asyncHandler.js";
import { Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { Expense } from "../models/expense.model.js";
import { Income } from "../models/income.model.js";
import { Budget } from "../models/budget.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AuthRequest } from "./user.controller.js";

// Get expense trend (last 12 months or custom date range)
export const getExpenseTrend = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const { days = "30" } = req.query as { days?: string };
    const daysNum = Math.min(Math.max(Number(days) || 30, 1), 365);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const [expenses, incomes] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            date: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              day: { $dayOfMonth: "$date" },
            },
            totalExpense: { $sum: "$amount" },
            expenseCount: { $sum: 1 },
          },
        },
      ]),
      Income.aggregate([
        {
          $match: {
            user: req.user._id,
            date: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              day: { $dayOfMonth: "$date" },
            },
            totalIncome: { $sum: "$amount" },
            incomeCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const trendMap = new Map<
      string,
      {
        date: Date;
        totalIncome: number;
        totalExpense: number;
        incomeCount: number;
        expenseCount: number;
        netSavings: number;
      }
    >();

    const keyOf = (d: { year: number; month: number; day: number }) =>
      `${d.year}-${d.month}-${d.day}`;

    expenses.forEach((exp) => {
      const key = keyOf(exp._id);
      if (!trendMap.has(key)) {
        trendMap.set(key, {
          date: new Date(exp._id.year, exp._id.month - 1, exp._id.day),
          totalIncome: 0,
          totalExpense: 0,
          incomeCount: 0,
          expenseCount: 0,
          netSavings: 0,
        });
      }
      const data = trendMap.get(key)!;
      data.totalExpense = exp.totalExpense;
      data.expenseCount = exp.expenseCount;
      data.netSavings = data.totalIncome - data.totalExpense;
    });

    incomes.forEach((inc) => {
      const key = keyOf(inc._id);
      if (!trendMap.has(key)) {
        trendMap.set(key, {
          date: new Date(inc._id.year, inc._id.month - 1, inc._id.day),
          totalIncome: 0,
          totalExpense: 0,
          incomeCount: 0,
          expenseCount: 0,
          netSavings: 0,
        });
      }
      const data = trendMap.get(key)!;
      data.totalIncome = inc.totalIncome;
      data.incomeCount = inc.incomeCount;
      data.netSavings = data.totalIncome - data.totalExpense;
    });

    const trendData = Array.from(trendMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, trendData, "Spending trend fetched successfully")
      );
  }
);

// Get income trend (last 12 months or custom date range)
export const getIncomeTrend = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const { months = 12 } = req.query as { months?: string };
    const monthsNum = Math.min(Number(months) || 12, 24);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsNum);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const trendData = await Income.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: 1,
            },
          },
          totalAmount: 1,
          count: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(200, trendData, "Income trend fetched successfully")
      );
  }
);

// Get expense by budget/category
export const getExpenseByBudget = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const expenseByBudget = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
        },
      },
      {
        $lookup: {
          from: "budgets",
          localField: "budget",
          foreignField: "_id",
          as: "budgetInfo",
        },
      },
      {
        $unwind: "$budgetInfo",
      },
      {
        $group: {
          _id: {
            budgetId: "$budgetInfo._id",
            budgetName: "$budgetInfo.name",
            limitAmount: "$budgetInfo.limitAmount",
          },
          totalSpent: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          budgetId: "$_id.budgetId",
          budgetName: "$_id.budgetName",
          limitAmount: "$_id.limitAmount",
          totalSpent: 1,
          count: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          expenseByBudget,
          "Expense by budget fetched successfully"
        )
      );
  }
);

// Get budget vs actual spending
export const getBudgetVsActual = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const budgetVsActual = await Budget.aggregate([
      {
        $match: {
          user: req.user._id,
        },
      },
      {
        $lookup: {
          from: "expenses",
          let: { budgetId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$budget", "$$budgetId"],
                },
                user: req.user._id,
              },
            },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: "$amount" },
              },
            },
          ],
          as: "expenseData",
        },
      },
      {
        $project: {
          name: 1,
          period: 1,
          limitAmount: 1,
          totalSpent: {
            $ifNull: [{ $arrayElemAt: ["$expenseData.totalSpent", 0] }, 0],
          },
          remaining: {
            $subtract: [
              "$limitAmount",
              {
                $ifNull: [{ $arrayElemAt: ["$expenseData.totalSpent", 0] }, 0],
              },
            ],
          },
          percentageUsed: {
            $cond: [
              { $gt: ["$limitAmount", 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $ifNull: [
                          { $arrayElemAt: ["$expenseData.totalSpent", 0] },
                          0,
                        ],
                      },
                      "$limitAmount",
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          budgetVsActual,
          "Budget vs actual spending fetched successfully"
        )
      );
  }
);

// Get monthly summary (income vs expense)
export const getMonthlySummary = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const { days = "30" } = req.query as { days?: string };
    const daysNum = Math.min(Math.max(Number(days) || 30, 1), 365);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const [expenses, incomes] = await Promise.all([
      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            date: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              day: { $dayOfMonth: "$date" },
            },
            totalExpense: { $sum: "$amount" },
          },
        },
      ]),
      Income.aggregate([
        {
          $match: {
            user: req.user._id,
            date: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              day: { $dayOfMonth: "$date" },
            },
            totalIncome: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const summaryMap = new Map<
      string,
      {
        date: Date;
        totalIncome: number;
        totalExpense: number;
        netSavings: number;
      }
    >();

    const keyOf = (d: { year: number; month: number; day: number }) =>
      `${d.year}-${d.month}-${d.day}`;

    expenses.forEach((exp) => {
      const key = keyOf(exp._id);
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          date: new Date(exp._id.year, exp._id.month - 1, exp._id.day),
          totalIncome: 0,
          totalExpense: 0,
          netSavings: 0,
        });
      }
      const data = summaryMap.get(key)!;
      data.totalExpense = exp.totalExpense;
      data.netSavings = data.totalIncome - data.totalExpense;
    });

    incomes.forEach((inc) => {
      const key = keyOf(inc._id);
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          date: new Date(inc._id.year, inc._id.month - 1, inc._id.day),
          totalIncome: 0,
          totalExpense: 0,
          netSavings: 0,
        });
      }
      const data = summaryMap.get(key)!;
      data.totalIncome = inc.totalIncome;
      data.netSavings = data.totalIncome - data.totalExpense;
    });

    const summaryData = Array.from(summaryMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, summaryData, "Daily summary fetched successfully")
      );
  }
);

// Get payment method breakdown
export const getExpenseByPaymentMethod = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const paymentMethodBreakdown = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          paymentMethod: "$_id",
          totalAmount: 1,
          count: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          paymentMethodBreakdown,
          "Expense by payment method fetched successfully"
        )
      );
  }
);
