import type { ReviewRating } from "@/types/db";

import { ReviewError } from "@/lib/reviews/errors";
import {
  REVIEW_RATING_OPTIONS,
  isReviewRating,
} from "@/lib/reviews/rating";

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
  const numericValue = Number(normalized);

  if (Number.isFinite(numericValue) && isReviewRating(numericValue)) {
    return numericValue;
  }

  throw new ReviewError(
    "VALIDATION",
    `Choose a rating from ${REVIEW_RATING_OPTIONS[0]} to ${REVIEW_RATING_OPTIONS.at(-1)} stars.`,
  );
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
