import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import sql from "@/lib/db";
import { INTERNAL_AUTH_PROVIDER } from "@/lib/auth/identity";
import { hashInternalAdminPassword } from "@/lib/auth/internal";
import { authenticateInternalAdmin } from "@/lib/auth/internal-auth";
import { resetTestDatabase } from "@/lib/test-harness/fixtures";

beforeEach(async () => {
  await resetTestDatabase();
});

async function createInternalAdmin(password: string) {
  const email = `admin-${randomUUID()}@book-by-book.test`;
  const passwordHash = await hashInternalAdminPassword(password, 4);

  const [admin] = await sql<{ id: string; email: string }[]>`
    insert into bookapp.users (
      provider,
      provider_user_id,
      email,
      name,
      password_hash
    )
    values (
      ${INTERNAL_AUTH_PROVIDER},
      ${email},
      ${email},
      'Internal Admin',
      ${passwordHash}
    )
    returning id::text as id, email::text as email
  `;

  return admin;
}

describe("internal admin authentication integration", () => {
  it("authenticates a valid internal admin email and password", async () => {
    const admin = await createInternalAdmin("internal-secret");

    const authenticatedAdmin = await authenticateInternalAdmin({
      email: admin.email,
      password: "internal-secret",
    });

    expect(authenticatedAdmin).toMatchObject({
      id: admin.id,
      email: admin.email,
      provider: INTERNAL_AUTH_PROVIDER,
      isInternalAdmin: true,
      sessionIdentity: "INTERNAL_ADMIN",
    });
  });

  it("rejects invalid internal admin credentials", async () => {
    const admin = await createInternalAdmin("internal-secret");

    await expect(
      authenticateInternalAdmin({
        email: admin.email,
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Invalid email or password.",
    });
  });
});
