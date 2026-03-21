import { describe, expect, it } from "vitest";

import {
  coerceFavoriteGenres,
  getCountryName,
  parseCountryCode,
  parseFavoriteGenres,
  parseNickname,
  parseUserGender,
} from "@/lib/auth/signup";

describe("signup validation helpers", () => {
  it("normalizes and validates nicknames", () => {
    expect(parseNickname(" Shelf-Reader ")).toBe("shelf-reader");
    expect(() => parseNickname("No Spaces Allowed")).toThrow(
      "Nickname must be 3-20 characters using lowercase letters, numbers, underscores, or hyphens.",
    );
  });

  it("validates gender and country inputs", () => {
    expect(parseUserGender("woman")).toBe("WOMAN");
    expect(parseUserGender("non_binary")).toBe("NON_BINARY");
    expect(parseCountryCode("kr")).toBe("KR");
    expect(getCountryName("KR")).toBe("South Korea");
    expect(() => parseCountryCode("zz")).toThrow("Choose a valid country.");
  });

  it("deduplicates and validates favorite genres", () => {
    expect(
      parseFavoriteGenres(["FANTASY", "FANTASY", "SCIENCE"]),
    ).toStrictEqual(["FANTASY", "SCIENCE"]);
    expect(coerceFavoriteGenres(["FANTASY", "Unknown"])).toStrictEqual([
      "FANTASY",
    ]);
    expect(() => parseFavoriteGenres([])).toThrow(
      "Choose at least one favorite genre.",
    );
  });
});
