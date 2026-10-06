import { asyncHandler } from "../utils/asyncHandler.js";
import { Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../controllers/user.controller.js";
import mongoose from "mongoose";
import { IUser } from "../validation/auth.validation.js";

interface DecodedAccessToken {
  _id: string;
  iat?: number;
  exp?: number;
}

const verifyJWT = asyncHandler(
  async (req: AuthRequest, _: Response, next: NextFunction) => {
    const token: string | undefined =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    let decodeToken: DecodedAccessToken;
    try {
      // const cookieHeader = req.headers.cookie?.split(";") || [];
      // const tokenPart = cookieHeader.find((c) =>
      //   c.trim().startsWith("accessToken=")
      // );
      // const acessToken = tokenPart && tokenPart.split("=")[1];
      // const accessToken: string | undefined =
      //   req.cookies?.accessToken || acessToken;

      // if (!accessToken) {
      //   throw new ApiError(401, "Unauthorized request");
      // }
      // const token =
      //   req.cookies?.accessToken ||
      //   req.header("Authorization")?.replace("Bearer ", ""); // fallback rakh sakte ho, harm nahi

      // if (!token) {
      //   throw new ApiError(401, "Unauthorized request");
      // }

      decodeToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as DecodedAccessToken;
    } catch (error: any) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, "Access token expired");
      }
      throw new ApiError(401, error?.message || " invalid Token request");
    }
    const user = await User.findById(decodeToken._id).select(
      "-password -__v -refreshTokens -passwordResetToken -passwordResetExpires"
    );

    if (!user) {
      //TODE Discussion about frontend
      throw new ApiError(401, "invalid access token");
    }

    req.user = user as IUser & { _id: mongoose.Types.ObjectId };
    next();
  }
);

export { verifyJWT };
