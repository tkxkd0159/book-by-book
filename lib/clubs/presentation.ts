import type { ClubBookStatus, ClubMemberRole, ClubVisibility } from "@/types/db";

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
  PUBLIC: "Public",
  PRIVATE: "Private",
};

export const CLUB_VISIBILITY_BADGE_VARIANTS = {
  PUBLIC: "neutral",
  PRIVATE: "neutral",
} as const;

export const CLUB_ROLE_BADGE_VARIANTS: Record<
  ClubMemberRole,
  "accent" | "success" | "info"
> = {
  OWNER: "accent",
  ADMIN: "success",
  MEMBER: "info",
};

export const CLUB_MEMBER_COUNT_BADGE_VARIANT = "amber";

export const CLUB_BOOK_STATUS_BADGE_VARIANTS: Record<
  ClubBookStatus,
  "amber" | "info" | "success"
> = {
  WANT_TO_READ: "amber",
  READING: "info",
  READ: "success",
};
