import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("admin sign-in rate limiter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T00:00:00.000Z"));
    process.env.RATE_LIMIT_PROVIDER = "memory";
    process.env.RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_LIMIT = "2";
    process.env.RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_WINDOW_SECONDS = "60";
    process.env.RATE_LIMIT_ADMIN_SIGNIN_IP_LIMIT = "3";
    process.env.RATE_LIMIT_ADMIN_SIGNIN_IP_WINDOW_SECONDS = "60";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.RATE_LIMIT_PROVIDER;
    delete process.env.RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_LIMIT;
    delete process.env.RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_WINDOW_SECONDS;
    delete process.env.RATE_LIMIT_ADMIN_SIGNIN_IP_LIMIT;
    delete process.env.RATE_LIMIT_ADMIN_SIGNIN_IP_WINDOW_SECONDS;
  });

  it("parses forwarded IP addresses from common proxy headers", async () => {
    const { readAdminSignInRequestIp } = await import(
      "@/lib/rate-limit/admin-signin"
    );

    expect(
      readAdminSignInRequestIp({
        "x-forwarded-for": "203.0.113.10, 70.41.3.18",
      }),
    ).toBe("203.0.113.10");
    expect(
      readAdminSignInRequestIp({
        "cf-connecting-ip": "198.51.100.42",
      }),
    ).toBe("198.51.100.42");
    expect(readAdminSignInRequestIp(undefined)).toBe("unknown");
  });

  it("throttles repeated failures for the same email and IP", async () => {
    const { resetMemoryMutationRateLimitStore } = await import(
      "@/lib/rate-limit/mutation"
    );
    const { recordFailedAdminSignInAttempt } = await import(
      "@/lib/rate-limit/admin-signin"
    );
    resetMemoryMutationRateLimitStore();

    await expect(
      recordFailedAdminSignInAttempt({
        email: "admin@book-by-book.test",
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    ).resolves.toBeUndefined();
    await expect(
      recordFailedAdminSignInAttempt({
        email: "admin@book-by-book.test",
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    ).resolves.toBeUndefined();
    await expect(
      recordFailedAdminSignInAttempt({
        email: "admin@book-by-book.test",
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    ).rejects.toThrow(
      "Sign-in failed. Check the details you provided are correct. Try again in about 1 minute.",
    );
  });

  it("throttles by IP across multiple email addresses", async () => {
    const { resetMemoryMutationRateLimitStore } = await import(
      "@/lib/rate-limit/mutation"
    );
    const { recordFailedAdminSignInAttempt } = await import(
      "@/lib/rate-limit/admin-signin"
    );
    resetMemoryMutationRateLimitStore();

    await recordFailedAdminSignInAttempt({
      email: "admin-1@book-by-book.test",
      headers: { "x-forwarded-for": "198.51.100.99" },
    });
    await recordFailedAdminSignInAttempt({
      email: "admin-2@book-by-book.test",
      headers: { "x-forwarded-for": "198.51.100.99" },
    });
    await recordFailedAdminSignInAttempt({
      email: "admin-3@book-by-book.test",
      headers: { "x-forwarded-for": "198.51.100.99" },
    });

    await expect(
      recordFailedAdminSignInAttempt({
        email: "admin-4@book-by-book.test",
        headers: { "x-forwarded-for": "198.51.100.99" },
      }),
    ).rejects.toThrow(
      "Sign-in failed. Check the details you provided are correct. Try again in about 1 minute.",
    );
  });
});
