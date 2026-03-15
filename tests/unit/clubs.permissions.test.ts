import { describe, expect, it } from "vitest";

import {
  canJoinClub,
  canViewClub,
  isClubAdmin,
  isClubMember,
  isClubOwner,
} from "@/lib/clubs/permissions";

describe("club permissions", () => {
  it("identifies owner and admin roles", () => {
    expect(isClubOwner("OWNER")).toBe(true);
    expect(isClubAdmin("OWNER")).toBe(true);
    expect(isClubAdmin("ADMIN")).toBe(true);
    expect(isClubAdmin("MEMBER")).toBe(false);
  });

  it("treats all club roles as members", () => {
    expect(isClubMember("OWNER")).toBe(true);
    expect(isClubMember("ADMIN")).toBe(true);
    expect(isClubMember("MEMBER")).toBe(true);
    expect(isClubMember(null)).toBe(false);
  });

  it("follows visibility and membership for viewing and joining", () => {
    expect(canViewClub("PUBLIC", null)).toBe(true);
    expect(canViewClub("PRIVATE", null)).toBe(false);
    expect(canViewClub("PRIVATE", "MEMBER")).toBe(true);
    expect(canJoinClub("PUBLIC", null)).toBe(true);
    expect(canJoinClub("PUBLIC", "MEMBER")).toBe(false);
    expect(canJoinClub("PRIVATE", null)).toBe(false);
  });
});
