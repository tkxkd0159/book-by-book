import type { ReviewRating } from "@/types/db";

import { ReviewError } from "@/lib/reviews/errors";

const REVIEW_BODY_MAX_LENGTH = 5_000;
const REVIEW_TITLE_MAX_LENGTH = 120;

function readString(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

function normalizeLineBreaks(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

export function parseReviewRating(
  value: FormDataEntryValue | string | number | null | undefined,
): ReviewRating {
  const normalized =
    typeof value === "number" ? String(value) : readString(value).trim();

  if (normalized === "1") {
    return 1;
  }
  if (normalized === "2") {
    return 2;
  }
  if (normalized === "3") {
    return 3;
  }
  if (normalized === "4") {
    return 4;
  }
  if (normalized === "5") {
    return 5;
  }

  throw new ReviewError("VALIDATION", "Choose a rating from 1 to 5.");
}

export function parseReviewBody(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeLineBreaks(readString(value)).trim();
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > REVIEW_BODY_MAX_LENGTH) {
    throw new ReviewError(
      "VALIDATION",
      `Review body must be ${REVIEW_BODY_MAX_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

export function parseReviewTitle(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeLineBreaks(readString(value)).trim();
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > REVIEW_TITLE_MAX_LENGTH) {
    throw new ReviewError(
      "VALIDATION",
      `Review title must be ${REVIEW_TITLE_MAX_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

export function parseReviewGoogleVolumeId(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim();

  if (!normalized) {
    throw new ReviewError("VALIDATION", "Google volume is required.");
  }

  return normalized;
}

export function parseSafeReturnTo(
  value: FormDataEntryValue | string | null | undefined,
  fallback: string,
) {
  const normalized = readString(value).trim();
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
}
