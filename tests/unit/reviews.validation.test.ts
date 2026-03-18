import { describe, expect, it } from "vitest";

import { ReviewError } from "@/lib/reviews/errors";
import {
  parseReviewBody,
  parseReviewContainsSpoilers,
  parseReviewRating,
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

  it("parses supported spoiler flag values", () => {
    expect(parseReviewContainsSpoilers("true")).toBe(true);
    expect(parseReviewContainsSpoilers("on")).toBe(true);
    expect(parseReviewContainsSpoilers("1")).toBe(true);
    expect(parseReviewContainsSpoilers("yes")).toBe(true);
    expect(parseReviewContainsSpoilers("")).toBe(false);
    expect(parseReviewContainsSpoilers("false")).toBe(false);
    expect(parseReviewContainsSpoilers("off")).toBe(false);
    expect(parseReviewContainsSpoilers("0")).toBe(false);
    expect(parseReviewContainsSpoilers("no")).toBe(false);
  });

  it("rejects invalid spoiler flag values", () => {
    expect(() => parseReviewContainsSpoilers("maybe")).toThrow(ReviewError);
  });
});
