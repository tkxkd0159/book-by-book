import type { AppSessionIdentity, AuthUser } from "@/types/db";

export const INTERNAL_AUTH_PROVIDER = "internal";
const DEFAULT_READER_DISPLAY_NAME = "Book by Book Member";

type IdentityLike = Pick<AuthUser, "provider" | "signupCompletedAt">;

type DisplayIdentityLike = Pick<AuthUser, "nickname" | "name" | "email">;

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function isInternalAuthProvider(provider: string) {
  return provider === INTERNAL_AUTH_PROVIDER;
}

export function resolveAppSessionIdentity(
  identity: IdentityLike,
): AppSessionIdentity {
  if (isInternalAuthProvider(identity.provider)) {
    return "INTERNAL_ADMIN";
  }

  return identity.signupCompletedAt ? "PUBLIC" : "PUBLIC_INCOMPLETE";
}

export function isInternalAdminUser(
  user: Pick<AuthUser, "provider"> | null | undefined,
): boolean {
  return Boolean(user && isInternalAuthProvider(user.provider));
}

export function isCompletedPublicUser(
  user: Pick<AuthUser, "provider" | "signupCompletedAt"> | null | undefined,
): boolean {
  return Boolean(
    user &&
      !isInternalAuthProvider(user.provider) &&
      user.signupCompletedAt !== null,
  );
}

export function isIncompletePublicUser(
  user: Pick<AuthUser, "provider" | "signupCompletedAt"> | null | undefined,
): boolean {
  return Boolean(
    user &&
      !isInternalAuthProvider(user.provider) &&
      user.signupCompletedAt === null,
  );
}

export function getUserDisplayName(identity: DisplayIdentityLike) {
  return (
    normalizeOptionalText(identity.nickname) ??
    normalizeOptionalText(identity.name) ??
    normalizeOptionalText(identity.email) ??
    DEFAULT_READER_DISPLAY_NAME
  );
}

export function getDefaultReaderDisplayName() {
  return DEFAULT_READER_DISPLAY_NAME;
}
