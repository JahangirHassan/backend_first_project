import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from "../controllers/expense.controller.js";

const router = Router();

router.use(verifyJWT); // all expense routes require authentication

router
  .route("/")
  .post(upload.single("receipt"), createExpense)
  .get(getExpenses);

router
  .route("/:expenseId")
  .get(getExpenseById)
  .patch(upload.single("receipt"), updateExpense)
  .delete(deleteExpense);

export default router;
