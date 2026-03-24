import { headers } from "next/headers";
import type { Session } from "next-auth";

import {
  isIncompletePublicSessionIdentity,
  isIncompletePublicUser,
  isInternalAdminSessionIdentity,
  isInternalAdminUser,
} from "@/lib/auth/identity";
import type { AuthUser } from "@/types/auth";

type SessionUserLike = Pick<Session["user"], "sessionIdentity">;

export const AUTH_REQUEST_PATH_HEADER = "x-bbb-request-path";
export const DEFAULT_PUBLIC_APP_PATH = "/books/search";
export const DEFAULT_SIGNIN_PATH = "/signin";
export const DEFAULT_SIGNUP_PATH = "/signup";
export const DEFAULT_ADMIN_SIGNIN_PATH = "/admin/signin";
export const DEFAULT_INTERNAL_ADMIN_PATH = "/admin/invitation-codes";

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function normalizeSafeCallbackUrl(
  value: string | null | undefined,
  fallback = DEFAULT_PUBLIC_APP_PATH,
) {
  const normalized = normalizeOptionalText(value);
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
}

function normalizeSafeRefererPath(
  value: string | null | undefined,
  fallback: string,
) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return fallback;
  }

  try {
    const url = new URL(normalized);
    return normalizeSafeCallbackUrl(`${url.pathname}${url.search}`, fallback);
  } catch {
    return fallback;
  }
}

export async function readAuthCallbackUrlFromRequest(
  fallback = DEFAULT_PUBLIC_APP_PATH,
) {
  const headerStore = await headers();

  const requestPath = headerStore.get(AUTH_REQUEST_PATH_HEADER);
  if (requestPath) {
    return normalizeSafeCallbackUrl(requestPath, fallback);
  }

  return normalizeSafeRefererPath(headerStore.get("referer"), fallback);
}

export function createSignInHref(callbackUrl: string) {
  const url = new URL(DEFAULT_SIGNIN_PATH, "http://localhost");
  url.searchParams.set(
    "callbackUrl",
    normalizeSafeCallbackUrl(callbackUrl, DEFAULT_PUBLIC_APP_PATH),
  );
  return `${url.pathname}${url.search}`;
}

export function createAdminSignInHref(callbackUrl = DEFAULT_INTERNAL_ADMIN_PATH) {
  const url = new URL(DEFAULT_ADMIN_SIGNIN_PATH, "http://localhost");
  url.searchParams.set(
    "callbackUrl",
    normalizeSafeCallbackUrl(callbackUrl, DEFAULT_INTERNAL_ADMIN_PATH),
  );
  return `${url.pathname}${url.search}`;
}

export function createSignupHref(callbackUrl: string | null | undefined) {
  const url = new URL(DEFAULT_SIGNUP_PATH, "http://localhost");
  url.searchParams.set(
    "callbackUrl",
    normalizeSafeCallbackUrl(callbackUrl, DEFAULT_PUBLIC_APP_PATH),
  );
  return `${url.pathname}${url.search}`;
}

export function getAuthenticatedUserDestination(
  user: Pick<AuthUser, "provider" | "signupCompletedAt">,
  callbackUrl = DEFAULT_PUBLIC_APP_PATH,
) {
  const safeCallbackUrl = normalizeSafeCallbackUrl(
    callbackUrl,
    DEFAULT_PUBLIC_APP_PATH,
  );

  if (isInternalAdminUser(user)) {
    return DEFAULT_INTERNAL_ADMIN_PATH;
  }

  if (isIncompletePublicUser(user)) {
    return createSignupHref(safeCallbackUrl);
  }

  return safeCallbackUrl;
}

export function getAuthenticatedSessionDestination(
  user: SessionUserLike,
  callbackUrl = DEFAULT_PUBLIC_APP_PATH,
) {
  const safeCallbackUrl = normalizeSafeCallbackUrl(
    callbackUrl,
    DEFAULT_PUBLIC_APP_PATH,
  );

  if (isInternalAdminSessionIdentity(user.sessionIdentity)) {
    return DEFAULT_INTERNAL_ADMIN_PATH;
  }

  if (isIncompletePublicSessionIdentity(user.sessionIdentity)) {
    return createSignupHref(safeCallbackUrl);
  }

  return safeCallbackUrl;
}
