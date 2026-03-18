export type ClubErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "EXPIRED"
  | "UNAUTHORIZED";

export const CLUB_ERROR_MESSAGES = {
  clubNotFound: "Club not found.",
  clubMembershipNotFound: "Club membership not found.",
  clubMemberNotFound: "Club member not found.",
  clubBookNotFound: "Club book not found.",
  memberListRequiresMembership: "Only club members can view the member list.",
} as const;

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
