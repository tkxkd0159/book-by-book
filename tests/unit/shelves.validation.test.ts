import { describe, expect, it } from "vitest";

import { ShelfError } from "@/lib/shelves/errors";
import {
  parseSafeReturnTo,
  parseShelfDescription,
  parseShelfId,
  parseShelfIsPublic,
  parseShelfItemNote,
  parseShelfName,
} from "@/lib/shelves/validation";

describe("shelf validation", () => {
  it("trims and normalizes shelf names and descriptions", () => {
    expect(parseShelfName("  Favorites   Shelf  ")).toBe("Favorites Shelf");
    expect(parseShelfDescription("  Good   books only  ")).toBe("Good books only");
  });

  it("requires a shelf name", () => {
    expect(() => parseShelfName("   ")).toThrow(ShelfError);
  });

  it("parses supported public/private values", () => {
    expect(parseShelfIsPublic("public")).toBe(true);
    expect(parseShelfIsPublic("on")).toBe(true);
    expect(parseShelfIsPublic("")).toBe(false);
    expect(parseShelfIsPublic("private")).toBe(false);
  });

  it("preserves paragraph spacing in shelf notes", () => {
    expect(parseShelfItemNote("  First line\r\nSecond line  ")).toBe(
      "First line\nSecond line",
    );
    expect(parseShelfItemNote("   ")).toBeNull();
  });

  it("rejects invalid shelf visibility values", () => {
    expect(() => parseShelfIsPublic("friends-only")).toThrow(ShelfError);
  });

  it("requires shelf ids and keeps only internal return paths", () => {
    expect(parseShelfId("  shelf-123 ")).toBe("shelf-123");
    expect(() => parseShelfId("")).toThrow(ShelfError);
    expect(parseSafeReturnTo("/me/shelves/123", "/me/shelves")).toBe(
      "/me/shelves/123",
    );
    expect(parseSafeReturnTo("https://example.com", "/me/shelves")).toBe(
      "/me/shelves",
    );
  });
});
