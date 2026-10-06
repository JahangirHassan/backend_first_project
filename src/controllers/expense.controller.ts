import { Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { AuthRequest } from "./user.controller.js";
import {
  Expense,
  PaymentMethod,
  PaymentMethodType,
  ALLOWED_SORT_FIELDS,
  SortField,
  MAX_LIMIT,
} from "../models/expense.model.js";
import {
  RecurrenceInterval,
  RecurrenceIntervalType,
} from "../models/income.model.js";
import { Budget } from "../models/budget.model.js";

const createExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }
  const {
    amount,
    budget,
    date,
    paymentMethod,
    notes,
    isRecurring,
    recurrenceInterval,
  } = req.body as {
    amount: number;
    budget: string;
    date?: string;
    paymentMethod: PaymentMethodType;
    notes?: string;
    isRecurring?: boolean;
    recurrenceInterval?: RecurrenceIntervalType;
  };

  if (amount === undefined || amount === null || !budget || !paymentMethod) {
    throw new ApiError(400, "amount, budget and paymentMethod are required");
  }

  // if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
  //   throw new ApiError(400, "amount must be a positive number");
  // }

  if (!Object.values(PaymentMethod).includes(paymentMethod)) {
    throw new ApiError(400, "Invalid payment method");
  }
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
  if (!mongoose.Types.ObjectId.isValid(budget)) {
    throw new ApiError(400, "Invalid budget id");
  }

  let parsedDate: Date | undefined;
  if (date) {
    parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new ApiError(400, "Invalid date");
    }
  }

  // find budget by budget id and user_id
  const budgetObj = await Budget.findOne({
    _id: budget,
    user: req.user?._id,
  });

  if (!budgetObj) {
    throw new ApiError(404, "Budget not found");
  }

  //find budget remaining ammount
  const [budgetData] = await Budget.aggregate([
    {
      $match: {
        _id: budgetObj?._id,
        user: req.user?._id,
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
      $group: {
        _id: null,
        remainingAmount: {
          $sum: "$remainingAmount",
        },
      },
    },
  ]);

  if (
    budgetData?.remainingAmount !== null &&
    budgetData?.remainingAmount !== undefined
  ) {
    if (amount > budgetData?.remainingAmount) {
      throw new ApiError(400, "Amount exceeds the budget limit");
    }
  }

  let receiptUrl: string | undefined;
  const receiptLocalPath = (req.file as Express.Multer.File | undefined)?.path;

  if (receiptLocalPath) {
    const uploadedReceipt = await uploadOnCloudinary(receiptLocalPath);
    if (!uploadedReceipt) {
      throw new ApiError(500, "Error uploading receipt image");
    }
    receiptUrl = uploadedReceipt.url;
  }

  const expense = await Expense.create({
    user: req.user?._id,
    amount,
    budget,
    date: parsedDate,
    paymentMethod,
    notes,
    receiptUrl,
    isRecurring: !!isRecurring,
    recurrenceInterval: isRecurring ? recurrenceInterval : undefined,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, expense, "Expense entry created successfully"));
});

// Get Expenses

const getExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  // --- sort: whitelist field, validate order ---
  const sortField: SortField = ALLOWED_SORT_FIELDS.includes(sort as SortField)
    ? (sort as SortField)
    : "date";

  const normalizedOrder = sortOrder.toLowerCase();
  if (normalizedOrder !== "asc" && normalizedOrder !== "desc") {
    throw new ApiError(400, "sortOrder must be 'asc' or 'desc'");
  }

  const sortDirection = normalizedOrder === "desc" ? -1 : 1;

  const filter: Record<string, any> = {
    user: req.user._id,
  };

  const [result] = await Expense.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: "budgets",
        localField: "budget",
        foreignField: "_id",
        as: "budget",
      },
    },
    { $unwind: "$budget" },
    {
      $facet: {
        expenses: [
          { $sort: { [sortField]: sortDirection } },
          { $skip: (pageNum - 1) * safeLimit },
          { $limit: safeLimit },
          {
            $project: {
              amount: 1,
              notes: 1,
              paymentMethod: 1,
              date: 1,
              budget: {
                _id: "$budget._id",
                name: "$budget.name",
                period: "$budget.period",
                limitAmount: "$budget.limitAmount",
              },
            },
          },
        ],
        summary: [
          {
            $group: {
              _id: null,
              totalExpense: { $sum: "$amount" },
              totalDocuments: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const expenses = result?.expenses ?? [];
  const summary = result?.summary?.[0] ?? {
    totalExpense: 0,
    totalDocuments: 0,
  };

  const response = {
    expenses,
    summary: {
      totalExpense: summary.totalExpense,
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
      new ApiResponse(200, response, "Expense entries fetched successfully")
    );
});
// Get Expenses by Id
const getExpenseById = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const { expenseId } = req.params as { expenseId: string };

  if (!expenseId || !mongoose.Types.ObjectId.isValid(expenseId)) {
    throw new ApiError(400, "Invalid expense id");
  }

  const expense = await Expense.findOne({
    _id: expenseId,
    user: req.user?._id,
  })
    .populate("budget", "name")
    .lean();

  if (!expense) {
    throw new ApiError(404, "Expense entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, expense, "Expense entry fetched successfully"));
});
// Update Expenses
const updateExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const { expenseId } = req.params as { expenseId: string };
  if (!expenseId || !mongoose.Types.ObjectId.isValid(expenseId)) {
    throw new ApiError(400, "Invalid expense id");
  }

  const {
    amount,
    budget,
    date,
    paymentMethod,
    notes,
    isRecurring,
    recurrenceInterval,
  } = req.body as Partial<{
    amount: number;
    budget: string;
    date: string;
    paymentMethod: PaymentMethodType;
    notes: string;
    isRecurring: boolean;
    recurrenceInterval: RecurrenceIntervalType;
  }>;

  const expense = await Expense.findOne({
    _id: expenseId,
    user: req.user?._id,
  });

  if (!expense) {
    throw new ApiError(404, "Expense entry not found");
  }

  if (budget) {
    if (!mongoose.Types.ObjectId.isValid(budget)) {
      throw new ApiError(400, "Invalid budget id");
    }
    const categoryExists = await Budget.findOne({
      _id: budget,
      $or: [{ user: req.user?._id }, { isPredefined: true }],
    });
    if (!categoryExists) {
      throw new ApiError(404, "Category not found");
    }
    expense.budget = categoryExists._id as mongoose.Types.ObjectId;
  }

  if (amount !== undefined) expense.amount = amount;
  if (date) expense.date = new Date(date);
  if (paymentMethod) expense.paymentMethod = paymentMethod;
  if (notes !== undefined) expense.notes = notes;
  if (isRecurring !== undefined) expense.isRecurring = isRecurring;
  if (recurrenceInterval) expense.recurrenceInterval = recurrenceInterval;

  if (expense.isRecurring && !expense.recurrenceInterval) {
    throw new ApiError(
      400,
      "recurrenceInterval is required when isRecurring is true"
    );
  }

  // Replace the receipt image if a new one was uploaded
  const receiptLocalPath = (req.file as Express.Multer.File | undefined)?.path;
  if (receiptLocalPath) {
    const uploadedReceipt = await uploadOnCloudinary(receiptLocalPath);
    if (!uploadedReceipt) {
      throw new ApiError(500, "Error uploading receipt image");
    }
    // NOTE: the previous receipt image (if any) is not deleted from Cloudinary here —
    // deleteOnCloudinary expects a public_id, not the stored URL, so wire that up
    // once receipts store their public_id alongside the URL.
    expense.receiptUrl = uploadedReceipt.url;
  }

  await expense.save();

  return res
    .status(200)
    .json(new ApiResponse(200, expense, "Expense entry updated successfully"));
});

// Delete Expenses by Id
const deleteExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { expenseId } = req.params as { expenseId: string };

  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    throw new ApiError(400, "Invalid expense id");
  }

  const expense = await Expense.findOneAndDelete({
    _id: expenseId,
    user: req.user?._id,
  });

  if (!expense) {
    throw new ApiError(404, "Expense entry not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Expense entry deleted successfully"));
});

export {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
