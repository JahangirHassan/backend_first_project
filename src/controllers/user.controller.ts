import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { IUser } from "../validation/auth.validation.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import fs from "fs";
import { sendEmail } from "../utils/sendEmail.js";

export interface AuthRequest extends Request {
  user?: IUser & { _id: mongoose.Types.ObjectId };
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface DecodedRefreshToken {
  _id: string;
  iat?: number;
  exp?: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
} as const;

const safeUnlink = (path?: string) => {
  if (path) fs.unlink(path, () => {});
};

const generateAcessAndRefreshtoken = async (
  userId: mongoose.Types.ObjectId | string
): Promise<TokenPair> => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found while generating tokens");
    }

    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshTokens = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      500,
      "something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, userName, fullName, password } = req.body as {
    email: string;
    userName: string;
    fullName: string;
    password: string;
  };

  if (
    [email, userName, fullName, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "all fields are mandatory");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new ApiError(400, "invalid email format");
  }

  const userExisted = await User.findOne({
    $or: [{ email: normalizedEmail }, { userName: userName.toLowerCase() }],
  });
  if (userExisted) {
    throw new ApiError(409, "user already exist");
  }

  let avatarLocalPath: string | undefined;
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;

  if (files && Array.isArray(files.avatar) && files.avatar.length > 0) {
    avatarLocalPath = files.avatar[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }

  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
      throw new ApiError(500, "error uploading images to cloudinary");
    }
  } finally {
    safeUnlink(avatarLocalPath);
  }

  const userCreation = await User.create({
    email: normalizedEmail,
    fullName,
    userName: userName.toLowerCase(),
    avatar: avatar.url,
    password,
  });

  const createdUser = await User.findById(userCreation._id).select(
    "-password -refreshTokens"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong in creation of user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, userName, password } = req.body as {
    email?: string;
    userName?: string;
    password: string;
  };

  if (!email && !userName) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [
      { email: email?.toLowerCase() },
      { userName: userName?.toLowerCase() },
    ],
  }).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const correctPassword = await user.isPasswordCorrect(password);

  if (!correctPassword) {
    throw new ApiError(401, "password incorrect");
  }

  const { refreshToken, accessToken } = await generateAcessAndRefreshtoken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshTokens -passwordResetExpires -passwordResetToken"
  );

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    { $unset: { refreshTokens: 1 } },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incomingRefreshToken: string | undefined =
        req.cookies?.refreshToken || req.body?.refreshToken;

      if (!incomingRefreshToken) {
        throw new ApiError(
          401,
          "unauthorized request, refresh token is required"
        );
      }

      const verifyRefreshToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET as string
      ) as DecodedRefreshToken;

      const user = await User.findById(verifyRefreshToken?._id).select(
        "+refreshTokens"
      );

      if (!user) {
        throw new ApiError(401, "invalid refresh token");
      }

      if (incomingRefreshToken !== user?.refreshTokens) {
        throw new ApiError(401, "refresh token is expired or used");
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await generateAcessAndRefreshtoken(user._id);

      res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", newRefreshToken, cookieOptions)
        .json(
          new ApiResponse(200, { user }, "Access token refreshed successfully")
        );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, "refresh token expired");
      }
      throw new ApiError(401, "invalid refresh token used");
    }
  }
);

const changeCurrentPassword = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { oldPassword, newPassword } = req.body as {
      oldPassword: string;
      newPassword: string;
    };

    if (!oldPassword || !newPassword) {
      throw new ApiError(400, "oldPassword and newPassword are required");
    }

    if (newPassword.length < 8) {
      throw new ApiError(400, "newPassword must be at least 8 characters");
    }

    const user = await User.findById(req.user?._id).select("+password");
    if (!user) {
      throw new ApiError(404, "user not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(401, "old password is incorrect");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "password changed successfully"));
  }
);

const getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "user fetched successfully"));
});

const updateUserDetails = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { fullName, email } = req.body as { fullName: string; email: string };

    if (!fullName || !email) {
      throw new ApiError(400, "fullName and email are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new ApiError(400, "invalid email format");
    }

    const emailTaken = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user?._id },
    });
    if (emailTaken) {
      throw new ApiError(409, "email is already in use");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { $set: { fullName, email: normalizedEmail } },
      { new: true }
    ).select(
      "-password -refreshTokens -passwordResetExpires -passwordResetToken"
    );

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User account updated successfully"));
  }
);

const updateUserAvatar = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const updatedAvatarLocalPath = (req.file as Express.Multer.File | undefined)
      ?.path;

    if (!updatedAvatarLocalPath) {
      throw new ApiError(400, "avatar file is required");
    }

    let avatar;
    try {
      avatar = await uploadOnCloudinary(updatedAvatarLocalPath);
      if (!avatar?.url) {
        throw new ApiError(500, "error uploading avatar to cloudinary");
      }
    } finally {
      safeUnlink(updatedAvatarLocalPath);
    }

    // NOTE: old avatar on Cloudinary is not deleted here — wire up
    // deleteOnCloudinary with the stored public_id once you track it,
    // same as the receipt image issue in the expense controller.
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { $set: { avatar: avatar.url } },
      { new: true }
    ).select("-password -refreshTokens");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User avatar updated successfully"));
  }
);

const forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email } = req.body as { email?: string };

  if (!email) {
    throw new ApiError(400, "email is required");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });

  // Always respond the same way whether or not the user exists,
  // to avoid leaking which emails are registered.
  if (user) {
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset",
        html: `Click below to reset password\n\n${resetURL}\n\nThis link expires in 15 minutes.`,
      });
    } catch (err) {
      // don't leave a dangling reset token if the email never went out
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      throw new ApiError(500, "failed to send password reset email");
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "If that email is registered, a reset link has been sent."
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  forgotPassword,
};
