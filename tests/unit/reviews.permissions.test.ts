import { describe, expect, it } from "vitest";

import { canManageReview, isReviewAuthor } from "@/lib/reviews/permissions";

describe("review permissions", () => {
  it("limits review writes to the author", () => {
    expect(isReviewAuthor("user-1", "user-1")).toBe(true);
    expect(isReviewAuthor("user-1", "user-2")).toBe(false);
    expect(canManageReview("user-1", "user-1")).toBe(true);
    expect(canManageReview("user-1", "user-2")).toBe(false);
  });
});
