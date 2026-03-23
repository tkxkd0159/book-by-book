import type { Session } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";

import {
  isIncompletePublicUser,
  isInternalAdminUser,
} from "@/lib/auth/identity";
import {
  createAdminSignInHref,
  createSignInHref,
  createSignupHref,
  DEFAULT_INTERNAL_ADMIN_PATH,
  DEFAULT_PUBLIC_APP_PATH,
  normalizeSafeCallbackUrl,
  readAuthCallbackUrlFromRequest,
} from "@/lib/auth/redirects";
import { getAuthSessionSafe } from "@/lib/auth/session";
import { createE2ESession, getE2ECurrentUser } from "@/lib/test-harness/auth";
import {
  readCachedAuthUserById,
  syncCachedAuthUser,
} from "@/lib/auth/user-cache";
import { findUserById } from "@/lib/auth/users";
import type { AuthUser } from "@/types/db";

const readAuthSession = cache(async (): Promise<Session | null> => {
  const session = await getAuthSessionSafe();
  if (session?.user) {
    return session;
  }

  const e2eUser = await getE2ECurrentUser();
  if (e2eUser) {
    return createE2ESession(e2eUser);
  }

  return null;
});

async function findCurrentUserFromSession(
  session: Session | null,
): Promise<AuthUser | null> {
  if (!session?.user?.id) {
    return null;
  }

  const cachedUser = await readCachedAuthUserById(session.user.id);
  if (cachedUser !== undefined) {
    return cachedUser;
  }

  const user = await findUserById(session.user.id);
  await syncCachedAuthUser(session.user.id, user);
  return user;
}

const readCurrentUser = cache(
  async (): Promise<AuthUser | null> =>
    findCurrentUserFromSession(await readAuthSession()),
);

export const getAuthSession = readAuthSession;
export const getCurrentUser = readCurrentUser;

type RequireCurrentUserOptions = {
  allowIncompletePublicUser?: boolean;
  allowInternalAdmin?: boolean;
  callbackUrl?: string;
  fallbackCallbackUrl?: string;
};

async function resolveCallbackUrl(options?: RequireCurrentUserOptions) {
  if (options?.callbackUrl) {
    return normalizeSafeCallbackUrl(
      options.callbackUrl,
      options?.fallbackCallbackUrl ?? DEFAULT_PUBLIC_APP_PATH,
    );
  }

  return readAuthCallbackUrlFromRequest(
    options?.fallbackCallbackUrl ?? DEFAULT_PUBLIC_APP_PATH,
  );
}

export async function requireCurrentUser(
  options?: RequireCurrentUserOptions,
): Promise<AuthUser> {
  const user = await getCurrentUser();
  const callbackUrl = await resolveCallbackUrl(options);

  if (!user) {
    redirect(createSignInHref(callbackUrl));
  }

  if (!options?.allowInternalAdmin && isInternalAdminUser(user)) {
    redirect(DEFAULT_INTERNAL_ADMIN_PATH);
  }

  if (!options?.allowIncompletePublicUser && isIncompletePublicUser(user)) {
    redirect(createSignupHref(callbackUrl));
  }

  return user;
}

export async function requireInternalAdminUser(options?: {
  callbackUrl?: string;
}) {
  const callbackUrl =
    options?.callbackUrl ??
    (await readAuthCallbackUrlFromRequest(DEFAULT_INTERNAL_ADMIN_PATH));
  const user = await getCurrentUser();

  if (!user) {
    redirect(createAdminSignInHref(callbackUrl));
  }

  if (!isInternalAdminUser(user)) {
    forbidden();
  }

  return user;
}
