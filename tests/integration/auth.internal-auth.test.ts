import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import sql from "@/lib/db";
import { INTERNAL_AUTH_PROVIDER } from "@/lib/auth/identity";
import { hashInternalAdminPassword } from "@/lib/auth/internal";
import { resetTestDatabase } from "@/lib/test-harness/fixtures";

beforeEach(async () => {
  vi.resetModules();
  process.env.CACHE_PROVIDER = "memory";
  process.env.RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_LIMIT = "2";
  process.env.RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_WINDOW_SECONDS = "60";
  process.env.RATE_LIMIT_ADMIN_SIGNIN_IP_LIMIT = "3";
  process.env.RATE_LIMIT_ADMIN_SIGNIN_IP_WINDOW_SECONDS = "60";
  await resetTestDatabase();
});

afterEach(() => {
  delete process.env.CACHE_PROVIDER;
  delete process.env.RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_LIMIT;
  delete process.env.RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_WINDOW_SECONDS;
  delete process.env.RATE_LIMIT_ADMIN_SIGNIN_IP_LIMIT;
  delete process.env.RATE_LIMIT_ADMIN_SIGNIN_IP_WINDOW_SECONDS;
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
    const { authenticateInternalAdmin } = await import("@/lib/auth/internal-auth");
    const admin = await createInternalAdmin("internal-secret");

    const authenticatedAdmin = await authenticateInternalAdmin({
      email: admin.email,
      password: "internal-secret",
    });

    expect(authenticatedAdmin).toMatchObject({
      id: admin.id,
      email: admin.email,
      provider: INTERNAL_AUTH_PROVIDER,
      signupCompletedAt: null,
    });
  });

  it("rejects invalid internal admin credentials", async () => {
    const { authenticateInternalAdmin } = await import("@/lib/auth/internal-auth");
    const admin = await createInternalAdmin("internal-secret");

    await expect(
      authenticateInternalAdmin({
        email: admin.email,
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Sign-in failed. Check the details you provided are correct.",
    });
  });

  it("throttles repeated failed sign-in attempts", async () => {
    const { authenticateInternalAdmin } = await import("@/lib/auth/internal-auth");
    const admin = await createInternalAdmin("internal-secret");
    const headers = { "x-forwarded-for": "203.0.113.40" };

    await expect(
      authenticateInternalAdmin(
        {
          email: admin.email,
          password: "wrong-password",
        },
        { headers },
      ),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Sign-in failed. Check the details you provided are correct.",
    });

    await expect(
      authenticateInternalAdmin(
        {
          email: admin.email,
          password: "wrong-password",
        },
        { headers },
      ),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Sign-in failed. Check the details you provided are correct.",
    });

    await expect(
      authenticateInternalAdmin(
        {
          email: admin.email,
          password: "wrong-password",
        },
        { headers },
      ),
    ).rejects.toThrow(
      /Sign-in failed\. Check the details you provided are correct\. Try again in about /,
    );
  });
});
