export type AuthFlowErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "VALIDATION";

export class AuthFlowError extends Error {
  readonly code: AuthFlowErrorCode;

  constructor(code: AuthFlowErrorCode, message: string) {
    super(message);
    this.name = "AuthFlowError";
    this.code = code;
  }
}

export function isAuthFlowError(error: unknown): error is AuthFlowError {
  return error instanceof AuthFlowError;
}
