import mongoose, { Schema, Document, Types, Model } from "mongoose";

export type BudgetPeriod = "weekly" | "monthly";

export interface IBudget extends Document {
  user: Types.ObjectId;
  name: string;
  description?: string;
  limitAmount: number;
  expense:Types.ObjectId;
  period: BudgetPeriod;
  rollover: boolean; // if true, unused budget carries forward to the next period
  startDate: Date; // start of the current tracking period
  createdAt: Date;
  updatedAt: Date;
}

const budgetSchema = new Schema<IBudget>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    limitAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    period: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
    },
    rollover: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One active budget per user/expense/period combo
// (expense: null covers the "overall" budget case)
budgetSchema.index({ user: 1, name: 1 }, { unique: true });

export const Budget: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>("Budget", budgetSchema);
