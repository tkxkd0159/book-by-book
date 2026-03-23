import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("shared cache backend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    delete process.env.CACHE_PROVIDER;
    delete process.env.CACHE_REDIS_URL;
    delete process.env.CACHE_UPSTASH_REST_URL;
    delete process.env.CACHE_UPSTASH_REST_TOKEN;
    delete process.env.RATE_LIMIT_PROVIDER;
    delete process.env.RATE_LIMIT_REDIS_URL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(async () => {
    const { resetCacheBackendForTests } = await import("@/lib/cache/backend");
    resetCacheBackendForTests();
    vi.useRealTimers();
  });

  it("expires memory-backed entries after their TTL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T00:00:00.000Z"));
    process.env.CACHE_PROVIDER = "memory";

    const { getCacheBackend, resetCacheBackendForTests } = await import(
      "@/lib/cache/backend"
    );
    resetCacheBackendForTests();
    const backend = await getCacheBackend();

    await backend.set("cache:test:key", "value", {
      ttlSeconds: 30,
    });

    await expect(backend.get("cache:test:key")).resolves.toBe("value");
    vi.advanceTimersByTime(30_001);
    await expect(backend.get("cache:test:key")).resolves.toBeNull();
  });

  it("returns a disabled no-op backend when cache is disabled", async () => {
    process.env.CACHE_PROVIDER = "disabled";

    const { getCacheBackend, resetCacheBackendForTests } = await import(
      "@/lib/cache/backend"
    );
    resetCacheBackendForTests();
    const backend = await getCacheBackend();

    expect(backend.provider).toBe("disabled");
    await expect(backend.get("cache:test:key")).resolves.toBeNull();
    await expect(
      backend.set("cache:test:key", "value", {
        ttlSeconds: 30,
      }),
    ).resolves.toBe(false);
    await expect(backend.incr("cache:test:key")).resolves.toBe(0);
    await expect(backend.ttl("cache:test:key")).resolves.toBeNull();
  });

  it("reuses the same backend instance for identical cache config", async () => {
    process.env.CACHE_PROVIDER = "memory";

    const { getCacheBackend, resetCacheBackendForTests } = await import(
      "@/lib/cache/backend"
    );
    resetCacheBackendForTests();

    const [firstBackend, secondBackend] = await Promise.all([
      getCacheBackend(),
      getCacheBackend(),
    ]);

    expect(firstBackend).toBe(secondBackend);
  });
});
