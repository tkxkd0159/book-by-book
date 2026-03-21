import { createHash, randomBytes } from "node:crypto";

import type { InvitationCodePurpose, InvitationCodeStatus } from "@/types/db";

export const INVITATION_CODE_PURPOSES = [
  "BETA_SIGNUP",
] as const satisfies readonly InvitationCodePurpose[];

export const INVITATION_CODE_STATUS_ORDER = [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
  "EXHAUSTED",
] as const satisfies readonly InvitationCodeStatus[];

export const DEFAULT_INVITATION_CODE_GROUP_SIZE = 5;
export const DEFAULT_INVITATION_CODE_GROUP_COUNT = 4;
export const DEFAULT_INVITATION_CODE_LENGTH =
  DEFAULT_INVITATION_CODE_GROUP_SIZE * DEFAULT_INVITATION_CODE_GROUP_COUNT;

const INVITATION_CODE_PURPOSE_SET = new Set<InvitationCodePurpose>(
  INVITATION_CODE_PURPOSES,
);
const INVITATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITATION_CODE_LABEL_MAX_LENGTH = 120;

export class InvitationCodeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationCodeValidationError";
  }
}

function readString(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

export function normalizeInvitationCode(
  value: FormDataEntryValue | string | null | undefined,
) {
  return readString(value)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

export function hashInvitationCode(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeInvitationCode(value);

  if (!normalized) {
    throw new InvitationCodeValidationError("Invitation code is required.");
  }

  return createHash("sha256").update(normalized).digest("hex");
}

export function generateInvitationCode(
  length = DEFAULT_INVITATION_CODE_LENGTH,
): string {
  let code = "";
  const alphabetLength = INVITATION_CODE_ALPHABET.length;
  // Use rejection sampling to avoid modulo bias when mapping random bytes to alphabet indices.
  const maxValidByte = Math.floor(256 / alphabetLength) * alphabetLength - 1;

  while (code.length < length) {
    const bytes = randomBytes(length - code.length);

    for (
      let index = 0;
      index < bytes.length && code.length < length;
      index += 1
    ) {
      const byte = bytes[index];
      if (byte > maxValidByte) {
        continue;
      }
      const alphabetIndex = byte % alphabetLength;
      code += INVITATION_CODE_ALPHABET[alphabetIndex];
    }
  }

  return code;
}

export function formatInvitationCodeForDisplay(
  rawCode: string,
  groupSize = DEFAULT_INVITATION_CODE_GROUP_SIZE,
) {
  const normalized = normalizeInvitationCode(rawCode);

  if (!normalized) {
    return "";
  }

  return (
    normalized.match(new RegExp(`.{1,${groupSize}}`, "g"))?.join("-") ??
    normalized
  );
}

export function parseInvitationCodePurpose(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim().toUpperCase();

  if (!INVITATION_CODE_PURPOSE_SET.has(normalized as InvitationCodePurpose)) {
    throw new InvitationCodeValidationError(
      "Choose a valid invitation-code purpose.",
    );
  }

  return normalized as InvitationCodePurpose;
}

export function parseInvitationCodeLabel(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new InvitationCodeValidationError("Label is required.");
  }

  if (normalized.length > INVITATION_CODE_LABEL_MAX_LENGTH) {
    throw new InvitationCodeValidationError("Label is too long.");
  }

  return normalized;
}

export function parseInvitationCodeMaxUses(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvitationCodeValidationError(
      "Max uses must be a positive whole number.",
    );
  }

  return parsed;
}

export function parseInvitationCodeExpiresAt(
  value: FormDataEntryValue | string | null | undefined,
  now = new Date(),
) {
  const normalized = readString(value).trim();

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvitationCodeValidationError("Enter a valid expiration date.");
  }

  if (parsed.getTime() <= now.getTime()) {
    throw new InvitationCodeValidationError(
      "Expiration must be in the future.",
    );
  }

  return parsed;
}

export function resolveInvitationCodeStatus(input: {
  isActive: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  redemptionCount: number;
  now?: Date;
}): InvitationCodeStatus {
  if (!input.isActive) {
    return "INACTIVE";
  }

  const now = input.now ?? new Date();
  if (input.expiresAt && input.expiresAt.getTime() <= now.getTime()) {
    return "EXPIRED";
  }

  if (input.maxUses !== null && input.redemptionCount >= input.maxUses) {
    return "EXHAUSTED";
  }

  return "ACTIVE";
}

export function isInvitationCodeRedeemable(status: InvitationCodeStatus) {
  return status === "ACTIVE";
}
