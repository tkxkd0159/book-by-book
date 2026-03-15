import type { ClubBookStatus, ClubVisibility } from "@/types/db";

export const CLUB_BOOK_STATUS_ORDER: ClubBookStatus[] = [
  "WANT_TO_READ",
  "READING",
  "READ",
];

export const CLUB_BOOK_STATUS_LABELS: Record<ClubBookStatus, string> = {
  WANT_TO_READ: "Want to Read",
  READING: "Reading",
  READ: "Read",
};

export const CLUB_VISIBILITY_LABELS: Record<ClubVisibility, string> = {
  PUBLIC: "Public club",
  PRIVATE: "Private club",
};
