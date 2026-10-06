import getTransporter from "../config/nodemailer.js";
import { ApiError } from "./ApiError.js";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: EmailOptions) => {
  try {
    if (!to) {
      throw new ApiError(400, "Receiver email is required");
    }
    if (!subject) {
      throw new ApiError(400, "Subject is required");
    }
    if (!html) {
      throw new ApiError(400, "HTML is required");
    }
    if (!text) {
      throw new ApiError(400, "Text is required");
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new ApiError(500, "Email is not configured");
    }
    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("Error sending email:", error);

    throw new ApiError(500, "Failed to send email. Please try again later.");
  }
};
