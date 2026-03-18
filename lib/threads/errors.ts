import { NextResponse } from "next/server";

export type ThreadErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "UNAUTHORIZED";

export const THREAD_ERROR_MESSAGES = {
  discussionNotFound: "Club book discussion not found.",
  threadNotFound: "Thread not found.",
  replyTargetNotFound: "Reply target not found.",
  replyTargetTopLevelOnly: "Replies can only target top-level posts.",
  deletedReplyTarget: "Deleted posts cannot accept replies.",
  postNotFound: "Post not found.",
  postAuthorOnly: "Only the post author can modify this post.",
  deletedPostEdit: "Deleted posts cannot be edited.",
} as const;

export const THREAD_ROUTE_ERROR_MESSAGES = {
  unauthorized: "Unauthorized.",
  forbidden: "Forbidden.",
  clubNotFound: "Club not found.",
  internal: "Something went wrong. Please try again.",
} as const;

export class ThreadError extends Error {
  code: ThreadErrorCode;

  constructor(code: ThreadErrorCode, message: string) {
    super(message);
    this.name = "ThreadError";
    this.code = code;
  }
}

export function isThreadError(error: unknown): error is ThreadError {
  return error instanceof ThreadError;
}

export function toThreadRouteErrorResponse(error: unknown) {
  if (!(error instanceof ThreadError)) {
    console.error(error);
    return NextResponse.json(
      { error: THREAD_ROUTE_ERROR_MESSAGES.internal },
      { status: 500 },
    );
  }

  if (error.code === "VALIDATION") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error.code === "FORBIDDEN") {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error.code === "NOT_FOUND") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ error: error.message }, { status: 409 });
}

export function toThreadRouteAccessErrorResponse(status: {
  kind: "unauthorized" | "forbidden" | "not_found";
}) {
  if (status.kind === "unauthorized") {
    return NextResponse.json(
      { error: THREAD_ROUTE_ERROR_MESSAGES.unauthorized },
      { status: 401 },
    );
  }

  if (status.kind === "forbidden") {
    return NextResponse.json(
      { error: THREAD_ROUTE_ERROR_MESSAGES.forbidden },
      { status: 403 },
    );
  }

  return NextResponse.json(
    { error: THREAD_ROUTE_ERROR_MESSAGES.clubNotFound },
    { status: 404 },
  );
}
