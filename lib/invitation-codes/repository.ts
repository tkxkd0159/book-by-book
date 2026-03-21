import sql from "@/lib/db";
import { AuthFlowError } from "@/lib/auth/errors";
import { getUserDisplayName } from "@/lib/auth/identity";
import {
  formatInvitationCodeForDisplay,
  generateInvitationCode,
  hashInvitationCode,
  parseInvitationCodeExpiresAt,
  parseInvitationCodeLabel,
  parseInvitationCodeMaxUses,
  parseInvitationCodePurpose,
  resolveInvitationCodeStatus,
} from "@/lib/invitation-codes/core";
import type {
  InvitationCodePurpose,
  InvitationCodeRecord,
  InvitationCodeStatus,
} from "@/types/db";

type InvitationCodeRow = {
  id: string;
  purpose: InvitationCodePurpose;
  codeHash: string;
  label: string;
  isActive: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  creatorEmail: string | null;
  creatorName: string | null;
  creatorNickname: string | null;
  redemptionCount: number;
};

type InvitationCodeRedemptionRow = {
  id: string;
  codeId: string;
  createdAt: Date;
  userEmail: string | null;
  userName: string | null;
  userNickname: string | null;
  userId: string;
};

export type InvitationCodeRedemptionDetail = {
  createdAt: Date;
  displayName: string;
  email: string | null;
  id: string;
  userId: string;
};

export type InvitationCodeListItem = InvitationCodeRecord & {
  createdBy: {
    displayName: string;
    email: string | null;
    id: string;
  };
  formattedCodePreview: string;
  remainingUses: number | null;
  redemptionCount: number;
  redemptions: InvitationCodeRedemptionDetail[];
  status: InvitationCodeStatus;
};

type CreateInvitationCodeInput = {
  createdById: string;
  expiresAt?: string | null;
  label: string;
  maxUses?: number | string | null;
  purpose: string;
};

type UpdateInvitationCodeActiveStateInput = {
  codeId: string;
  isActive: boolean;
};

type CreateInvitationCodeResult = {
  invitationCode: InvitationCodeListItem;
  rawCode: string;
};

function mapInvitationCodeListItem(
  row: InvitationCodeRow,
  redemptions: InvitationCodeRedemptionDetail[],
): InvitationCodeListItem {
  const status = resolveInvitationCodeStatus({
    isActive: row.isActive,
    expiresAt: row.expiresAt,
    maxUses: row.maxUses,
    redemptionCount: row.redemptionCount,
  });

  return {
    id: row.id,
    purpose: row.purpose,
    codeHash: row.codeHash,
    label: row.label,
    isActive: row.isActive,
    expiresAt: row.expiresAt,
    maxUses: row.maxUses,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: {
      id: row.createdById,
      displayName: getUserDisplayName({
        nickname: row.creatorNickname,
        name: row.creatorName,
        email: row.creatorEmail,
      }),
      email: row.creatorEmail,
    },
    formattedCodePreview: formatInvitationCodeForDisplay(row.codeHash.slice(0, 8)),
    remainingUses:
      row.maxUses === null ? null : Math.max(row.maxUses - row.redemptionCount, 0),
    redemptionCount: row.redemptionCount,
    redemptions,
    status,
  };
}

function mapRedemptionDetail(row: InvitationCodeRedemptionRow): InvitationCodeRedemptionDetail {
  return {
    id: row.id,
    userId: row.userId,
    displayName: getUserDisplayName({
      nickname: row.userNickname,
      name: row.userName,
      email: row.userEmail,
    }),
    email: row.userEmail,
    createdAt: row.createdAt,
  };
}

export async function listInvitationCodes(): Promise<InvitationCodeListItem[]> {
  const invitationCodes = await sql<InvitationCodeRow[]>`
    select
      invitation_codes.id::text as id,
      invitation_codes.purpose,
      invitation_codes.code_hash as "codeHash",
      invitation_codes.label,
      invitation_codes.is_active as "isActive",
      invitation_codes.expires_at as "expiresAt",
      invitation_codes.max_uses as "maxUses",
      invitation_codes.created_by_id::text as "createdById",
      invitation_codes.created_at as "createdAt",
      invitation_codes.updated_at as "updatedAt",
      creators.email::text as "creatorEmail",
      creators.name as "creatorName",
      creators.nickname as "creatorNickname",
      count(invitation_code_redemptions.id)::int as "redemptionCount"
    from bookapp.invitation_codes
    join bookapp.users creators on creators.id = invitation_codes.created_by_id
    left join bookapp.invitation_code_redemptions
      on invitation_code_redemptions.code_id = invitation_codes.id
    group by invitation_codes.id, creators.id
    order by invitation_codes.created_at desc
  `;

  if (invitationCodes.length === 0) {
    return [];
  }

  const codeIds = invitationCodes.map((entry) => entry.id);
  const redemptionRows = await sql<InvitationCodeRedemptionRow[]>`
    select
      invitation_code_redemptions.id::text as id,
      invitation_code_redemptions.code_id::text as "codeId",
      invitation_code_redemptions.created_at as "createdAt",
      users.id::text as "userId",
      users.email::text as "userEmail",
      users.name as "userName",
      users.nickname as "userNickname"
    from bookapp.invitation_code_redemptions
    join bookapp.users on users.id = invitation_code_redemptions.user_id
    where invitation_code_redemptions.code_id = any(${sql.array(codeIds)}::uuid[])
    order by invitation_code_redemptions.created_at desc
  `;

  const redemptionsByCodeId = new Map<string, InvitationCodeRedemptionDetail[]>();
  for (const row of redemptionRows) {
    const current = redemptionsByCodeId.get(row.codeId) ?? [];
    current.push(mapRedemptionDetail(row));
    redemptionsByCodeId.set(row.codeId, current);
  }

  return invitationCodes.map((entry) =>
    mapInvitationCodeListItem(entry, redemptionsByCodeId.get(entry.id) ?? []),
  );
}

export async function createInvitationCode(
  input: CreateInvitationCodeInput,
): Promise<CreateInvitationCodeResult> {
  const purpose = parseInvitationCodePurpose(input.purpose);
  const label = parseInvitationCodeLabel(input.label);
  const expiresAt = parseInvitationCodeExpiresAt(input.expiresAt ?? null);
  const maxUses = parseInvitationCodeMaxUses(
    input.maxUses === null || input.maxUses === undefined
      ? null
      : String(input.maxUses),
  );

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rawCode = generateInvitationCode();

    try {
      const [invitationCode] = await sql<InvitationCodeRow[]>`
        insert into bookapp.invitation_codes (
          purpose,
          code_hash,
          label,
          is_active,
          expires_at,
          max_uses,
          created_by_id
        )
        select
          ${purpose},
          ${hashInvitationCode(rawCode)},
          ${label},
          true,
          ${expiresAt},
          ${maxUses},
          users.id
        from bookapp.users
        where users.id = ${input.createdById}::uuid
        returning
          invitation_codes.id::text as id,
          invitation_codes.purpose,
          invitation_codes.code_hash as "codeHash",
          invitation_codes.label,
          invitation_codes.is_active as "isActive",
          invitation_codes.expires_at as "expiresAt",
          invitation_codes.max_uses as "maxUses",
          invitation_codes.created_by_id::text as "createdById",
          invitation_codes.created_at as "createdAt",
          invitation_codes.updated_at as "updatedAt",
          null::text as "creatorEmail",
          null::text as "creatorName",
          null::text as "creatorNickname",
          0::int as "redemptionCount"
      `;

      if (!invitationCode) {
        throw new AuthFlowError(
          "FORBIDDEN",
          "Only internal admins can create invitation codes.",
        );
      }

      const invitationCodes = await listInvitationCodes();
      const createdInvitationCode = invitationCodes.find(
        (entry) => entry.id === invitationCode.id,
      );

      if (!createdInvitationCode) {
        throw new AuthFlowError(
          "NOT_FOUND",
          "Invitation code was created but could not be reloaded.",
        );
      }

      return {
        invitationCode: createdInvitationCode,
        rawCode,
      };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new AuthFlowError(
    "CONFLICT",
    "Could not generate a unique invitation code. Try again.",
  );
}

export async function updateInvitationCodeActiveState(
  input: UpdateInvitationCodeActiveStateInput,
) {
  const [invitationCode] = await sql<InvitationCodeRow[]>`
    update bookapp.invitation_codes
    set
      is_active = ${input.isActive},
      updated_at = now()
    where id = ${input.codeId}::uuid
    returning
      invitation_codes.id::text as id,
      invitation_codes.purpose,
      invitation_codes.code_hash as "codeHash",
      invitation_codes.label,
      invitation_codes.is_active as "isActive",
      invitation_codes.expires_at as "expiresAt",
      invitation_codes.max_uses as "maxUses",
      invitation_codes.created_by_id::text as "createdById",
      invitation_codes.created_at as "createdAt",
      invitation_codes.updated_at as "updatedAt",
      null::text as "creatorEmail",
      null::text as "creatorName",
      null::text as "creatorNickname",
      0::int as "redemptionCount"
  `;

  if (!invitationCode) {
    throw new AuthFlowError("NOT_FOUND", "Invitation code not found.");
  }

  return invitationCode;
}
