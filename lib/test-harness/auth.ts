import type { Session } from "next-auth";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { resolveAppSessionIdentity } from "@/lib/auth/identity";
import { findUserByProviderIdentity } from "@/lib/auth/users";
import { E2E_AUTH_COOKIE_NAME } from "@/lib/test-harness/constants";
import type { AuthUser } from "@/types/auth";

export const E2E_USER_PROVIDER = "e2e";

export function isE2EBypassEnabled() {
  return env.runtime.e2eBypassAuth;
}

export async function getE2ECurrentUser(): Promise<AuthUser | null> {
  if (!isE2EBypassEnabled()) {
    return null;
  }

  const cookieStore = await cookies();
  const userKey = cookieStore.get(E2E_AUTH_COOKIE_NAME)?.value ?? null;
  if (!userKey) {
    return null;
  }

  return findUserByProviderIdentity(E2E_USER_PROVIDER, userKey);
}

export function createE2ESession(user: AuthUser): Session {
  return {
    expires: "2999-12-31T23:59:59.999Z",
    user: {
      id: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      image: user.imageUrl ?? undefined,
      nickname: user.nickname,
      provider: user.provider,
      sessionIdentity: resolveAppSessionIdentity(user),
    },
  };
}
