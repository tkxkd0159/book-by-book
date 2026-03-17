import { describe, expect, it } from "vitest";

import { ThreadError } from "@/lib/threads/errors";
import {
  normalizeDiscussionPagination,
  parseDiscussionPage,
  parseDiscussionPageSize,
  parseOptionalParentPostId,
  parseThreadBody,
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

  it("parses page numbers and page size defaults", () => {
    expect(parseDiscussionPage("3")).toBe(3);
    expect(parseDiscussionPageSize("10")).toBe(10);
    expect(normalizeDiscussionPagination({})).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it("rejects invalid pagination input", () => {
    expect(() => parseDiscussionPage("0")).toThrow(ThreadError);
    expect(() => parseDiscussionPageSize("999")).toThrow(ThreadError);
  });
});
