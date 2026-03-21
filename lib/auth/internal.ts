import bcrypt from "bcryptjs";

const INTERNAL_ADMIN_EMAIL_MAX_LENGTH = 320;
const INTERNAL_ADMIN_PASSWORD_MAX_LENGTH = 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InternalAuthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalAuthValidationError";
  }
}

function readString(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

export function normalizeInternalAdminEmail(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim().toLowerCase();

  if (!normalized) {
    throw new InternalAuthValidationError("Email is required.");
  }

  if (normalized.length > INTERNAL_ADMIN_EMAIL_MAX_LENGTH) {
    throw new InternalAuthValidationError("Email is too long.");
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    throw new InternalAuthValidationError("Enter a valid email address.");
  }

  return normalized;
}

export function parseInternalAdminPassword(
  value: FormDataEntryValue | string | null | undefined,
) {
  const password = readString(value);

  if (password.trim().length === 0) {
    throw new InternalAuthValidationError("Password is required.");
  }

  if (password.length > INTERNAL_ADMIN_PASSWORD_MAX_LENGTH) {
    throw new InternalAuthValidationError("Password is too long.");
  }

  return password;
}

export async function hashInternalAdminPassword(
  password: string,
  saltRounds = 12,
) {
  return bcrypt.hash(password, saltRounds);
}

export async function verifyInternalAdminPassword(
  password: string,
  passwordHash: string | null | undefined,
) {
  const normalizedHash = passwordHash?.trim();
  if (!normalizedHash) {
    return false;
  }

  return bcrypt.compare(password, normalizedHash);
}
