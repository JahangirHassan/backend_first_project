import mongoose, { Schema, Model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { IUser, userDocument } from "../validation/auth.validation.js";

const userSchema = new Schema<IUser>(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      minlength: 5,
      maxlength: 20,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true,
      default: "",
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: 8,
      select: false,
    },
    refreshTokens: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (this: userDocument, next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
      username: this.userName,
      email: this.email,
      fullname: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    } as jwt.SignOptions
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    } as jwt.SignOptions
  );
};

userSchema.methods.generateEmailVerificationCode = function () {
  const verificationCode = crypto.randomBytes(64).toString("hex");

  this.emailVerificationCode = crypto
    .createHash("sha256")
    .update(verificationCode)
    .digest("hex");

  this.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  return verificationCode;
};

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
