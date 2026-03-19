const REVIEW_PRESENTATION_TEXT = {
  noRatingsYet: "No ratings yet",
  ratingOnly: "Left a rating only.",
  unknownAuthor: "Book by Book Member",
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

export { REVIEW_PRESENTATION_TEXT };
