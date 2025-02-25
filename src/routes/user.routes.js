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
  updateUserCoverImage,
  getUserChannelUpdate,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-user-datails").patch(verifyJWT, updateUserDetails);
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("update-cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/channel/:userName").get(verifyJWT, getUserChannelUpdate);
router.route("/watchHistory").get(verifyJWT, getWatchHistory);

export default router;
