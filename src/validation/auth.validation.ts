import { HydratedDocument } from "mongoose";

export interface IUser {
  userName: string;
  email: string;
  fullName: string;
  avatar: string;
  password: string;
  refreshTokens?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  isEmailVerified: boolean;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;

  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  generatePasswordResetToken(): string;
}

export type userDocument = HydratedDocument<IUser>;
