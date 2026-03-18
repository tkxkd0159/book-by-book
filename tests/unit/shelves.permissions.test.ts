import { describe, expect, it } from "vitest";

import {
  canManageShelf,
  canManageShelfItems,
  canViewShelf,
  isShelfOwner,
} from "@/lib/shelves/permissions";

describe("shelf permissions", () => {
  it("recognizes the shelf owner", () => {
    expect(isShelfOwner("user-1", "user-1")).toBe(true);
    expect(isShelfOwner("user-1", "user-2")).toBe(false);
  });

  it("allows public shelf reads for signed-in non-owners", () => {
    expect(
      canViewShelf({
        ownerUserId: "owner",
        currentUserId: "reader",
        isPublic: true,
      }),
    ).toBe(true);
    expect(
      canViewShelf({
        ownerUserId: "owner",
        currentUserId: "reader",
        isPublic: false,
      }),
    ).toBe(false);
  });

  it("limits shelf writes to the owner", () => {
    expect(canManageShelf("owner", "owner")).toBe(true);
    expect(canManageShelf("owner", "reader")).toBe(false);
    expect(canManageShelfItems("owner", "owner")).toBe(true);
    expect(canManageShelfItems("owner", "reader")).toBe(false);
  });
});
