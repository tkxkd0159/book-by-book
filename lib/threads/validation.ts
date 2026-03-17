import { z } from "zod";

import { ThreadError } from "@/lib/threads/errors";

const THREAD_TITLE_MAX_LENGTH = 160;
const THREAD_BODY_MAX_LENGTH = 5_000;
const THREAD_POST_BODY_MAX_LENGTH = 5_000;
const DEFAULT_DISCUSSION_PAGE = 1;
const DEFAULT_DISCUSSION_PAGE_SIZE = 20;
const MAX_DISCUSSION_PAGE_SIZE = 50;

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

const pageNumberSchema = z.coerce
  .number()
  .int("Page must be a whole number.")
  .min(1, "Page must be 1 or greater.");

const pageSizeSchema = z.coerce
  .number()
  .int("Page size must be a whole number.")
  .min(1, "Page size must be 1 or greater.")
  .max(
    MAX_DISCUSSION_PAGE_SIZE,
    `Page size must be ${MAX_DISCUSSION_PAGE_SIZE} or fewer.`,
  );

export type DiscussionPagination = {
  page: number;
  pageSize: number;
};

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

export function parseDiscussionPage(
  value: FormDataEntryValue | string | number | null | undefined,
) {
  const normalized =
    typeof value === "number" ? value : readString(value).trim() || DEFAULT_DISCUSSION_PAGE;

  return parseWithThreadError(pageNumberSchema.safeParse(normalized));
}

export function parseDiscussionPageSize(
  value: FormDataEntryValue | string | number | null | undefined,
) {
  const normalized =
    typeof value === "number"
      ? value
      : readString(value).trim() || DEFAULT_DISCUSSION_PAGE_SIZE;

  return parseWithThreadError(pageSizeSchema.safeParse(normalized));
}

export function normalizeDiscussionPagination(input: {
  page?: number | null;
  pageSize?: number | null;
}): DiscussionPagination {
  return {
    page: parseDiscussionPage(input.page),
    pageSize: parseDiscussionPageSize(input.pageSize),
  };
}

export {
  DEFAULT_DISCUSSION_PAGE,
  DEFAULT_DISCUSSION_PAGE_SIZE,
  MAX_DISCUSSION_PAGE_SIZE,
  THREAD_BODY_MAX_LENGTH,
  THREAD_POST_BODY_MAX_LENGTH,
  THREAD_TITLE_MAX_LENGTH,
};
