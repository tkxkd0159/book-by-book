import type { User } from "next-auth";

import { AuthFlowError } from "@/lib/auth/errors";
import {
  normalizeInternalAdminEmail,
  parseInternalAdminPassword,
  verifyInternalAdminPassword,
} from "@/lib/auth/internal";
import { findInternalAdminByEmail } from "@/lib/auth/users";

type InternalAdminCredentialsInput = {
  email?: string | null;
  password?: string | null;
};

export async function authenticateInternalAdmin(
  credentials: InternalAdminCredentialsInput,
) {
  const email = normalizeInternalAdminEmail(credentials.email);
  const password = parseInternalAdminPassword(credentials.password);
  const adminUser = await findInternalAdminByEmail(email);

  if (
    !adminUser ||
    !(await verifyInternalAdminPassword(password, adminUser.passwordHash))
  ) {
    throw new AuthFlowError("UNAUTHORIZED", "Invalid email or password.");
  }

  return adminUser;
}

export async function authorizeInternalAdminCredentials(
  credentials: Record<string, unknown> | undefined,
): Promise<User | null> {
  try {
    const adminUser = await authenticateInternalAdmin({
      email: typeof credentials?.email === "string" ? credentials.email : null,
      password:
        typeof credentials?.password === "string" ? credentials.password : null,
    });

    return {
      id: adminUser.id,
      email: adminUser.email ?? undefined,
      name: adminUser.name ?? undefined,
      image: adminUser.imageUrl ?? undefined,
    };
  } catch (error) {
    if (error instanceof AuthFlowError) {
      return null;
    }

    throw error;
  }
}
