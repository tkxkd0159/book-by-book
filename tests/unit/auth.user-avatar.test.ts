import { describe, expect, it } from "vitest";

import {
  getAvatarInitials,
  getAvatarPresentation,
} from "@/components/auth/user-avatar";

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

describe("getAvatarPresentation", () => {
  it("prefers the image when the URL is available and not marked failed", () => {
    expect(
      getAvatarPresentation({
        imageUrl: " https://example.com/avatar.png ",
        failedImageUrl: null,
        fallbackVariant: "person",
      }),
    ).toBe("image");
  });

  it("uses the configured fallback variant when the image is missing or broken", () => {
    expect(
      getAvatarPresentation({
        imageUrl: null,
        failedImageUrl: null,
        fallbackVariant: "person",
      }),
    ).toBe("person");

    expect(
      getAvatarPresentation({
        imageUrl: "https://example.com/avatar.png",
        failedImageUrl: "https://example.com/avatar.png",
      }),
    ).toBe("initials");
  });
});
