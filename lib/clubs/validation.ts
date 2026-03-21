import type { ClubBookStatus, ClubMemberRole, ClubVisibility } from "@/types/db";

import { ClubError } from "@/lib/clubs/errors";

const CLUB_NAME_MAX_LENGTH = 80;
const CLUB_DESCRIPTION_MAX_LENGTH = 400;
const INVITATION_NICKNAME_MAX_LENGTH = 20;

function readString(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

export function normalizeOptionalText(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

export function parseClubName(value: FormDataEntryValue | string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw new ClubError("VALIDATION", "Club name is required.");
  }

  if (normalized.length > CLUB_NAME_MAX_LENGTH) {
    throw new ClubError(
      "VALIDATION",
      `Club name must be ${CLUB_NAME_MAX_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

export function parseClubDescription(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length > CLUB_DESCRIPTION_MAX_LENGTH) {
    throw new ClubError(
      "VALIDATION",
      `Club description must be ${CLUB_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

export function parseClubVisibility(
  value: FormDataEntryValue | string | null | undefined,
): ClubVisibility {
  const normalized = readString(value).trim().toUpperCase();
  if (normalized === "PUBLIC" || normalized === "PRIVATE") {
    return normalized;
  }

  throw new ClubError("VALIDATION", "Choose a valid club visibility.");
}

export function parseClubBookStatus(
  value: FormDataEntryValue | string | null | undefined,
): ClubBookStatus {
  const normalized = readString(value).trim().toUpperCase();
  if (
    normalized === "WANT_TO_READ" ||
    normalized === "READING" ||
    normalized === "READ"
  ) {
    return normalized;
  }

  throw new ClubError("VALIDATION", "Choose a valid club section.");
}

export function parseInvitationNickname(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim().toLowerCase();
  if (!normalized) {
    throw new ClubError("VALIDATION", "Nickname is required.");
  }

  if (normalized.length > INVITATION_NICKNAME_MAX_LENGTH) {
    throw new ClubError("VALIDATION", "Nickname is too long.");
  }

  if (!/^[a-z0-9_-]{3,20}$/.test(normalized)) {
    throw new ClubError(
      "VALIDATION",
      "Enter a valid nickname using lowercase letters, numbers, underscores, or hyphens.",
    );
  }

  return normalized;
}

export function parseInternalId(
  value: FormDataEntryValue | string | null | undefined,
  label: string,
) {
  const normalized = readString(value).trim();
  if (!normalized) {
    throw new ClubError("VALIDATION", `${label} is required.`);
  }

  return normalized;
}

export function parseManageableClubMemberRole(
  value: FormDataEntryValue | string | null | undefined,
): Extract<ClubMemberRole, "ADMIN" | "MEMBER"> {
  const normalized = readString(value).trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "MEMBER") {
    return normalized;
  }

  throw new ClubError("VALIDATION", "Choose a valid member role.");
}

export function parseSafeReturnTo(
  value: FormDataEntryValue | string | null | undefined,
  fallback: string,
) {
  const normalized = readString(value).trim();
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
}
