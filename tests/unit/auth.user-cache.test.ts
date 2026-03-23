import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createAuthUser() {
  return {
    id: "user-123",
    provider: "google",
    providerUserId: "google-user-123",
    email: "reader@example.com",
    name: "Reader",
    imageUrl: null,
    nickname: "reader",
    gender: "MAN" as const,
    countryCode: "US",
    favoriteGenres: ["FANTASY", "SCIENCE"] as const,
    signupCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
    isInternalAdmin: false,
    isSignupComplete: true,
    sessionIdentity: "PUBLIC" as const,
  };
}

describe("auth user cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    vi.doUnmock("@/lib/cache/backend");
    delete process.env.CACHE_PROVIDER;
    delete process.env.CACHE_REDIS_URL;
    delete process.env.CACHE_UPSTASH_REST_URL;
    delete process.env.CACHE_UPSTASH_REST_TOKEN;
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.doUnmock("@/lib/cache/backend");
    try {
      const { resetCacheBackendForTests } = await import("@/lib/cache/backend");
      resetCacheBackendForTests();
    } catch {
      // The backend module may be mocked in a fail-open test.
    }
  });

  it("stores and reads serialized auth users with the memory cache backend", async () => {
    process.env.CACHE_PROVIDER = "memory";

    const { resetCacheBackendForTests } = await import("@/lib/cache/backend");
    const { readCachedAuthUserById, syncCachedAuthUser } = await import(
      "@/lib/auth/user-cache"
    );
    resetCacheBackendForTests();
    const authUser = createAuthUser();

    await syncCachedAuthUser(authUser.id, authUser);

    await expect(readCachedAuthUserById(authUser.id)).resolves.toEqual(authUser);
  });

  it("returns a cached null for negative auth-user cache entries", async () => {
    process.env.CACHE_PROVIDER = "memory";

    const { resetCacheBackendForTests } = await import("@/lib/cache/backend");
    const { readCachedAuthUserById, syncCachedAuthUser } = await import(
      "@/lib/auth/user-cache"
    );
    resetCacheBackendForTests();

    await syncCachedAuthUser("missing-user-id", null);

    await expect(readCachedAuthUserById("missing-user-id")).resolves.toBeNull();
  });

  it("treats malformed cached payloads as misses and deletes the bad entry", async () => {
    process.env.CACHE_PROVIDER = "memory";

    const { getCacheBackend, resetCacheBackendForTests } = await import(
      "@/lib/cache/backend"
    );
    const { readCachedAuthUserById } = await import("@/lib/auth/user-cache");
    resetCacheBackendForTests();
    const backend = await getCacheBackend();

    await backend.set("bbb:auth-user:v1:user-123", "not-json", {
      ttlSeconds: 60,
    });

    await expect(readCachedAuthUserById("user-123")).resolves.toBeUndefined();
    await expect(backend.get("bbb:auth-user:v1:user-123")).resolves.toBeNull();
  });

  it("fails open when the cache backend cannot be created", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("@/lib/cache/backend", () => ({
      getCacheBackend: vi.fn().mockRejectedValue(new Error("cache unavailable")),
    }));

    const { readCachedAuthUserById, syncCachedAuthUser } = await import(
      "@/lib/auth/user-cache"
    );

    await expect(readCachedAuthUserById("user-123")).resolves.toBeUndefined();
    await expect(syncCachedAuthUser("user-123", createAuthUser())).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
