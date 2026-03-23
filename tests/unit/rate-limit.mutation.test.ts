import { beforeEach, describe, expect, it, vi } from "vitest";

describe("mutation rate limiter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    delete process.env.CACHE_PROVIDER;
    delete process.env.CACHE_REDIS_URL;
    delete process.env.CACHE_UPSTASH_REST_URL;
    delete process.env.CACHE_UPSTASH_REST_TOKEN;
    delete process.env.RATE_LIMIT_CREATE_CLUB_LIMIT;
    delete process.env.RATE_LIMIT_CREATE_CLUB_WINDOW_SECONDS;
    delete process.env.RATE_LIMIT_ADD_BOOK_LIMIT;
    delete process.env.RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS;
    delete process.env.RATE_LIMIT_START_THREAD_LIMIT;
    delete process.env.RATE_LIMIT_START_THREAD_WINDOW_SECONDS;
  });

  it("uses the shared default policies", async () => {
    const { getMutationRateLimitPolicy } = await import(
      "@/lib/rate-limit/mutation"
    );

    expect(getMutationRateLimitPolicy("create-club")).toEqual({
      limit: 3,
      windowSeconds: 600,
    });
    expect(getMutationRateLimitPolicy("add-book")).toEqual({
      limit: 20,
      windowSeconds: 60,
    });
    expect(getMutationRateLimitPolicy("start-thread")).toEqual({
      limit: 10,
      windowSeconds: 600,
    });
  });

  it("allows overriding policies with environment variables", async () => {
    process.env.RATE_LIMIT_CREATE_CLUB_LIMIT = "2";
    process.env.RATE_LIMIT_CREATE_CLUB_WINDOW_SECONDS = "30";

    const { getMutationRateLimitPolicy } = await import(
      "@/lib/rate-limit/mutation"
    );

    expect(getMutationRateLimitPolicy("create-club")).toEqual({
      limit: 2,
      windowSeconds: 30,
    });
  });

  it("validates configured provider requirements", async () => {
    process.env.CACHE_PROVIDER = "upstash";

    await expect(
      import("@/lib/rate-limit/mutation").then((module) =>
        module.getMutationRateLimitStore(),
      ),
    ).rejects.toThrow(
      "CACHE_UPSTASH_REST_URL is required for the configured cache provider.",
    );

    vi.resetModules();
    process.env.CACHE_PROVIDER = "redis";

    await expect(
      import("@/lib/rate-limit/mutation").then((module) =>
        module.getMutationRateLimitStore(),
      ),
    ).rejects.toThrow(
      "CACHE_REDIS_URL is required for the configured cache provider.",
    );
  });

  it("tracks fixed-window decisions with the memory provider", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T00:00:00.000Z"));
    process.env.CACHE_PROVIDER = "memory";
    process.env.RATE_LIMIT_ADD_BOOK_LIMIT = "2";
    process.env.RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS = "60";

    const {
      checkMutationRateLimit,
      resetMemoryMutationRateLimitStore,
    } = await import("@/lib/rate-limit/mutation");
    resetMemoryMutationRateLimitStore();

    const first = await checkMutationRateLimit({
      action: "add-book",
      userId: "user-1",
    });
    const second = await checkMutationRateLimit({
      action: "add-book",
      userId: "user-1",
    });
    const third = await checkMutationRateLimit({
      action: "add-book",
      userId: "user-1",
    });

    expect(first).toMatchObject({
      allowed: true,
      limit: 2,
      remaining: 1,
      retryAfterSeconds: 60,
      resetAt: "2026-03-17T00:01:00.000Z",
    });
    expect(second).toMatchObject({
      allowed: true,
      limit: 2,
      remaining: 0,
      retryAfterSeconds: 60,
      resetAt: "2026-03-17T00:01:00.000Z",
    });
    expect(third).toMatchObject({
      allowed: false,
      limit: 2,
      remaining: 0,
      retryAfterSeconds: 60,
      resetAt: "2026-03-17T00:01:00.000Z",
    });
  });
});
