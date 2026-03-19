import { describe, expect, it } from "vitest";

import {
  createMyReviewedHref,
  createMyReviewHref,
} from "@/lib/reviews/view-paths";

describe("review view paths", () => {
  it("builds the reviewed-books index path", () => {
    expect(createMyReviewedHref()).toBe("/me/reviewed");
  });

  it("builds the per-book review path", () => {
    expect(createMyReviewHref("club-test-book")).toBe(
      "/books/club-test-book#review-editor",
    );
    expect(createMyReviewHref("abc/123")).toBe(
      "/books/abc%2F123#review-editor",
    );
  });
});
