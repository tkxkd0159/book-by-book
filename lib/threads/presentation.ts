const DEFAULT_THREAD_EXCERPT_LENGTH = 220;
const THREAD_POST_DELETED_BODY = "This post was deleted.";
const URL_PARSE_BASE = "http://localhost";

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
  return input.deletedAt ? THREAD_POST_DELETED_BODY : input.body;
}

export function hasThreadPostBeenEdited(input: {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return !input.deletedAt && input.updatedAt.getTime() !== input.createdAt.getTime();
}

export function createDiscussionRestoreHref(
  basePath: string,
  options: {
    after?: string | null;
    focusThreadId?: string | null;
    focusPostId?: string | null;
    hash?: string | null;
  } = {},
) {
  const url = new URL(basePath, URL_PARSE_BASE);

  if (options.after !== undefined) {
    if (options.after) {
      url.searchParams.set("after", options.after);
    } else {
      url.searchParams.delete("after");
    }
  }

  if (options.focusThreadId !== undefined) {
    if (options.focusThreadId) {
      url.searchParams.set("focusThreadId", options.focusThreadId);
    } else {
      url.searchParams.delete("focusThreadId");
    }
  }

  if (options.focusPostId !== undefined) {
    if (options.focusPostId) {
      url.searchParams.set("focusPostId", options.focusPostId);
    } else {
      url.searchParams.delete("focusPostId");
    }
  }

  if (options.hash !== undefined) {
    url.hash = options.hash ? `#${options.hash}` : "";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export { THREAD_POST_DELETED_BODY, URL_PARSE_BASE };
