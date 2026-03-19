import { describe, expect, it } from "vitest";

import {
  formatAverageRating,
  formatReviewCount,
  getReviewAuthorName,
  getReviewBodyPreview,
  getReviewTitle,
  REVIEW_PRESENTATION_TEXT,
} from "@/lib/reviews/presentation";

describe("review presentation", () => {
  it("formats fractional average ratings with one decimal place", () => {
    expect(formatAverageRating(null)).toBe(REVIEW_PRESENTATION_TEXT.noRatingsYet);
    expect(formatAverageRating(4)).toBe("4.0");
    expect(formatAverageRating(4.75)).toBe("4.8");
    expect(formatAverageRating(4.5)).toBe("4.5");
    expect(formatReviewCount(1)).toBe("1 review");
    expect(formatReviewCount(3)).toBe("3 reviews");
  });

  it("uses fractional ratings in untitled review fallbacks", () => {
    expect(getReviewTitle(null, 4.5)).toBe("Rated 4.5 out of 5");
    expect(getReviewTitle(null, 4)).toBe("Rated 4 out of 5");
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
