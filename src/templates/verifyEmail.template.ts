export const verifyEmailTemplate = (
  userName: string,
  verificationCode: number
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <title>Verify Your Email</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f4f4f5;
          font-family: Arial, Helvetica, sans-serif;
        "
      >

        <div
          style="
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          "
        >

          <!-- Header -->
          <div
            style="
              background-color: #18181b;
              padding: 30px;
              text-align: center;
            "
          >
            <h1
              style="
                margin: 0;
                color: #ffffff;
                font-size: 28px;
              "
            >
              Expense Tracker
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">

            <h2
              style="
                margin-top: 0;
                color: #18181b;
              "
            >
              Verify your email address
            </h2>

            <p
              style="
                color: #52525b;
                font-size: 16px;
                line-height: 1.6;
              "
            >
              Hello ${name},
            </p>

            <p
              style="
                color: #52525b;
                font-size: 16px;
                line-height: 1.6;
              "
            >
              Thanks for creating an Expense Tracker account.
              Please use the verification code below to verify
              your email address.
            </p>

            <!-- Verification Code -->
            <div
              style="
                margin: 30px 0;
                text-align: center;
              "
            >

              <div
                style="
                  display: inline-block;
                  padding: 18px 30px;
                  background-color: #f4f4f5;
                  border: 1px solid #e4e4e7;
                  border-radius: 10px;
                "
              >
                <span
                  style="
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #18181b;
                  "
                >
                  ${verificationCode}
                </span>
              </div>

            </div>

            <p
              style="
                color: #71717a;
                font-size: 14px;
                line-height: 1.6;
                text-align: center;
              "
            >
              This verification code will expire in
              <strong>10 minutes</strong>.
            </p>

            <p
              style="
                color: #52525b;
                font-size: 15px;
                line-height: 1.6;
              "
            >
              If you didn't create this account, you can safely
              ignore this email.
            </p>

            <p
              style="
                margin-top: 30px;
                color: #52525b;
                font-size: 15px;
              "
            >
              Best regards,<br />
              <strong>Expense Tracker Team</strong>
            </p>

          </div>

          <!-- Footer -->
          <div
            style="
              padding: 20px 30px;
              background-color: #fafafa;
              text-align: center;
              border-top: 1px solid #e4e4e7;
            "
          >
            <p
              style="
                margin: 0;
                color: #a1a1aa;
                font-size: 12px;
              "
            >
              © ${new Date().getFullYear()} Expense Tracker.
              All rights reserved.
            </p>
          </div>

        </div>

      </body>
    </html>
  `;
};
