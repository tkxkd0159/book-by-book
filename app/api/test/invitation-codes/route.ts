import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import sql from "@/lib/db";
import { findInternalAdminByEmail, findUserByProviderIdentity } from "@/lib/auth/users";
import {
  generateInvitationCode,
  hashInvitationCode,
} from "@/lib/invitation-codes/core";
import {
  E2E_USER_PROVIDER,
  isE2EBypassEnabled,
} from "@/lib/test-harness/auth";
import {
  TEST_INTERNAL_ADMIN,
  TEST_ROUTE_ERROR_MESSAGES,
  TEST_USER_KEYS,
} from "@/lib/test-harness/constants";
import { seedTestUsers } from "@/lib/test-harness/fixtures";

export const runtime = "nodejs";

const invitationCodeSeedSchema = z.object({
  kind: z.literal("create"),
  label: z.string().trim().min(1).max(120),
  purpose: z.literal("BETA_SIGNUP").default("BETA_SIGNUP"),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  redeemByUsers: z.array(z.enum(TEST_USER_KEYS)).default([]),
});

export async function POST(request: NextRequest) {
  if (!isE2EBypassEnabled()) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.notAvailable },
      { status: 404 },
    );
  }

  const parsedBody = invitationCodeSeedSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.invalidSeedPayload },
      { status: 400 },
    );
  }

  await seedTestUsers();
  const createdBy = await findInternalAdminByEmail(TEST_INTERNAL_ADMIN.email);
  if (!createdBy) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.invalidSeedPayload },
      { status: 500 },
    );
  }

  const rawCode = generateInvitationCode();
  const expiresAt = parsedBody.data.expiresAt
    ? new Date(parsedBody.data.expiresAt)
    : null;

  const [createdCode] = await sql.begin(async (tx) => {
    const query = tx as unknown as typeof sql;
    const [invitationCode] = await query<{ id: string }[]>`
      insert into bookapp.invitation_codes (
        purpose,
        code_hash,
        label,
        is_active,
        expires_at,
        max_uses,
        created_by_id
      )
      values (
        ${parsedBody.data.purpose},
        ${hashInvitationCode(rawCode)},
        ${parsedBody.data.label},
        ${parsedBody.data.isActive},
        ${expiresAt},
        ${parsedBody.data.maxUses ?? null},
        ${createdBy.id}::uuid
      )
      returning id::text as id
    `;

    for (const userKey of parsedBody.data.redeemByUsers) {
      const user = await findUserByProviderIdentity(E2E_USER_PROVIDER, userKey);
      if (!user) {
        throw new Error(`Unknown test user: ${userKey}`);
      }

      await query`
        insert into bookapp.invitation_code_redemptions (
          code_id,
          user_id
        )
        values (
          ${invitationCode.id}::uuid,
          ${user.id}::uuid
        )
      `;
    }

    return [invitationCode];
  });

  return NextResponse.json({
    ok: true,
    codeId: createdCode.id,
    rawCode,
  });
}
