import { describe, expect, it } from "vitest";

import {
  createSignInHref,
  createSignupHref,
  getAuthenticatedUserDestination,
  normalizeSafeCallbackUrl,
} from "@/lib/auth/redirects";

describe("auth redirect helpers", () => {
  it("keeps only safe internal callback URLs", () => {
    expect(normalizeSafeCallbackUrl("/clubs/123?tab=invite")).toBe(
      "/clubs/123?tab=invite",
    );
    expect(normalizeSafeCallbackUrl("https://evil.test")).toBe("/books/search");
  });

  it("builds sign-in and signup redirect URLs", () => {
    expect(createSignInHref("/clubs")).toBe("/signin?callbackUrl=%2Fclubs");
    expect(createSignupHref("/clubs/123")).toBe(
      "/signup?callbackUrl=%2Fclubs%2F123",
    );
  });

  it("routes authenticated users by app identity state", () => {
    expect(
      getAuthenticatedUserDestination(
        {
          provider: "google",
          signupCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        "/clubs",
      ),
    ).toBe("/clubs");
    expect(
      getAuthenticatedUserDestination(
        {
          provider: "google",
          signupCompletedAt: null,
        },
        "/clubs",
      ),
    ).toBe("/signup?callbackUrl=%2Fclubs");
    expect(
      getAuthenticatedUserDestination(
        {
          provider: "internal",
          signupCompletedAt: null,
        },
        "/clubs",
      ),
    ).toBe("/admin/invitation-codes");
  });
});
