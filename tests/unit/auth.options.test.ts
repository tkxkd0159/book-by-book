import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserByIdMock = vi.fn();
const findUserByProviderAccountMock = vi.fn();
const upsertGoogleOAuthUserMock = vi.fn();

vi.mock("@/lib/auth/users", () => ({
  findUserById: findUserByIdMock,
  findUserByProviderAccount: findUserByProviderAccountMock,
  upsertGoogleOAuthUser: upsertGoogleOAuthUserMock,
}));

function createAuthUser() {
  return {
    id: "7f6a6d57-a284-4940-aa06-5e4ea0b8d91a",
    provider: "google",
    providerUserId: "google-user-123",
    email: "reader@example.com",
    name: "Reader",
    imageUrl: null,
    nickname: "reader",
    gender: null,
    countryCode: null,
    favoriteGenres: [],
    signupCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
    isInternalAdmin: false,
    isSignupComplete: true,
    sessionIdentity: "PUBLIC" as const,
  };
}

describe("authOptions jwt callback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses provider account lookup for OAuth sign-in before DB id lookup", async () => {
    const dbUser = createAuthUser();
    findUserByProviderAccountMock.mockResolvedValue(dbUser);

    const { authOptions } = await import("@/lib/auth/options");

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: { id: "google-provider-sub" },
      account: {
        provider: "google",
        providerAccountId: "google-provider-sub",
      },
      trigger: "signIn",
    } as never);

    expect(findUserByProviderAccountMock).toHaveBeenCalledWith(
      "google",
      "google-provider-sub",
    );
    expect(findUserByIdMock).not.toHaveBeenCalled();
    expect(token).toMatchObject({
      userId: dbUser.id,
      provider: "google",
      nickname: "reader",
      isSignupComplete: true,
      sessionIdentity: "PUBLIC",
    });
  });

  it("does not cast a non-uuid token user id through findUserById", async () => {
    const { authOptions } = await import("@/lib/auth/options");

    const token = await authOptions.callbacks!.jwt!({
      token: {
        userId: "google-provider-sub",
      },
      trigger: "update",
    } as never);

    expect(findUserByIdMock).not.toHaveBeenCalled();
    expect(token).toEqual({
      userId: "google-provider-sub",
    });
  });

  it("still resolves DB-backed users by uuid when available", async () => {
    const dbUser = createAuthUser();
    findUserByIdMock.mockResolvedValue(dbUser);

    const { authOptions } = await import("@/lib/auth/options");

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: {
        id: dbUser.id,
      },
      trigger: "signIn",
    } as never);

    expect(findUserByIdMock).toHaveBeenCalledWith(dbUser.id);
    expect(token).toMatchObject({
      userId: dbUser.id,
      provider: "google",
      sessionIdentity: "PUBLIC",
    });
  });
});
