import { Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { AuthRequest } from "./user.controller.js";
import { Budget } from "../models/budget.model.js";
import {
  Income,
  IncomeSource,
  RecurrenceInterval,
  RecurrenceIntervalType,
  MAX_LIMIT,
  SortField,
  ALLOWED_SORT_FIELDS,
} from "../models/income.model.js";

const createIncome = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }
  const { amount, source, date, notes, isRecurring, recurrenceInterval } =
    req.body as {
      amount: number;
      source: IncomeSource;
      date?: string;
      notes?: string;
      isRecurring?: boolean;
      recurrenceInterval?: RecurrenceIntervalType;
    };
  if (amount === undefined || amount === null || !source) {
    throw new ApiError(400, "amount and source are required");
  }

  // if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
  //   throw new ApiError(400, "amount must be a positive number");
  // }

  if (isRecurring && !recurrenceInterval) {
    throw new ApiError(
      400,
      "recurrenceInterval is required when isRecurring is true"
    );
  }
  if (
    recurrenceInterval &&
    !Object.values(RecurrenceInterval).includes(recurrenceInterval)
  ) {
    throw new ApiError(400, "Invalid recurrenceInterval");
  }

  let parsedDate: Date | undefined;
  if (date) {
    parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new ApiError(400, "Invalid date");
    }
  }

  const income = await Income.create({
    user: req.user?._id,
    amount,
    source,
    date: parsedDate,
    notes,
    isRecurring: !!isRecurring,
    recurrenceInterval: isRecurring ? recurrenceInterval : undefined,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, income, "Income entry created successfully"));
});

const getIncomes = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const {
    page = "1",
    limit = "10",
    sort = "date",
    sortOrder = "desc",
  } = req.query as {
    page?: string;
    limit?: string;
    sort?: string;
    sortOrder?: "asc" | "desc";
  };

  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!Number.isInteger(pageNum) || pageNum < 1) {
    throw new ApiError(400, "page must be a positive integer");
  }
  if (!Number.isInteger(limitNum) || limitNum < 1) {
    throw new ApiError(400, "limit must be a positive integer");
  }

  const safeLimit = Math.min(limitNum, MAX_LIMIT);

  const sortField: SortField = ALLOWED_SORT_FIELDS.includes(sort as SortField)
    ? (sort as SortField)
    : "date";

  const normalizedOrder = sortOrder.toLowerCase();
  if (normalizedOrder !== "asc" && normalizedOrder !== "desc") {
    throw new ApiError(400, "sortOrder must be 'asc' or 'desc'");
  }
  const sortDirection = normalizedOrder === "desc" ? -1 : 1;

  const filter: Record<string, any> = {
    user: req.user?._id,
  };
  // const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  // const limitNum = Math.max(parseInt(limit, 10) || 20, 1);

  const [result] = await Income.aggregate([
    { $match: filter },
    {
      $facet: {
        incomes: [
          { $sort: { [sortField]: sortDirection } },
          { $skip: (pageNum - 1) * safeLimit },
          { $limit: safeLimit },
        ],
        summary: [
          {
            $group: {
              _id: null,
              totalIncome: { $sum: "$amount" },
              totalDocuments: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const incomes = result?.incomes ?? [];
  const summary = result?.summary?.[0] ?? {
    totalIncome: 0,
    totalDocuments: 0,
  };

  const response = {
    incomes,
    summary: {
      totalIncome: summary.totalIncome,
      totalDocuments: summary.totalDocuments,
    },
    pagination: {
      page: pageNum,
      limit: safeLimit,
      totalPages: Math.ceil(summary.totalDocuments / safeLimit) || 0,
    },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, response, "Income entries fetched successfully")
    );
});

const getIncomeById = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }
  const { incomeId } = req.params as { incomeId: string };
  if (!mongoose.Types.ObjectId.isValid(incomeId)) {
    throw new ApiError(400, "Invalid income id");
  }

  const income = await Income.findOne({ _id: incomeId, user: req.user?._id });

  if (!income) {
    throw new ApiError(404, "Income entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, income, "Income entry fetched successfully"));
});

const updateIncome = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const { incomeId } = req.params as { incomeId: string };

  if (!incomeId || !mongoose.Types.ObjectId.isValid(incomeId)) {
    throw new ApiError(400, "Invalid income id");
  }

  const { amount, source, date, notes, isRecurring, recurrenceInterval } =
    req.body as Partial<{
      amount: number;
      source: IncomeSource;
      date: string;
      notes: string;
      isRecurring: boolean;
      recurrenceInterval: RecurrenceIntervalType;
    }>;

  const income = await Income.findOne({ _id: incomeId, user: req.user?._id });

  if (!income) {
    throw new ApiError(404, "Income entry not found");
  }

  if (amount !== undefined) income.amount = amount;
  if (source) income.source = source;
  if (date) income.date = new Date(date);
  if (notes !== undefined) income.notes = notes;
  if (isRecurring !== undefined) income.isRecurring = isRecurring;
  if (recurrenceInterval) income.recurrenceInterval = recurrenceInterval;

  if (income.isRecurring && !income.recurrenceInterval) {
    throw new ApiError(
      400,
      "recurrenceInterval is required when isRecurring is true"
    );
  }

  await income.save();

  return res
    .status(200)
    .json(new ApiResponse(200, income, "Income entry updated successfully"));
});

const deleteIncome = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { incomeId } = req.params as { incomeId: string };

  if (!mongoose.Types.ObjectId.isValid(incomeId)) {
    throw new ApiError(400, "Invalid income id");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const income = await Income.findOneAndDelete({
      _id: incomeId,
      user: req.user?._id,
    }).session(session);

    if (!income) {
      throw new ApiError(404, "Income entry not found");
    }

    const totalBudgetLimit = await Budget.aggregate([
      { $match: { user: req.user?._id } },
      { $group: { _id: null, totalLimit: { $sum: "$limitAmount" } } },
    ]).session(session);

    const totalIncome = await Income.aggregate([
      { $match: { user: req.user?._id } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]).session(session);

    const budgetLimitSum = totalBudgetLimit[0]?.totalLimit ?? 0;
    const incomeSum = totalIncome[0]?.totalAmount ?? 0;

    if (budgetLimitSum > incomeSum) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(
        400,
        "Cannot delete this income: total budget limit would exceed total income"
      );
    }

    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Income entry deleted successfully"));
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw err;
  }
});

export { createIncome, getIncomes, getIncomeById, updateIncome, deleteIncome };
