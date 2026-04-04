import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import sql from "@/lib/db";
import { completeSignup } from "@/lib/auth/onboarding";
import { findUserById, findUserByProviderIdentity } from "@/lib/auth/users";
import { hashInvitationCode } from "@/lib/invitation-codes/core";
import { E2E_USER_PROVIDER } from "@/lib/test-harness/auth";
import { resetTestDatabase } from "@/lib/test-harness/fixtures";

beforeEach(async () => {
  await resetTestDatabase();
});

async function getOwnerUserId() {
  const owner = await findUserByProviderIdentity(E2E_USER_PROVIDER, "owner");
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

describe("signup completion integration", () => {
  it("completes signup and records a beta invitation-code redemption", async () => {
    const userId = await createIncompletePublicUser();
    const codeId = await createBetaInvitationCode("beta-code-1234");

    const completedUser = await completeSignup({
      userId,
      nickname: "onboarded-reader",
      gender: "WOMAN",
      countryCode: "KR",
      favoriteGenres: ["FANTASY", "TRAVEL"],
      invitationCode: "beta-code-1234",
    });

    expect(completedUser).toMatchObject({
      id: userId,
      nickname: "onboarded-reader",
      gender: "WOMAN",
      countryCode: "KR",
      favoriteGenres: ["FANTASY", "TRAVEL"],
    });
    expect(completedUser.signupCompletedAt).toBeInstanceOf(Date);

    const storedUser = await findUserById(userId);
    expect(storedUser?.signupCompletedAt).toBeInstanceOf(Date);

    const [redemptionCount] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from bookapp.invitation_code_redemptions
      where code_id = ${codeId}::uuid
        and user_id = ${userId}::uuid
    `;
    expect(redemptionCount?.count).toBe(1);
  });

  it("rejects invalid invitation codes", async () => {
    const userId = await createIncompletePublicUser();

    await expect(
      completeSignup({
        userId,
        nickname: "missing-code",
        gender: "MAN",
        countryCode: "US",
        favoriteGenres: ["SCIENCE"],
        invitationCode: "does-not-exist",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Enter a valid beta invitation code.",
    });
  });

  it("rejects exhausted invitation codes", async () => {
    const codeId = await createBetaInvitationCode("beta-code-9999");
    const firstUserId = await createIncompletePublicUser();
    const secondUserId = await createIncompletePublicUser();

    await sql`
      update bookapp.invitation_codes
      set max_uses = 1
      where id = ${codeId}::uuid
    `;

    await completeSignup({
      userId: firstUserId,
      nickname: "first-reader",
      gender: "MAN",
      countryCode: "US",
      favoriteGenres: ["FANTASY"],
      invitationCode: "beta-code-9999",
    });

    await expect(
      completeSignup({
        userId: secondUserId,
        nickname: "second-reader",
        gender: "NON_BINARY",
        countryCode: "CA",
        favoriteGenres: ["HISTORY"],
        invitationCode: "beta-code-9999",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This invitation code has no uses remaining.",
    });
  });

  it("allows only one user to claim a nickname", async () => {
    const codeId = await createBetaInvitationCode("beta-code-shared-nickname");
    const firstUserId = await createIncompletePublicUser();
    const secondUserId = await createIncompletePublicUser();

    const results = await Promise.allSettled([
      completeSignup({
        userId: firstUserId,
        nickname: "shared-reader",
        gender: "WOMAN",
        countryCode: "US",
        favoriteGenres: ["FANTASY"],
        invitationCode: "beta-code-shared-nickname",
      }),
      completeSignup({
        userId: secondUserId,
        nickname: "shared-reader",
        gender: "NON_BINARY",
        countryCode: "CA",
        favoriteGenres: ["SCIENCE"],
        invitationCode: "beta-code-shared-nickname",
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const rejectedResult = results.find((result) => result.status === "rejected");
    if (!rejectedResult || rejectedResult.status !== "rejected") {
      throw new Error("Expected one rejected signup result.");
    }

    expect(rejectedResult.reason).toMatchObject({
      code: "CONFLICT",
      message: "This nickname is already taken.",
    });

    const [nicknameClaimCount] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from bookapp.users
      where id = any(${sql.array([firstUserId, secondUserId])}::uuid[])
        and nickname = 'shared-reader'
        and signup_completed_at is not null
    `;
    expect(nicknameClaimCount?.count).toBe(1);

    const [redemptionCount] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from bookapp.invitation_code_redemptions
      where code_id = ${codeId}::uuid
    `;
    expect(redemptionCount?.count).toBe(1);
  });

  it("allows only one successful concurrent signup submission for the same user", async () => {
    const userId = await createIncompletePublicUser();
    const codeId = await createBetaInvitationCode("beta-code-double-submit");

    const results = await Promise.allSettled([
      completeSignup({
        userId,
        nickname: "double-submit-reader",
        gender: "WOMAN",
        countryCode: "US",
        favoriteGenres: ["FANTASY"],
        invitationCode: "beta-code-double-submit",
      }),
      completeSignup({
        userId,
        nickname: "double-submit-reader",
        gender: "WOMAN",
        countryCode: "US",
        favoriteGenres: ["FANTASY"],
        invitationCode: "beta-code-double-submit",
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const [redemptionCount] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from bookapp.invitation_code_redemptions
      where code_id = ${codeId}::uuid
        and user_id = ${userId}::uuid
    `;
    expect(redemptionCount?.count).toBe(1);

    const storedUser = await findUserById(userId);
    expect(storedUser?.signupCompletedAt).toBeInstanceOf(Date);
    expect(storedUser?.nickname).toBe("double-submit-reader");
  });

  it("allows only one successful concurrent redemption when a code has one remaining use", async () => {
    const codeId = await createBetaInvitationCode("beta-code-last-use");
    const firstUserId = await createIncompletePublicUser();
    const secondUserId = await createIncompletePublicUser();

    await sql`
      update bookapp.invitation_codes
      set max_uses = 1
      where id = ${codeId}::uuid
    `;

    const results = await Promise.allSettled([
      completeSignup({
        userId: firstUserId,
        nickname: "last-use-reader-one",
        gender: "MAN",
        countryCode: "US",
        favoriteGenres: ["FANTASY"],
        invitationCode: "beta-code-last-use",
      }),
      completeSignup({
        userId: secondUserId,
        nickname: "last-use-reader-two",
        gender: "WOMAN",
        countryCode: "KR",
        favoriteGenres: ["TRAVEL"],
        invitationCode: "beta-code-last-use",
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const [redemptionCount] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from bookapp.invitation_code_redemptions
      where code_id = ${codeId}::uuid
    `;
    expect(redemptionCount?.count).toBe(1);

    const [completedCount] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from bookapp.users
      where id = any(${sql.array([firstUserId, secondUserId])}::uuid[])
        and signup_completed_at is not null
    `;
    expect(completedCount?.count).toBe(1);
  });
});
