import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  getExpenseTrend,
  getIncomeTrend,
  getExpenseByBudget,
  getBudgetVsActual,
  getMonthlySummary,
  getExpenseByPaymentMethod,
} from "../controllers/chart.controller.js";

const chartRouter = Router();

// All routes require authentication
chartRouter.use(verifyJWT);

chartRouter.get("/expense-trend", getExpenseTrend);
chartRouter.get("/income-trend", getIncomeTrend);
chartRouter.get("/expense-by-budget", getExpenseByBudget);
chartRouter.get("/budget-vs-actual", getBudgetVsActual);
chartRouter.get("/monthly-summary", getMonthlySummary);
chartRouter.get("/expense-by-payment-method", getExpenseByPaymentMethod);

export default chartRouter;
