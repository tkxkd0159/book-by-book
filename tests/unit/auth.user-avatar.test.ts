import { describe, expect, it } from "vitest";

import { getAvatarInitials } from "@/components/auth/user-avatar";

describe("getAvatarInitials", () => {
  it("uses first and last initials for multi-word names", () => {
    expect(getAvatarInitials("Owner Reader", null)).toBe("OR");
  });

  it("falls back to email when name is missing", () => {
    expect(getAvatarInitials(null, "reader@example.com")).toBe("RE");
  });

  it("falls back to a single placeholder when no identity is available", () => {
    expect(getAvatarInitials(null, null)).toBe("U");
  });
});
