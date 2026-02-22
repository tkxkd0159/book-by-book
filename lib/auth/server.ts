import type { Session } from "next-auth";
import { redirect } from "next/navigation";

import { getAuthSessionSafe } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/users";
import type { AuthUser } from "@/types/db";

export async function getAuthSession() {
  return getAuthSessionSafe();
}

export async function requireAuthSession(): Promise<Session> {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  return session;
}

export async function requireCurrentUser(): Promise<AuthUser> {
  const session = await requireAuthSession();
  const user = await findUserByEmail(session.user.email as string);

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
