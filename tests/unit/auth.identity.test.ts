import { describe, expect, it } from "vitest";

import {
  APP_SESSION_IDENTITIES,
  getUserDisplayName,
  isIncompletePublicSessionIdentity,
  isInternalAdminSessionIdentity,
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
    ).toBe(APP_SESSION_IDENTITIES.PUBLIC_INCOMPLETE);
    expect(
      resolveAppSessionIdentity({
        provider: "google",
        signupCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe(APP_SESSION_IDENTITIES.PUBLIC);
    expect(
      resolveAppSessionIdentity({
        provider: "internal",
        signupCompletedAt: null,
      }),
    ).toBe(APP_SESSION_IDENTITIES.INTERNAL_ADMIN);
  });

  it("exposes session-identity guards for session-only routing", () => {
    expect(
      isIncompletePublicSessionIdentity(
        APP_SESSION_IDENTITIES.PUBLIC_INCOMPLETE,
      ),
    ).toBe(true);
    expect(
      isInternalAdminSessionIdentity(APP_SESSION_IDENTITIES.INTERNAL_ADMIN),
    ).toBe(true);
    expect(isInternalAdminSessionIdentity(APP_SESSION_IDENTITIES.PUBLIC)).toBe(
      false,
    );
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
