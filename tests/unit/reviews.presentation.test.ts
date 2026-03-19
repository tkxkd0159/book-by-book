import { describe, expect, it } from "vitest";

import {
  formatAverageRating,
  formatReviewCount,
  getReviewAuthorName,
  getReviewBodyPreview,
  REVIEW_PRESENTATION_TEXT,
} from "@/lib/reviews/presentation";

describe("review presentation helpers", () => {
  it("formats review aggregates for display", () => {
    expect(formatAverageRating(null)).toBe(REVIEW_PRESENTATION_TEXT.noRatingsYet);
    expect(formatAverageRating(4)).toBe("4.0");
    expect(formatAverageRating(4.25)).toBe("4.3");
    expect(formatReviewCount(1)).toBe("1 review");
    expect(formatReviewCount(3)).toBe("3 reviews");
  });

  it("normalizes fallback text for review previews and authors", () => {
    expect(getReviewBodyPreview("  Strong ending.  ")).toBe("Strong ending.");
    expect(getReviewBodyPreview("  ")).toBe(REVIEW_PRESENTATION_TEXT.ratingOnly);
    expect(getReviewBodyPreview(null)).toBe(REVIEW_PRESENTATION_TEXT.ratingOnly);
    expect(getReviewAuthorName(" Owner Reader ")).toBe("Owner Reader");
    expect(getReviewAuthorName("")).toBe(REVIEW_PRESENTATION_TEXT.unknownAuthor);
    expect(getReviewAuthorName(null)).toBe(
      REVIEW_PRESENTATION_TEXT.unknownAuthor,
    );
  });
});
