export class GoogleBooksQueryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleBooksQueryValidationError";
  }
}

export class GoogleBooksRequestError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GoogleBooksRequestError";
  }
}
