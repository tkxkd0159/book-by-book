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
