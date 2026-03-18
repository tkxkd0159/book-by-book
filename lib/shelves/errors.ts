export type ShelfErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT";

export const SHELF_ERROR_MESSAGES = {
  shelfNotFound: "Shelf not found.",
  privateShelf: "This shelf is private.",
  shelfOwnerOnly: "Only the shelf owner can modify this shelf.",
  shelfItemNotFound: "Shelf item not found.",
} as const;

export class ShelfError extends Error {
  code: ShelfErrorCode;

  constructor(code: ShelfErrorCode, message: string) {
    super(message);
    this.name = "ShelfError";
    this.code = code;
  }
}

export function isShelfError(error: unknown): error is ShelfError {
  return error instanceof ShelfError;
}
