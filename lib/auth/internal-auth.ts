import type { User } from "next-auth";

import { AuthFlowError } from "@/lib/auth/errors";
import {
  getAdminSignInFailureMessage,
  recordFailedAdminSignInAttempt,
} from "@/lib/rate-limit/admin-signin";
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
  options?: {
    headers?:
      | Headers
      | Record<string, string | string[] | undefined>
      | undefined
      | null;
  },
) {
  let email: string;
  let password: string;

  try {
    email = normalizeInternalAdminEmail(credentials.email);
    password = parseInternalAdminPassword(credentials.password);
  } catch {
    throw new AuthFlowError("UNAUTHORIZED", getAdminSignInFailureMessage());
  }

  const adminUser = await findInternalAdminByEmail(email);

  if (
    !adminUser ||
    !(await verifyInternalAdminPassword(password, adminUser.passwordHash))
  ) {
    await recordFailedAdminSignInAttempt({
      email,
      headers: options?.headers,
    });

    throw new AuthFlowError("UNAUTHORIZED", getAdminSignInFailureMessage());
  }

  return adminUser;
}

export async function authorizeInternalAdminCredentials(
  credentials: Record<string, unknown> | undefined,
  request?: {
    headers?: Record<string, string | string[] | undefined>;
  },
): Promise<User | null> {
  try {
    const adminUser = await authenticateInternalAdmin({
      email: typeof credentials?.email === "string" ? credentials.email : null,
      password:
        typeof credentials?.password === "string" ? credentials.password : null,
    }, {
      headers: request?.headers,
    });

    return {
      id: adminUser.id,
      email: adminUser.email ?? undefined,
      name: adminUser.name ?? undefined,
      image: adminUser.imageUrl ?? undefined,
    };
  } catch (error) {
    if (error instanceof AuthFlowError) {
      throw new Error(error.message);
    }

    throw error;
  }
}
