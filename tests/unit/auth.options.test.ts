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

  it("uses the DB user id for internal credential sign-in", async () => {
    const dbUser = {
      ...createAuthUser(),
      provider: "internal",
      providerUserId: "admin@book-by-book.test",
      isInternalAdmin: true,
      isSignupComplete: false,
      sessionIdentity: "INTERNAL_ADMIN" as const,
    };
    findUserByIdMock.mockResolvedValue(dbUser);

    const { authOptions } = await import("@/lib/auth/options");

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: {
        id: dbUser.id,
      },
      account: {
        provider: "internal",
      },
      trigger: "signIn",
    } as never);

    expect(findUserByIdMock).toHaveBeenCalledWith(dbUser.id);
    expect(findUserByProviderAccountMock).not.toHaveBeenCalled();
    expect(token).toMatchObject({
      userId: dbUser.id,
      provider: "internal",
      sessionIdentity: "INTERNAL_ADMIN",
    });
  });

  it("refreshes missing token metadata from the DB on later requests", async () => {
    const dbUser = createAuthUser();
    findUserByIdMock.mockResolvedValue(dbUser);

    const { authOptions } = await import("@/lib/auth/options");

    const token = await authOptions.callbacks!.jwt!({
      token: {
        userId: dbUser.id,
      },
      trigger: "update",
    } as never);

    expect(findUserByIdMock).toHaveBeenCalledWith(dbUser.id);
    expect(token).toMatchObject({
      userId: dbUser.id,
      provider: "google",
      sessionIdentity: "PUBLIC",
    });
  });
});
