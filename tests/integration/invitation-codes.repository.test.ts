import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import sql from "@/lib/db";
import { INTERNAL_AUTH_PROVIDER } from "@/lib/auth/identity";
import { hashInternalAdminPassword } from "@/lib/auth/internal";
import {
  createInvitationCode,
  listInvitationCodes,
  updateInvitationCodeActiveState,
} from "@/lib/invitation-codes/repository";
import { resetTestDatabase } from "@/lib/test-harness/fixtures";

beforeEach(async () => {
  await resetTestDatabase();
});

async function createInternalAdmin() {
  const email = `admin-${randomUUID()}@book-by-book.test`;
  const [admin] = await sql<{ id: string }[]>`
    insert into bookapp.users (
      provider,
      provider_user_id,
      email,
      name,
      password_hash
    )
    values (
      ${INTERNAL_AUTH_PROVIDER},
      ${email},
      ${email},
      'Internal Admin',
      ${await hashInternalAdminPassword("internal-secret", 4)}
    )
    returning id::text as id
  `;

  return admin.id;
}

describe("invitation code repository integration", () => {
  it("creates, lists, and deactivates invitation codes", async () => {
    const adminId = await createInternalAdmin();

    const created = await createInvitationCode({
      createdById: adminId,
      purpose: "BETA_SIGNUP",
      label: "Cohort A",
      maxUses: "5",
      expiresAt: "2026-12-31T23:59",
    });

    expect(created.rawCode).toMatch(/^[A-Z2-9]+$/);
    expect(created.invitationCode.label).toBe("Cohort A");
    expect(created.invitationCode.status).toBe("ACTIVE");
    expect(created.invitationCode.redemptionCount).toBe(0);

    let invitationCodes = await listInvitationCodes();
    expect(invitationCodes).toHaveLength(1);
    expect(invitationCodes[0]).toMatchObject({
      id: created.invitationCode.id,
      label: "Cohort A",
      purpose: "BETA_SIGNUP",
      status: "ACTIVE",
      redemptionCount: 0,
    });

    await updateInvitationCodeActiveState({
      codeId: created.invitationCode.id,
      isActive: false,
    });

    invitationCodes = await listInvitationCodes();
    expect(invitationCodes[0]?.status).toBe("INACTIVE");
  });
});
