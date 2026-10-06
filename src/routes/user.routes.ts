import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  forgotPassword,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { rateLimit, MINUTE } from "express-rate-limit";
const router = Router();

// const authLimiter = rateLimit({
//   windowMs: 15 * MINUTE,
//   limit: 100, // login/register/forgot-password are high-value targets — keep this tight
//   standardHeaders: "draft-8",
//   legacyHeaders: false,
//   ipv6Subnet: 56,
//   message: "Too many attempts, please try again later.",
// });

router.route("/register").post(
  upload.fields([{ name: "avatar", maxCount: 1 }]),
  // authLimiter,
  registerUser
);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

//secure routes
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-user-datails").patch(verifyJWT, updateUserDetails);
router.route("/forgot-password").post(forgotPassword);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

export default router;
