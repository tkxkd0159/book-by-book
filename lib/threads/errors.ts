export type ThreadErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "UNAUTHORIZED";

export class ThreadError extends Error {
  code: ThreadErrorCode;

  constructor(code: ThreadErrorCode, message: string) {
    super(message);
    this.name = "ThreadError";
    this.code = code;
  }
}

export function isThreadError(error: unknown): error is ThreadError {
  return error instanceof ThreadError;
}
