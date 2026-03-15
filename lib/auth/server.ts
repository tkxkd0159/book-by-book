import type { Session } from "next-auth";
import { redirect } from "next/navigation";

import { createE2ESession, getE2ECurrentUser } from "@/lib/auth/e2e";
import { getAuthSessionSafe } from "@/lib/auth/session";
import { findUserByEmail, findUserById } from "@/lib/auth/users";
import type { AuthUser } from "@/types/db";

export async function getAuthSession() {
  const session = await getAuthSessionSafe();
  if (session?.user) {
    return session;
  }

  const e2eUser = await getE2ECurrentUser();
  if (e2eUser) {
    return createE2ESession(e2eUser);
  }

  return null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getAuthSession();
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

export async function requireAuthSession(): Promise<Session> {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect("/signin");
  }

  return session;
}

export async function requireCurrentUser(): Promise<AuthUser> {
  const session = await requireAuthSession();
  const user =
    (session.user.id ? await findUserById(session.user.id) : null) ??
    (session.user.email ? await findUserByEmail(session.user.email) : null);

  if (!user) {
    redirect("/signin");
  }

  return user;
}
