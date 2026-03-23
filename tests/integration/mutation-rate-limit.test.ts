import { beforeEach, describe, expect, it, vi } from "vitest";

describe("mutation rate limit integration", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useRealTimers();
    process.env.CACHE_PROVIDER = "memory";
    process.env.RATE_LIMIT_CREATE_CLUB_LIMIT = "2";
    process.env.RATE_LIMIT_CREATE_CLUB_WINDOW_SECONDS = "60";

    const { resetMemoryMutationRateLimitStore } = await import(
      "@/lib/rate-limit/mutation"
    );
    resetMemoryMutationRateLimitStore();
  });

  it("denies repeated requests for the same user after the configured limit", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T00:00:00.000Z"));

    const { checkMutationRateLimit } = await import("@/lib/rate-limit/mutation");

    expect(
      await checkMutationRateLimit({
        action: "create-club",
        userId: "user-1",
      }),
    ).toMatchObject({
      allowed: true,
      remaining: 1,
    });

    expect(
      await checkMutationRateLimit({
        action: "create-club",
        userId: "user-1",
      }),
    ).toMatchObject({
      allowed: true,
      remaining: 0,
    });

    expect(
      await checkMutationRateLimit({
        action: "create-club",
        userId: "user-1",
      }),
    ).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("isolates counters by user", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T00:00:00.000Z"));

    const { checkMutationRateLimit } = await import("@/lib/rate-limit/mutation");

    await checkMutationRateLimit({
      action: "create-club",
      userId: "user-1",
    });
    await checkMutationRateLimit({
      action: "create-club",
      userId: "user-1",
    });

    expect(
      await checkMutationRateLimit({
        action: "create-club",
        userId: "user-2",
      }),
    ).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });
});
