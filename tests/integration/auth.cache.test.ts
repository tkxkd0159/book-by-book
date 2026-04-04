import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import sql from "@/lib/db";
import { hashInvitationCode } from "@/lib/invitation-codes/core";
import { E2E_USER_PROVIDER } from "@/lib/test-harness/auth";
import { resetTestDatabase } from "@/lib/test-harness/fixtures";

beforeEach(async () => {
  vi.resetModules();
  process.env.CACHE_PROVIDER = "memory";
  await resetTestDatabase();
});

afterEach(() => {
  delete process.env.CACHE_PROVIDER;
});

async function getOwnerUserId() {
  const [owner] = await sql<{ id: string }[]>`
    select id::text as id
    from bookapp.users
    where provider = ${E2E_USER_PROVIDER}
      and provider_user_id = 'owner'
    limit 1
  `;

  if (!owner) {
    throw new Error("Expected seeded owner fixture.");
  }

  return owner.id;
}

async function createBetaInvitationCode(rawCode: string) {
  const createdById = await getOwnerUserId();
  const [row] = await sql<{ id: string }[]>`
    insert into bookapp.invitation_codes (
      purpose,
      code_hash,
      label,
      is_active,
      created_by_id
    )
    values (
      'BETA_SIGNUP',
      ${hashInvitationCode(rawCode)},
      ${`Beta ${randomUUID()}`},
      true,
      ${createdById}::uuid
    )
    returning id::text as id
  `;

  return row.id;
}

async function createIncompletePublicUser() {
  const [user] = await sql<{ id: string }[]>`
    insert into bookapp.users (
      provider,
      provider_user_id,
      email,
      name
    )
    values (
      'google',
      ${`google-${randomUUID()}`},
      ${`signup-${randomUUID()}@book-by-book.test`},
      'Incomplete Reader'
    )
    returning id::text as id
  `;

  return user.id;
}

describe("auth cache integration", () => {
  it("populates the auth-user cache after Google OAuth upsert", async () => {
    const { readCachedAuthUserById } = await import("@/lib/auth/user-cache");
    const { upsertGoogleOAuthUser } = await import("@/lib/auth/users");
    const user = await upsertGoogleOAuthUser({
      email: `reader-${randomUUID()}@book-by-book.test`,
      name: "Cached Reader",
      imageUrl: null,
      providerAccountId: `google-${randomUUID()}`,
      refreshToken: null,
      accessToken: null,
      expiresAt: null,
      tokenType: null,
      scope: null,
      idToken: null,
    });

    await expect(readCachedAuthUserById(user.id)).resolves.toEqual(user);
  });

  it("refreshes the auth-user cache immediately after signup completion", async () => {
    const { completeSignup } = await import("@/lib/auth/onboarding");
    const { readCachedAuthUserById, syncCachedAuthUser } = await import(
      "@/lib/auth/user-cache"
    );
    const { findUserById } = await import("@/lib/auth/users");
    const userId = await createIncompletePublicUser();
    await createBetaInvitationCode("beta-cache-code");
    const incompleteUser = await findUserById(userId);
    if (!incompleteUser) {
      throw new Error("Expected incomplete user to exist.");
    }

    await syncCachedAuthUser(userId, incompleteUser);

    const completedUser = await completeSignup({
      userId,
      nickname: "cached-reader",
      gender: "WOMAN",
      countryCode: "KR",
      favoriteGenres: ["FANTASY", "TRAVEL"],
      invitationCode: "beta-cache-code",
    });

    await expect(readCachedAuthUserById(userId)).resolves.toEqual(completedUser);
  });
});
