class apiError extends Error {
  constructor(
    statusCode,
    message = "something went wrong",
    errors = [],
    statck = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.errors = errors;
    this.success = false;
    if (statck) {
      this.stack = statck;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { apiError };
