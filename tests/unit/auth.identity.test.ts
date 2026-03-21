import { describe, expect, it } from "vitest";

import {
  getUserDisplayName,
  isCompletedPublicUser,
  isIncompletePublicUser,
  isInternalAdminUser,
  resolveAppSessionIdentity,
} from "@/lib/auth/identity";

describe("auth identity helpers", () => {
  it("prefers nickname for reader-facing display identity", () => {
    expect(
      getUserDisplayName({
        nickname: "shelf-reader",
        name: "Reader Name",
        email: "reader@example.com",
      }),
    ).toBe("shelf-reader");
  });

  it("falls back to name and then email when nickname is missing", () => {
    expect(
      getUserDisplayName({
        nickname: null,
        name: "Reader Name",
        email: "reader@example.com",
      }),
    ).toBe("Reader Name");

    expect(
      getUserDisplayName({
        nickname: null,
        name: "   ",
        email: "reader@example.com",
      }),
    ).toBe("reader@example.com");
  });

  it("distinguishes incomplete, complete, and internal identities", () => {
    expect(
      resolveAppSessionIdentity({
        provider: "google",
        signupCompletedAt: null,
      }),
    ).toBe("PUBLIC_INCOMPLETE");
    expect(
      resolveAppSessionIdentity({
        provider: "google",
        signupCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe("PUBLIC");
    expect(
      resolveAppSessionIdentity({
        provider: "internal",
        signupCompletedAt: null,
      }),
    ).toBe("INTERNAL_ADMIN");
  });

  it("exposes user-type guards for route and mutation logic", () => {
    expect(
      isIncompletePublicUser({
        provider: "google",
        signupCompletedAt: null,
      }),
    ).toBe(true);
    expect(
      isCompletedPublicUser({
        provider: "google",
        signupCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      isInternalAdminUser({
        provider: "internal",
      }),
    ).toBe(true);
  });
});
