import mongoose, { Schema, Document, Types, Model } from "mongoose";

export type IncomeSource =
  | "salary"
  | "freelance"
  | "gifts"
  | "investments"
  | "other";
export const RecurrenceInterval = ["weekly", "monthly", "yearly"] as const;
export type RecurrenceIntervalType = (typeof RecurrenceInterval)[number];

export interface IIncome extends Document {
  user: Types.ObjectId;
  amount: number;
  source: IncomeSource;
  date: Date;
  notes?: string;
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceIntervalType; // required only if isRecurring is true
  createdAt: Date;
  updatedAt: Date;
}

export const ALLOWED_SORT_FIELDS = [
  "date",
  "amount",
  "source",
  "createdAt",
] as const;
export type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

export const MAX_LIMIT = 100;

const incomeSchema = new Schema<IIncome>(
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
    source: {
      type: String,
      enum: ["salary", "freelance", "gifts", "investments", "other"],
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    notes: {
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
      required: function (this: IIncome) {
        return this.isRecurring === true;
      },
    },
  },
  { timestamps: true }
);

export const Income: Model<IIncome> =
  mongoose.models.Income || mongoose.model<IIncome>("Income", incomeSchema);
