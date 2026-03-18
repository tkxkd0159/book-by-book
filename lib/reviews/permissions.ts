export function isReviewAuthor(
  authorUserId: string | null | undefined,
  currentUserId: string | null | undefined,
) {
  return Boolean(authorUserId && currentUserId && authorUserId === currentUserId);
}

export function canManageReview(
  authorUserId: string | null | undefined,
  currentUserId: string | null | undefined,
) {
  return isReviewAuthor(authorUserId, currentUserId);
}
