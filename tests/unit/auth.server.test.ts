import { beforeEach, describe, expect, it, vi } from "vitest";

import { APP_SESSION_IDENTITIES } from "@/lib/auth/identity";

const getAuthSessionSafeMock = vi.fn();
const getE2ECurrentUserMock = vi.fn();
const createE2ESessionMock = vi.fn();
const findUserByIdMock = vi.fn();
const readCachedAuthUserByIdMock = vi.fn();
const syncCachedAuthUserMock = vi.fn();
const headersMock = vi.fn();
const forbiddenMock = vi.fn(() => {
  throw new Error("NEXT_FORBIDDEN");
});
const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});

vi.mock("next/navigation", () => ({
  forbidden: forbiddenMock,
  redirect: redirectMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthSessionSafe: getAuthSessionSafeMock,
}));

vi.mock("@/lib/test-harness/auth", () => ({
  getE2ECurrentUser: getE2ECurrentUserMock,
  createE2ESession: createE2ESessionMock,
}));

vi.mock("@/lib/auth/users", () => ({
  findUserById: findUserByIdMock,
}));

vi.mock("@/lib/auth/user-cache", () => ({
  readCachedAuthUserById: readCachedAuthUserByIdMock,
  syncCachedAuthUser: syncCachedAuthUserMock,
}));

describe("auth server helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    getE2ECurrentUserMock.mockResolvedValue(null);
    readCachedAuthUserByIdMock.mockResolvedValue(undefined);
    syncCachedAuthUserMock.mockResolvedValue(undefined);
    createE2ESessionMock.mockImplementation((user) => ({
      expires: "2999-12-31T23:59:59.999Z",
      user: {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        image: user.imageUrl ?? undefined,
      },
    }));
  });

  it("returns null when a session cannot be resolved to a DB-backed user", async () => {
    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: "missing-user-id",
      },
    });
    findUserByIdMock.mockResolvedValue(null);

    const { getCurrentUser } = await import("@/lib/auth/server");

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(readCachedAuthUserByIdMock).toHaveBeenCalledWith("missing-user-id");
    expect(findUserByIdMock).toHaveBeenCalledWith("missing-user-id");
    expect(syncCachedAuthUserMock).toHaveBeenCalledWith("missing-user-id", null);
  });

  it("redirects when requireCurrentUser cannot resolve a DB-backed user", async () => {
    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: "missing-user-id",
      },
    });
    findUserByIdMock.mockResolvedValue(null);

    const { requireCurrentUser } = await import("@/lib/auth/server");

    await expect(requireCurrentUser()).rejects.toThrow(
      "NEXT_REDIRECT:/signin?callbackUrl=%2Fbooks%2Fsearch",
    );
    expect(redirectMock).toHaveBeenCalledWith(
      "/signin?callbackUrl=%2Fbooks%2Fsearch",
    );
  });

  it("returns the resolved DB-backed user when the session is valid", async () => {
    const currentUser = {
      id: "user-123",
      provider: "google",
      providerUserId: "google-user-123",
      email: "reader@example.com",
      name: "Reader",
      imageUrl: null,
      nickname: "reader",
      gender: "MAN",
      countryCode: "US",
      favoriteGenres: ["FANTASY"],
      signupCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: currentUser.id,
      },
    });
    findUserByIdMock.mockResolvedValue(currentUser);

    const { requireCurrentUser } = await import("@/lib/auth/server");

    await expect(requireCurrentUser()).resolves.toEqual(currentUser);
    expect(readCachedAuthUserByIdMock).toHaveBeenCalledWith(currentUser.id);
    expect(findUserByIdMock).toHaveBeenCalledWith(currentUser.id);
    expect(syncCachedAuthUserMock).toHaveBeenCalledWith(currentUser.id, currentUser);
  });

  it("returns a cached DB-backed user without re-querying the database", async () => {
    const cachedUser = {
      id: "user-123",
      provider: "google",
      providerUserId: "google-user-123",
      email: "reader@example.com",
      name: "Reader One",
      imageUrl: null,
      nickname: "reader-one",
      gender: "MAN",
      countryCode: "US",
      favoriteGenres: ["FANTASY"],
      signupCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: cachedUser.id,
      },
    });
    readCachedAuthUserByIdMock.mockResolvedValue(cachedUser);

    const { getCurrentUser } = await import("@/lib/auth/server");

    await expect(getCurrentUser()).resolves.toEqual(cachedUser);
    expect(findUserByIdMock).not.toHaveBeenCalled();
    expect(syncCachedAuthUserMock).not.toHaveBeenCalled();
  });

  it("returns session claims without requiring a DB lookup", async () => {
    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: "user-123",
        nickname: "reader",
        provider: "google",
        sessionIdentity: APP_SESSION_IDENTITIES.PUBLIC_INCOMPLETE,
      },
    });

    const { getAuthSession } = await import("@/lib/auth/server");

    await expect(getAuthSession()).resolves.toEqual({
      user: {
        id: "user-123",
        nickname: "reader",
        provider: "google",
        sessionIdentity: APP_SESSION_IDENTITIES.PUBLIC_INCOMPLETE,
      },
    });
    expect(findUserByIdMock).not.toHaveBeenCalled();
  });

  it("redirects incomplete public users to signup with the current request callback", async () => {
    headersMock.mockResolvedValue(
      new Headers({
        "x-bbb-request-path": "/clubs/private-club?tab=invite",
      }),
    );
    findUserByIdMock.mockResolvedValue({
      id: "user-123",
      provider: "google",
      providerUserId: "google-user-123",
      email: "reader@example.com",
      name: "Reader",
      imageUrl: null,
      nickname: null,
      gender: null,
      countryCode: null,
      favoriteGenres: [],
      signupCompletedAt: null,
    });
    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: "user-123",
      },
    });

    const { requireCurrentUser } = await import("@/lib/auth/server");

    await expect(requireCurrentUser()).rejects.toThrow(
      "NEXT_REDIRECT:/signup?callbackUrl=%2Fclubs%2Fprivate-club%3Ftab%3Dinvite",
    );
  });

  it("redirects internal admins away from reader app routes", async () => {
    findUserByIdMock.mockResolvedValue({
      id: "admin-123",
      provider: "internal",
      providerUserId: "admin@book-by-book.test",
      email: "admin@book-by-book.test",
      name: "Internal Admin",
      imageUrl: null,
      nickname: null,
      gender: null,
      countryCode: null,
      favoriteGenres: [],
      signupCompletedAt: null,
    });
    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: "admin-123",
      },
    });

    const { requireCurrentUser } = await import("@/lib/auth/server");

    await expect(requireCurrentUser()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/invitation-codes",
    );
  });

  it("redirects signed-out admin requests to the internal sign-in page", async () => {
    headersMock.mockResolvedValue(
      new Headers({
        "x-bbb-request-path": "/admin/invitation-codes",
      }),
    );
    getAuthSessionSafeMock.mockResolvedValue(null);
    findUserByIdMock.mockResolvedValue(null);

    const { requireInternalAdminUser } = await import("@/lib/auth/server");

    await expect(requireInternalAdminUser()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/signin?callbackUrl=%2Fadmin%2Finvitation-codes",
    );
  });

  it("forbids public users from admin-only routes", async () => {
    findUserByIdMock.mockResolvedValue({
      id: "user-123",
      provider: "google",
      providerUserId: "google-user-123",
      email: "reader@example.com",
      name: "Reader",
      imageUrl: null,
      nickname: "reader",
      gender: "MAN",
      countryCode: "US",
      favoriteGenres: ["FANTASY"],
      signupCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: "user-123",
      },
    });

    const { requireInternalAdminUser } = await import("@/lib/auth/server");

    await expect(requireInternalAdminUser()).rejects.toThrow("NEXT_FORBIDDEN");
    expect(forbiddenMock).toHaveBeenCalled();
  });
});
