export type ReviewErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT";

export const REVIEW_ERROR_MESSAGES = {
  reviewNotFound: "Review not found.",
  reviewOwnerOnly: "Only the review author can modify this review.",
} as const;

export class ReviewError extends Error {
  code: ReviewErrorCode;

  constructor(code: ReviewErrorCode, message: string) {
    super(message);
    this.name = "ReviewError";
    this.code = code;
  }
}

export function isReviewError(error: unknown): error is ReviewError {
  return error instanceof ReviewError;
}
