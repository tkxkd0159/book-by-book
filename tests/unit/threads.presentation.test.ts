import { describe, expect, it } from "vitest";

import { buildThreadExcerpt } from "@/lib/threads/presentation";

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
});
