export function threadListQueryKey(input: {
  clubId: string;
  clubBookId: string;
  cacheKey?: string | null;
}) {
  return [
    "club-book-threads",
    input.clubId,
    input.clubBookId,
    input.cacheKey ?? "base",
  ] as const;
}

export function threadCommentsQueryKey(input: {
  clubId: string;
  threadId: string;
  cacheKey?: string | null;
}) {
  return [
    "thread-comments",
    input.clubId,
    input.threadId,
    input.cacheKey ?? "base",
  ] as const;
}

export function createThreadFeedCacheKey(input: {
  message?: string | null;
  error?: string | null;
  after?: string | null;
  focusId?: string | null;
}) {
  if (!input.message && !input.error && !input.after && !input.focusId) {
    return null;
  }

  return [
    input.message ?? "",
    input.error ?? "",
    input.after ?? "",
    input.focusId ?? "",
  ].join("|");
}
