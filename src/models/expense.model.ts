import mongoose, { Schema, Document, Types, Model } from "mongoose";
import { RecurrenceIntervalType } from "./income.model.js";

export const PaymentMethod = [
  "cash",
  "card",
  "bank_transfer",
  "wallet",
] as const;
export type PaymentMethodType = (typeof PaymentMethod)[number];

export const ALLOWED_SORT_FIELDS = [
  "date",
  "amount",
  "createdAt",
  "paymentMethod",
] as const;
export type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

export const MAX_LIMIT = 100;

export interface IExpense extends Document {
  user: Types.ObjectId;
  amount: number;
  budget: Types.ObjectId; // ref Budget
  date: Date;
  paymentMethod: PaymentMethodType;
  notes?: string;
  receiptUrl?: string; // Cloudinary URL of the uploaded receipt image
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceIntervalType; // required only if isRecurring is true
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    budget: {
      type: Schema.Types.ObjectId,
      ref: "Budget",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer, wallet"],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceInterval: {
      type: String,
      enum: ["weekly", "monthly", "yearly"],
      required: function (this: IExpense) {
        return this.isRecurring === true;
      },
    },
  },
  { timestamps: true }
);

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", expenseSchema);
