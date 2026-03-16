const DEFAULT_THREAD_EXCERPT_LENGTH = 220;

export function buildThreadExcerpt(
  body: string | null | undefined,
  maxLength = DEFAULT_THREAD_EXCERPT_LENGTH,
) {
  const normalized = body?.replace(/\s+/g, " ").trim() ?? "";
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export { DEFAULT_THREAD_EXCERPT_LENGTH };

export function getThreadPostDisplayBody(input: {
  body: string;
  deletedAt: Date | null;
}) {
  return input.deletedAt ? "This post was deleted." : input.body;
}

export function hasThreadPostBeenEdited(input: {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return !input.deletedAt && input.updatedAt.getTime() !== input.createdAt.getTime();
}

export function createDiscussionPageHref(basePath: string, page: number) {
  if (page <= 1) {
    return basePath;
  }

  return `${basePath}?page=${page}`;
}
