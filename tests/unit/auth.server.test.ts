import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionSafeMock = vi.fn();
const getE2ECurrentUserMock = vi.fn();
const createE2ESessionMock = vi.fn();
const findUserByIdMock = vi.fn();
const findUserByEmailMock = vi.fn();
const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
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
  findUserByEmail: findUserByEmailMock,
}));

describe("auth server helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getE2ECurrentUserMock.mockResolvedValue(null);
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
        email: "ghost@example.com",
      },
    });
    findUserByIdMock.mockResolvedValue(null);
    findUserByEmailMock.mockResolvedValue(null);

    const { getCurrentUser } = await import("@/lib/auth/server");

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(findUserByIdMock).toHaveBeenCalledWith("missing-user-id");
    expect(findUserByEmailMock).toHaveBeenCalledWith("ghost@example.com");
  });

  it("redirects when requireCurrentUser cannot resolve a DB-backed user", async () => {
    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: "missing-user-id",
        email: "ghost@example.com",
      },
    });
    findUserByIdMock.mockResolvedValue(null);
    findUserByEmailMock.mockResolvedValue(null);

    const { requireCurrentUser } = await import("@/lib/auth/server");

    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT:/signin");
    expect(redirectMock).toHaveBeenCalledWith("/signin");
  });

  it("returns the resolved DB-backed user when the session is valid", async () => {
    const currentUser = {
      id: "user-123",
      provider: "google",
      providerUserId: "google-user-123",
      email: "reader@example.com",
      name: "Reader",
      imageUrl: null,
    };

    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: currentUser.id,
        email: currentUser.email,
      },
    });
    findUserByIdMock.mockResolvedValue(currentUser);

    const { requireCurrentUser } = await import("@/lib/auth/server");

    await expect(requireCurrentUser()).resolves.toEqual(currentUser);
    expect(findUserByIdMock).toHaveBeenCalledWith(currentUser.id);
    expect(findUserByEmailMock).not.toHaveBeenCalled();
  });

  it("does not reuse a stale DB-backed user across repeated lookups", async () => {
    const firstUser = {
      id: "user-123",
      provider: "google",
      providerUserId: "google-user-123",
      email: "reader@example.com",
      name: "Reader One",
      imageUrl: null,
    };
    const secondUser = {
      ...firstUser,
      id: "user-456",
      name: "Reader Two",
    };

    getAuthSessionSafeMock.mockResolvedValue({
      user: {
        id: firstUser.id,
        email: firstUser.email,
      },
    });
    findUserByIdMock
      .mockResolvedValueOnce(firstUser)
      .mockResolvedValueOnce(secondUser);

    const { getCurrentUser } = await import("@/lib/auth/server");

    await expect(getCurrentUser()).resolves.toEqual(firstUser);
    await expect(getCurrentUser()).resolves.toEqual(secondUser);
    expect(findUserByIdMock).toHaveBeenCalledTimes(2);
  });
});
