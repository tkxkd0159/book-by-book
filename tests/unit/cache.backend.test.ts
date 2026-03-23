import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let nextCacheTestKey = 0;

function createCacheTestKey() {
  nextCacheTestKey += 1;
  return `cache:test:key:${nextCacheTestKey}`;
}

describe("shared cache backend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    delete process.env.CACHE_PROVIDER;
    delete process.env.CACHE_REDIS_URL;
    delete process.env.CACHE_UPSTASH_REST_URL;
    delete process.env.CACHE_UPSTASH_REST_TOKEN;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expires memory-backed entries after their TTL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T00:00:00.000Z"));
    process.env.CACHE_PROVIDER = "memory";

    const { getCacheBackend } = await import("@/lib/cache/backend");
    const backend = await getCacheBackend();
    const key = createCacheTestKey();

    await backend.set(key, "value", {
      ttlSeconds: 30,
    });

    await expect(backend.get(key)).resolves.toBe("value");
    vi.advanceTimersByTime(30_001);
    await expect(backend.get(key)).resolves.toBeNull();
  });

  it("returns a disabled no-op backend when cache is disabled", async () => {
    process.env.CACHE_PROVIDER = "disabled";

    const {
      getCacheBackend,
      incrementFixedWindowCounter,
    } = await import(
      "@/lib/cache/backend"
    );
    const backend = await getCacheBackend();
    const key = createCacheTestKey();

    expect(backend.provider).toBe("disabled");
    await expect(backend.get(key)).resolves.toBeNull();
    await expect(
      backend.set(key, "value", {
        ttlSeconds: 30,
      }),
    ).resolves.toBe(false);
    await expect(incrementFixedWindowCounter(key, 30)).resolves.toBe(0);
  });

  it("reuses the same backend instance for identical cache config", async () => {
    process.env.CACHE_PROVIDER = "memory";

    const { getCacheBackend } = await import("@/lib/cache/backend");

    const [firstBackend, secondBackend] = await Promise.all([
      getCacheBackend(),
      getCacheBackend(),
    ]);

    expect(firstBackend).toBe(secondBackend);
  });

  it("repairs a missing TTL when incrementing a fixed-window counter", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T00:00:00.000Z"));
    process.env.CACHE_PROVIDER = "memory";

    const {
      getCacheBackend,
      incrementFixedWindowCounter,
    } = await import("@/lib/cache/backend");
    const backend = await getCacheBackend();
    const key = createCacheTestKey();

    await backend.set(key, "4");

    await expect(incrementFixedWindowCounter(key, 30)).resolves.toBe(5);
    await expect(backend.get(key)).resolves.toBe("5");

    vi.advanceTimersByTime(30_001);
    await expect(backend.get(key)).resolves.toBeNull();
  });
});
