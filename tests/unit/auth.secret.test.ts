import { describe, expect, it } from "vitest";

import { resolveAuthSecret } from "@/lib/auth/secret";

describe("resolveAuthSecret", () => {
  it("requires an explicit auth secret for normal app runs", () => {
    expect(() =>
      resolveAuthSecret({
        env: {
          GOOGLE_CLIENT_ID: "google-id",
          GOOGLE_CLIENT_SECRET: "google-secret",
          NODE_ENV: "development",
        },
      }),
    ).toThrow("AUTH_SECRET or NEXTAUTH_SECRET is required for authentication.");
  });

  it("can use an opt-in fallback for isolated test helpers", () => {
    expect(
      resolveAuthSecret({
        env: {
          NODE_ENV: "test",
        },
        allowTestFallback: true,
      }),
    ).toBe("book-by-book:test-auth-secret");
  });
});
