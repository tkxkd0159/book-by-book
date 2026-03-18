import { describe, expect, it } from "vitest";

import { ShelfError } from "@/lib/shelves/errors";
import {
  parseShelfDescription,
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
});
