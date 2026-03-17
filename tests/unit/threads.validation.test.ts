import { describe, expect, it } from "vitest";

import { ThreadError } from "@/lib/threads/errors";
import {
  createThreadCommentCursor,
  createThreadListCursor,
  parseDiscussionLimit,
  parseOptionalParentPostId,
  parseThreadBody,
  parseThreadCommentCursor,
  parseThreadListCursor,
  parseThreadPostBody,
  parseThreadTitle,
} from "@/lib/threads/validation";

describe("thread validation", () => {
  it("trims and normalizes thread titles", () => {
    expect(parseThreadTitle("  Deep   Dive Thread  ")).toBe("Deep Dive Thread");
  });

  it("treats empty thread bodies as null but preserves paragraph spacing", () => {
    expect(parseThreadBody("   ")).toBeNull();
    expect(parseThreadBody("  First line\r\nSecond line  ")).toBe(
      "First line\nSecond line",
    );
  });

  it("requires non-empty post bodies", () => {
    expect(() => parseThreadPostBody(" \n ")).toThrow(ThreadError);
  });

  it("treats an empty parent post id as null", () => {
    expect(parseOptionalParentPostId("")).toBeNull();
    expect(parseOptionalParentPostId("  post-123  ")).toBe("post-123");
  });

  it("parses discussion limits with defaults", () => {
    expect(parseDiscussionLimit("10")).toBe(10);
    expect(parseDiscussionLimit(undefined)).toBe(20);
  });

  it("rejects invalid discussion limits", () => {
    expect(() => parseDiscussionLimit("0")).toThrow(ThreadError);
    expect(() => parseDiscussionLimit("999")).toThrow(ThreadError);
  });

  it("round-trips thread list cursors", () => {
    const cursor = createThreadListCursor({
      isPinned: true,
      createdAtMicros: "1735689600000000",
      id: "thread-123",
    });

    expect(parseThreadListCursor(cursor)).toEqual({
      isPinned: true,
      createdAtMicros: "1735689600000000",
      id: "thread-123",
    });
  });

  it("round-trips thread comment cursors", () => {
    const cursor = createThreadCommentCursor({
      createdAtMicros: "1735776000000000",
      id: "post-123",
    });

    expect(parseThreadCommentCursor(cursor)).toEqual({
      createdAtMicros: "1735776000000000",
      id: "post-123",
    });
  });

  it("rejects malformed cursors", () => {
    expect(() => parseThreadListCursor("definitely-not-valid")).toThrow(ThreadError);
    expect(() => parseThreadCommentCursor("still-not-valid")).toThrow(
      ThreadError,
    );
  });
});
