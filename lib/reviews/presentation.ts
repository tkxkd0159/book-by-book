import { formatReviewRatingValue } from "@/lib/reviews/rating";

const REVIEW_PRESENTATION_TEXT = {
  noRatingsYet: "No ratings yet",
  ratingOnly: "Left a rating only.",
  unknownAuthor: "Book by Book Member",
  untitledPrefix: "Rated",
} as const;

export function formatAverageRating(averageRating: number | null) {
  if (averageRating === null) {
    return REVIEW_PRESENTATION_TEXT.noRatingsYet;
  }

  return averageRating.toFixed(1);
}

export function formatReviewCount(reviewCount: number) {
  return `${reviewCount} review${reviewCount === 1 ? "" : "s"}`;
}

export function getReviewBodyPreview(body: string | null | undefined) {
  const normalized = body?.trim();
  return normalized && normalized.length > 0
    ? normalized
    : REVIEW_PRESENTATION_TEXT.ratingOnly;
}

export function getReviewAuthorName(name: string | null | undefined) {
  const normalized = name?.trim();
  return normalized && normalized.length > 0
    ? normalized
    : REVIEW_PRESENTATION_TEXT.unknownAuthor;
}

export function getReviewTitle(
  title: string | null | undefined,
  rating: number | null | undefined,
) {
  const normalized = title?.trim();
  if (normalized && normalized.length > 0) {
    return normalized;
  }

  if (typeof rating === "number") {
    return `${REVIEW_PRESENTATION_TEXT.untitledPrefix} ${formatReviewRatingValue(rating)} out of 5`;
  }

  return "Untitled review";
}

export function formatReviewDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatReviewAuthorId(authorId: string) {
  return `ID ${authorId.slice(0, 8)}`;
}

export { REVIEW_PRESENTATION_TEXT };
