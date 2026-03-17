import { z } from "zod";

import { ThreadError } from "@/lib/threads/errors";

const THREAD_TITLE_MAX_LENGTH = 160;
const THREAD_BODY_MAX_LENGTH = 5_000;
const THREAD_POST_BODY_MAX_LENGTH = 5_000;
const DEFAULT_DISCUSSION_LIMIT = 20;
const MAX_DISCUSSION_LIMIT = 50;

type EncodedThreadListCursor = {
  isPinned: boolean;
  createdAtMicros: string;
  id: string;
};

type EncodedThreadCommentCursor = {
  createdAtMicros: string;
  id: string;
};

export type ThreadListCursor = {
  isPinned: boolean;
  createdAtMicros: string;
  id: string;
};

export type ThreadCommentCursor = {
  createdAtMicros: string;
  id: string;
};

function readString(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

function normalizeLineText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeBodyText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function parseWithThreadError<T>(result: z.ZodSafeParseResult<T>) {
  if (result.success) {
    return result.data;
  }

  const message = result.error.issues[0]?.message ?? "Enter a valid value.";
  throw new ThreadError("VALIDATION", message);
}

function encodeOpaqueCursor(value: string) {
  if (typeof window === "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  return window
    .btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function decodeOpaqueCursor(value: string) {
  if (typeof window === "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  return window.atob(normalized);
}

function parseCursorPayload<T>(
  value: FormDataEntryValue | string | null | undefined,
  fallback: null,
  parsePayload: (payload: unknown) => T,
) {
  const normalized = readString(value).trim();
  if (!normalized) {
    return fallback;
  }

  try {
    return parsePayload(JSON.parse(decodeOpaqueCursor(normalized)));
  } catch {
    throw new ThreadError("VALIDATION", "Cursor is invalid.");
  }
}

const threadTitleSchema = z
  .string()
  .transform(normalizeLineText)
  .pipe(
    z
      .string()
      .min(1, "Thread title is required.")
      .max(
        THREAD_TITLE_MAX_LENGTH,
        `Thread title must be ${THREAD_TITLE_MAX_LENGTH} characters or fewer.`,
      ),
  );

const optionalThreadBodySchema = z
  .string()
  .transform(normalizeBodyText)
  .pipe(
    z
      .string()
      .max(
        THREAD_BODY_MAX_LENGTH,
        `Thread body must be ${THREAD_BODY_MAX_LENGTH} characters or fewer.`,
      ),
  )
  .transform((value) => (value.length > 0 ? value : null));

const threadPostBodySchema = z
  .string()
  .transform(normalizeBodyText)
  .pipe(
    z
      .string()
      .min(1, "Post body is required.")
      .max(
        THREAD_POST_BODY_MAX_LENGTH,
        `Post body must be ${THREAD_POST_BODY_MAX_LENGTH} characters or fewer.`,
      ),
  );

const discussionLimitSchema = z.coerce
  .number()
  .int("Limit must be a whole number.")
  .min(1, "Limit must be 1 or greater.")
  .max(
    MAX_DISCUSSION_LIMIT,
    `Limit must be ${MAX_DISCUSSION_LIMIT} or fewer.`,
  );

const encodedThreadListCursorSchema = z.object({
  isPinned: z.boolean(),
  createdAtMicros: z.string().regex(/^\d+$/u),
  id: z.string().min(1),
});

const encodedThreadCommentCursorSchema = z.object({
  createdAtMicros: z.string().regex(/^\d+$/u),
  id: z.string().min(1),
});

function mapEncodedThreadListCursor(cursor: EncodedThreadListCursor): ThreadListCursor {
  return {
    isPinned: cursor.isPinned,
    createdAtMicros: cursor.createdAtMicros,
    id: cursor.id,
  };
}

function mapEncodedThreadCommentCursor(
  cursor: EncodedThreadCommentCursor,
): ThreadCommentCursor {
  return {
    createdAtMicros: cursor.createdAtMicros,
    id: cursor.id,
  };
}

export function parseThreadTitle(
  value: FormDataEntryValue | string | null | undefined,
) {
  return parseWithThreadError(threadTitleSchema.safeParse(readString(value)));
}

export function parseThreadBody(
  value: FormDataEntryValue | string | null | undefined,
) {
  return parseWithThreadError(
    optionalThreadBodySchema.safeParse(readString(value)),
  );
}

export function parseThreadPostBody(
  value: FormDataEntryValue | string | null | undefined,
) {
  return parseWithThreadError(threadPostBodySchema.safeParse(readString(value)));
}

export function parseOptionalParentPostId(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseDiscussionLimit(
  value: FormDataEntryValue | string | number | null | undefined,
) {
  const normalized =
    typeof value === "number"
      ? value
      : readString(value).trim() || DEFAULT_DISCUSSION_LIMIT;

  return parseWithThreadError(discussionLimitSchema.safeParse(normalized));
}

export function createThreadListCursor(input: {
  isPinned: boolean;
  createdAtMicros: number | string;
  id: string;
}) {
  return encodeOpaqueCursor(
    JSON.stringify({
      isPinned: input.isPinned,
      createdAtMicros: String(input.createdAtMicros),
      id: input.id,
    } satisfies EncodedThreadListCursor),
  );
}

export function parseThreadListCursor(
  value: FormDataEntryValue | string | null | undefined,
) {
  return parseCursorPayload(value, null, (payload) =>
    mapEncodedThreadListCursor(
      parseWithThreadError(encodedThreadListCursorSchema.safeParse(payload)),
    ),
  );
}

export function createThreadCommentCursor(input: {
  createdAtMicros: number | string;
  id: string;
}) {
  return encodeOpaqueCursor(
    JSON.stringify({
      createdAtMicros: String(input.createdAtMicros),
      id: input.id,
    } satisfies EncodedThreadCommentCursor),
  );
}

export function parseThreadCommentCursor(
  value: FormDataEntryValue | string | null | undefined,
) {
  return parseCursorPayload(value, null, (payload) =>
    mapEncodedThreadCommentCursor(
      parseWithThreadError(encodedThreadCommentCursorSchema.safeParse(payload)),
    ),
  );
}

export {
  DEFAULT_DISCUSSION_LIMIT,
  MAX_DISCUSSION_LIMIT,
  THREAD_BODY_MAX_LENGTH,
  THREAD_POST_BODY_MAX_LENGTH,
  THREAD_TITLE_MAX_LENGTH,
};
