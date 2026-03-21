import { describe, expect, it } from "vitest";

import {
  hashInternalAdminPassword,
  normalizeInternalAdminEmail,
  parseInternalAdminPassword,
  verifyInternalAdminPassword,
} from "@/lib/auth/internal";

describe("internal admin auth helpers", () => {
  it("normalizes and validates internal admin emails", () => {
    expect(normalizeInternalAdminEmail(" Admin@Book-By-Book.Test ")).toBe(
      "admin@book-by-book.test",
    );
    expect(() => normalizeInternalAdminEmail("not-an-email")).toThrow(
      "Enter a valid email address.",
    );
  });

  it("requires a password and verifies bcrypt-compatible hashes", async () => {
    expect(parseInternalAdminPassword("secret-password")).toBe(
      "secret-password",
    );
    expect(() => parseInternalAdminPassword("   ")).toThrow(
      "Password is required.",
    );

    const passwordHash = await hashInternalAdminPassword("secret-password", 4);
    await expect(
      verifyInternalAdminPassword("secret-password", passwordHash),
    ).resolves.toBe(true);
    await expect(
      verifyInternalAdminPassword("wrong-password", passwordHash),
    ).resolves.toBe(false);
  });
});
