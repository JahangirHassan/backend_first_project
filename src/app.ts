import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { rateLimit, MINUTE } from "express-rate-limit";
import { ApiError } from "./utils/ApiError.js";

const app = express();

// Needed if running behind a reverse proxy/load balancer (Nginx, Vercel, etc.)
// so express-rate-limit and req.ip see the real client IP.

app.set("trust proxy", 1);

const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error("CORS_ORIGIN environment variable is required");
}

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(helmet());

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(mongoSanitize());
app.use(hpp());
app.use(express.static("public"));
app.use(cookieParser());

// Stricter limiter specifically for sensitive auth endpoints
// const authLimiter = rateLimit({
//   windowMs: 15 * MINUTE,
//   limit: 100,
//   standardHeaders: "draft-8",
//   legacyHeaders: false,
//   ipv6Subnet: 56,
//   message: "Too many attempts, please try again later.",
// });

// routes import
import userRouter from "./routes/user.routes.js";
import budgetRouter from "./routes/budget.routes.js";
import chartRouter from "./routes/chart.routes.js";
import expenseRouter from "./routes/expense.routes.js";
import incomeRouter from "./routes/income.routes.js";

// routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/budgets", budgetRouter);
app.use("/api/v1/charts", chartRouter);
app.use("/api/v1/expenses", expenseRouter);
app.use("/api/v1/income", incomeRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler — must be last, must have 4 args
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        errors: err.errors ?? [],
      });
    }

    console.error(err);

    return res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : String(err),
    });
  }
);

export { app };
