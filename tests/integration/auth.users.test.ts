import { beforeEach, describe, expect, it } from "vitest";

import { INTERNAL_AUTH_PROVIDER } from "@/lib/auth/identity";
import { verifyInternalAdminPassword } from "@/lib/auth/internal";
import {
  findInternalAdminByEmail,
  findPublicUserByNickname,
  findUserByProviderIdentity,
  upsertGoogleOAuthUser,
} from "@/lib/auth/users";
import { E2E_USER_PROVIDER } from "@/lib/test-harness/auth";
import { resetTestDatabase } from "@/lib/test-harness/fixtures";
import { TEST_INTERNAL_ADMIN } from "@/lib/test-harness/constants";

beforeEach(async () => {
  await resetTestDatabase();
});

describe("auth user repository integration", () => {
  it("returns completed public-user profile fields from provider identity", async () => {
    const user = await findUserByProviderIdentity(E2E_USER_PROVIDER, "owner");

    expect(user).toMatchObject({
      provider: E2E_USER_PROVIDER,
      nickname: "owner-reader",
      gender: "MAN",
      countryCode: "US",
      favoriteGenres: ["FANTASY", "SCIENCE"],
    });
    expect(user?.signupCompletedAt).toBeInstanceOf(Date);
  });

  it("resolves public users by nickname", async () => {
    const user = await findPublicUserByNickname(" Member-Reader ");

    expect(user?.id).toBeTruthy();
    expect(user?.nickname).toBe("member-reader");
    expect(user?.signupCompletedAt).toBeInstanceOf(Date);
  });

  it("does not resolve incomplete public users by nickname", async () => {
    const user = await findPublicUserByNickname("incomplete-reader");

    expect(user).toBeNull();
  });

  it("finds internal admins by normalized email with password-hash access", async () => {
    const admin = await findInternalAdminByEmail(" Admin@Book-By-Book.Test ");

    expect(admin).toMatchObject({
      provider: INTERNAL_AUTH_PROVIDER,
      providerUserId: "admin@book-by-book.test",
      email: "admin@book-by-book.test",
      signupCompletedAt: null,
    });
    expect(admin?.passwordHash).toBeTruthy();
    await expect(
      verifyInternalAdminPassword("internal-secret", admin?.passwordHash),
    ).resolves.toBe(true);
  });

  it("rejects Google account creation when the email is reserved by an internal admin", async () => {
    await expect(
      upsertGoogleOAuthUser({
        email: TEST_INTERNAL_ADMIN.email,
        name: "Reserved Email Reader",
        imageUrl: null,
        providerAccountId: "google-admin-email-conflict",
        refreshToken: null,
        accessToken: null,
        expiresAt: null,
        tokenType: null,
        scope: null,
        idToken: null,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "This email is already reserved for another Book by Book account.",
    });
  });
});
