import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getAuthSessionSafe } from "@/lib/auth/session";
import {
  createE2ESession,
  getE2ECurrentUser,
} from "@/lib/test-harness/auth";
import { findUserByEmail, findUserById } from "@/lib/auth/users";
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
  if (!session?.user) {
    return null;
  }

  if (session.user.id) {
    const byId = await findUserById(session.user.id);
    if (byId) {
      return byId;
    }
  }

  if (session.user.email) {
    return findUserByEmail(session.user.email);
  }

  return null;
}

const readCurrentUser = cache(async (): Promise<AuthUser | null> =>
  findCurrentUserFromSession(await readAuthSession()),
);

export const getAuthSession = readAuthSession;
export const getCurrentUser = readCurrentUser;

export async function requireAuthSession(): Promise<Session> {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect("/signin");
  }

  return session;
}

export async function requireCurrentUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  return user;
}
