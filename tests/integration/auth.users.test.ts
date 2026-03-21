import { beforeEach, describe, expect, it } from "vitest";

import { INTERNAL_AUTH_PROVIDER } from "@/lib/auth/identity";
import { verifyInternalAdminPassword } from "@/lib/auth/internal";
import {
  findInternalAdminByEmail,
  findPublicUserByNickname,
  findUserByProviderIdentity,
} from "@/lib/auth/users";
import { E2E_USER_PROVIDER } from "@/lib/test-harness/auth";
import { resetTestDatabase } from "@/lib/test-harness/fixtures";

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
      favoriteGenres: ["Fantasy", "Science"],
      isInternalAdmin: false,
      isSignupComplete: true,
      sessionIdentity: "PUBLIC",
    });
  });

  it("resolves public users by nickname", async () => {
    const user = await findPublicUserByNickname(" Member-Reader ");

    expect(user?.id).toBeTruthy();
    expect(user?.nickname).toBe("member-reader");
    expect(user?.sessionIdentity).toBe("PUBLIC");
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
      isInternalAdmin: true,
      isSignupComplete: false,
      sessionIdentity: "INTERNAL_ADMIN",
    });
    expect(admin?.passwordHash).toBeTruthy();
    await expect(
      verifyInternalAdminPassword("internal-secret", admin?.passwordHash),
    ).resolves.toBe(true);
  });
});
