import { describe, expect, it } from "vitest";

import { ReviewError } from "@/lib/reviews/errors";
import {
  parseReviewBody,
  parseReviewGoogleVolumeId,
  parseReviewRating,
  parseReviewTitle,
  parseSafeReturnTo,
} from "@/lib/reviews/validation";

describe("review validation", () => {
  it("accepts supported rating values", () => {
    expect(parseReviewRating("0.5")).toBe(0.5);
    expect(parseReviewRating("1")).toBe(1);
    expect(parseReviewRating("4.5")).toBe(4.5);
    expect(parseReviewRating(5)).toBe(5);
  });

  it("requires a rating from 0.5 to 5 in half-star steps", () => {
    expect(() => parseReviewRating("0")).toThrow(ReviewError);
    expect(() => parseReviewRating("0.4")).toThrow(ReviewError);
    expect(() => parseReviewRating("1.2")).toThrow(ReviewError);
    expect(() => parseReviewRating("6")).toThrow(ReviewError);
    expect(() => parseReviewRating("5.5")).toThrow(ReviewError);
    expect(() => parseReviewRating("")).toThrow(ReviewError);
  });

  it("treats blank review bodies as null and preserves line breaks", () => {
    expect(parseReviewBody("   ")).toBeNull();
    expect(parseReviewBody("  Thoughtful\r\nreview  ")).toBe("Thoughtful\nreview");
  });

  it("treats blank review titles as null and trims valid titles", () => {
    expect(parseReviewTitle("   ")).toBeNull();
    expect(parseReviewTitle("  Quick take  ")).toBe("Quick take");
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
