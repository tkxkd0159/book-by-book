import { describe, expect, it } from "vitest";

import {
  canChangeClubMemberRole,
  canDeleteClub,
  canJoinClub,
  canLeaveClub,
  canRemoveClubMember,
  canTransferClubOwnership,
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

  it("enforces leave, delete, transfer, and member-management boundaries", () => {
    expect(canLeaveClub("OWNER")).toBe(false);
    expect(canLeaveClub("ADMIN")).toBe(true);
    expect(canLeaveClub("MEMBER")).toBe(true);

    expect(canDeleteClub("OWNER")).toBe(true);
    expect(canDeleteClub("ADMIN")).toBe(false);

    expect(canTransferClubOwnership("OWNER")).toBe(true);
    expect(canTransferClubOwnership("ADMIN")).toBe(false);

    expect(canChangeClubMemberRole("OWNER", "ADMIN", "MEMBER")).toBe(true);
    expect(canChangeClubMemberRole("OWNER", "MEMBER", "ADMIN")).toBe(true);
    expect(canChangeClubMemberRole("OWNER", "OWNER", "ADMIN")).toBe(false);
    expect(canChangeClubMemberRole("ADMIN", "MEMBER", "ADMIN")).toBe(true);
    expect(canChangeClubMemberRole("ADMIN", "ADMIN", "MEMBER")).toBe(false);
    expect(canChangeClubMemberRole("ADMIN", "MEMBER", "MEMBER")).toBe(false);

    expect(canRemoveClubMember("OWNER", "ADMIN")).toBe(true);
    expect(canRemoveClubMember("OWNER", "MEMBER")).toBe(true);
    expect(canRemoveClubMember("OWNER", "OWNER")).toBe(false);
    expect(canRemoveClubMember("ADMIN", "MEMBER")).toBe(true);
    expect(canRemoveClubMember("ADMIN", "ADMIN")).toBe(false);
    expect(canRemoveClubMember("MEMBER", "MEMBER")).toBe(false);
  });
});
