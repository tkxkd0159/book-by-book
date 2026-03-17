import { describe, expect, it } from "vitest";

import {
  buildThreadExcerpt,
  createDiscussionRestoreHref,
  getThreadPostDisplayBody,
  hasThreadPostBeenEdited,
} from "@/lib/threads/presentation";

describe("thread presentation", () => {
  it("returns null for empty thread bodies", () => {
    expect(buildThreadExcerpt(null)).toBeNull();
    expect(buildThreadExcerpt("   ")).toBeNull();
  });

  it("normalizes whitespace for previews", () => {
    expect(buildThreadExcerpt(" First line \n\n Second line ")).toBe(
      "First line Second line",
    );
  });

  it("truncates long previews with an ellipsis", () => {
    expect(buildThreadExcerpt("abcdefghijklmnopqrstuvwxyz", 10)).toBe("abcdefghi…");
  });

  it("renders deleted post placeholders", () => {
    expect(
      getThreadPostDisplayBody({
        body: "Original body",
        deletedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toBe("This post was deleted.");
  });

  it("marks posts as edited only when they are updated in place", () => {
    expect(
      hasThreadPostBeenEdited({
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:05:00Z"),
        deletedAt: null,
      }),
    ).toBe(true);
    expect(
      hasThreadPostBeenEdited({
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:05:00Z"),
        deletedAt: new Date("2026-01-01T00:06:00Z"),
      }),
    ).toBe(false);
  });

  it("builds restore hrefs without disturbing existing message params", () => {
    expect(
      createDiscussionRestoreHref("/clubs/a/books/b?message=ok", {
        after: "cursor-1",
        focusThreadId: "thread-1",
        hash: "thread-thread-1",
      }),
    ).toBe(
      "/clubs/a/books/b?message=ok&after=cursor-1&focusThreadId=thread-1#thread-thread-1",
    );
  });

  it("preserves existing restore params unless explicitly replaced or cleared", () => {
    expect(
      createDiscussionRestoreHref(
        "/clubs/a/threads/t?after=old&focusPostId=post-1#thread-post-post-1",
        {
          focusPostId: "post-2",
          hash: "thread-post-post-2",
        },
      ),
    ).toBe(
      "/clubs/a/threads/t?after=old&focusPostId=post-2#thread-post-post-2",
    );

    expect(
      createDiscussionRestoreHref("/clubs/a/books/b?after=old&focusThreadId=thread-1", {
        after: null,
        focusThreadId: null,
      }),
    ).toBe("/clubs/a/books/b");
  });
});
