import type { ReviewRating } from "@/types/db";

export const REVIEW_RATING_OPTIONS = [
  0.5,
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  4,
  4.5,
  5,
] as const satisfies ReviewRating[];

export function isReviewRating(value: number): value is ReviewRating {
  return REVIEW_RATING_OPTIONS.includes(value as ReviewRating);
}

export function formatReviewRatingValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatReviewRatingLabel(value: number) {
  const label = formatReviewRatingValue(value);
  return `${label} star${value === 1 ? "" : "s"}`;
}

export function reviewRatingToStoredSteps(rating: ReviewRating) {
  return Math.round(rating * 2);
}

export function storedStepsToReviewRating(value: number | null) {
  if (value === null) {
    return null;
  }

  const rating = value / 2;

  if (!isReviewRating(rating)) {
    throw new Error(`Unsupported stored review rating: ${value}`);
  }

  return rating;
}
