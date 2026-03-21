import { describe, expect, it } from "vitest";

import { ClubError } from "@/lib/clubs/errors";
import {
  parseClubBookStatus,
  parseClubName,
  parseInvitationNickname,
  parseClubVisibility,
  parseSafeReturnTo,
} from "@/lib/clubs/validation";

describe("club validation", () => {
  it("trims whitespace and keeps valid club names", () => {
    expect(parseClubName("  Weekend Readers  ")).toBe("Weekend Readers");
  });

  it("rejects empty club names", () => {
    expect(() => parseClubName("   ")).toThrow(ClubError);
  });

  it("accepts supported visibility values", () => {
    expect(parseClubVisibility("public")).toBe("PUBLIC");
    expect(parseClubVisibility("PRIVATE")).toBe("PRIVATE");
  });

  it("rejects unsupported book sections", () => {
    expect(() => parseClubBookStatus("ARCHIVED")).toThrow(ClubError);
  });

  it("normalizes invitation nicknames to lowercase", () => {
    expect(parseInvitationNickname(" Reader_Handle ")).toBe("reader_handle");
  });

  it("only allows internal return paths", () => {
    expect(parseSafeReturnTo("/clubs/123", "/clubs")).toBe("/clubs/123");
    expect(parseSafeReturnTo("https://example.com", "/clubs")).toBe("/clubs");
  });
});
