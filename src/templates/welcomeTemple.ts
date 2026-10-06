export const welcomeTemplate = (userName: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Welcome</title>
      </head>

      <body>
        <h1>Welcome ${userName}! 🎉</h1>

        <p>
          Your Expense Tracker account has been created successfully.
        </p>

        <p>
          You can now manage:
        </p>

        <ul>
          <li>Income</li>
          <li>Expenses</li>
          <li>Budgets</li>
          <li>Monthly reports</li>
        </ul>

        <p>
          Thanks for joining us!
        </p>
      </body>
    </html>
  `;
};
