export const forgotPasswordTemplate = (
  userName: string,
  passwordResetCode: number
) => {
  return `
        <div style="font-family:Arial;padding:20px">

            <h2>Hello ${userName}</h2>

            <p>You requested a password reset.</p>

            <p>
                Your password reset code is: <strong>${passwordResetCode}</strong>
            </p>

            <p>
                This code expires in 15 minutes.
            </p>

            <p>
                If you didn't request this, ignore this email.
            </p>

        </div>
    `;
};
