import { describe, expect, it } from "vitest";

import { ReviewError } from "@/lib/reviews/errors";
import {
  parseReviewBody,
  parseReviewGoogleVolumeId,
  parseReviewRating,
  parseSafeReturnTo,
} from "@/lib/reviews/validation";

describe("review validation", () => {
  it("accepts supported rating values", () => {
    expect(parseReviewRating("1")).toBe(1);
    expect(parseReviewRating(5)).toBe(5);
  });

  it("requires a rating from 1 to 5", () => {
    expect(() => parseReviewRating("0")).toThrow(ReviewError);
    expect(() => parseReviewRating("6")).toThrow(ReviewError);
    expect(() => parseReviewRating("")).toThrow(ReviewError);
  });

  it("treats blank review bodies as null and preserves line breaks", () => {
    expect(parseReviewBody("   ")).toBeNull();
    expect(parseReviewBody("  Thoughtful\r\nreview  ")).toBe("Thoughtful\nreview");
  });

  it("requires a google volume id", () => {
    expect(parseReviewGoogleVolumeId("club-test-book")).toBe("club-test-book");
    expect(() => parseReviewGoogleVolumeId("")).toThrow(ReviewError);
  });

  it("falls back unsafe return paths", () => {
    expect(parseSafeReturnTo("/me/reviewed", "/fallback")).toBe("/me/reviewed");
    expect(parseSafeReturnTo("//evil.test", "/fallback")).toBe("/fallback");
    expect(parseSafeReturnTo("", "/fallback")).toBe("/fallback");
  });
});
