import { describe, expect, it } from "vitest";

import {
  canCreateThreadPosts,
  canCreateThreads,
  canManageThreadPins,
  canManageThreadPost,
  canViewThreads,
  isThreadPostAuthor,
} from "@/lib/threads/permissions";

describe("thread permissions", () => {
  it("treats club members as discussion participants", () => {
    expect(canViewThreads("OWNER")).toBe(true);
    expect(canCreateThreads("ADMIN")).toBe(true);
    expect(canCreateThreadPosts("MEMBER")).toBe(true);
    expect(canViewThreads(null)).toBe(false);
  });

  it("restricts pinning to club admins", () => {
    expect(canManageThreadPins("OWNER")).toBe(true);
    expect(canManageThreadPins("ADMIN")).toBe(true);
    expect(canManageThreadPins("MEMBER")).toBe(false);
  });

  it("requires authorship for post mutation", () => {
    expect(isThreadPostAuthor("user-1", "user-1")).toBe(true);
    expect(isThreadPostAuthor("user-1", "user-2")).toBe(false);
    expect(
      canManageThreadPost({
        role: "MEMBER",
        authorId: "user-1",
        currentUserId: "user-1",
      }),
    ).toBe(true);
    expect(
      canManageThreadPost({
        role: "MEMBER",
        authorId: "user-1",
        currentUserId: "user-2",
      }),
    ).toBe(false);
  });
});
