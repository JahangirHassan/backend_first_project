import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  createIncome,
  getIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome,
} from "../controllers/income.controller.js";

const router = Router();

router.use(verifyJWT); // all income routes require authentication

router.route("/").post(createIncome).get(getIncomes);

router
  .route("/:incomeId")
  .get(getIncomeById)
  .patch(updateIncome)
  .delete(deleteIncome);

export default router;
