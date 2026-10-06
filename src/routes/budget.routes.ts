import { Router } from "express";

import {
  createBudget,
  getUserBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetStatistics,
} from "../controllers/budget.controller.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

/* -------------------------------------------------------------------------- */
/*                             Protected Routes                               */
/* -------------------------------------------------------------------------- */

router.use(verifyJWT);

/* -------------------------------------------------------------------------- */
/*                                CRUD Routes                                 */
/* -------------------------------------------------------------------------- */

// Create Budget
router.post("/", createBudget);

// Get All Budgets
router.get("/", getUserBudgets);

// Budget Statistics
router.get("/statistics", getBudgetStatistics);

// Get Single Budget
router.get("/:budgetId", getBudgetById);

// Update Budget
router.patch("/:budgetId", updateBudget);

// Delete Budget
router.delete("/:budgetId", deleteBudget);

export default router;
