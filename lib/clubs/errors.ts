export type ClubErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "EXPIRED"
  | "UNAUTHORIZED";

export class ClubError extends Error {
  code: ClubErrorCode;

  constructor(code: ClubErrorCode, message: string) {
    super(message);
    this.name = "ClubError";
    this.code = code;
  }
}

export function isClubError(error: unknown): error is ClubError {
  return error instanceof ClubError;
}
