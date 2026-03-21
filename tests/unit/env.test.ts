import { describe, expect, it } from "vitest";

import {
  getMutationRateLimitEnv,
  validateStartupEnv,
} from "@/lib/env";

function createEnv(
  overrides: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  return {
    AUTH_SECRET: "test-auth-secret",
    DATABASE_URL: "postgres://postgres:postgres@localhost:54329/book_by_book",
    GOOGLE_BOOKS_API_KEY: "test-google-books-key",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    NODE_ENV: "development",
    ...overrides,
  };
}

describe("environment validation", () => {
  it("accepts a complete startup configuration", () => {
    const env = validateStartupEnv(createEnv());

    expect(env.databaseUrl).toContain("postgres://");
    expect(env.googleClientId).toBe("test-google-client-id");
    expect(env.authSecret).toBe("test-auth-secret");
    expect(env.mutationRateLimit.provider).toBe("disabled");
    expect(env.runtime.mockGoogleBooks).toBe(false);
  });

  it("accepts Google Books mock mode without an API key", () => {
    const env = validateStartupEnv(
      createEnv({
        GOOGLE_BOOKS_API_KEY: "",
        MOCK_GOOGLE_BOOKS: "1",
      }),
    );

    expect(env.runtime.mockGoogleBooks).toBe(true);
    expect(env.googleBooksApiKey).toBeNull();
  });

  it("accepts NEXTAUTH_SECRET when AUTH_SECRET is absent", () => {
    const env = validateStartupEnv(
      createEnv({
        AUTH_SECRET: "",
        NEXTAUTH_SECRET: "nextauth-test-secret",
      }),
    );

    expect(env.authSecret).toBe("nextauth-test-secret");
  });

  it("aggregates multiple missing required values", () => {
    expect(() =>
      validateStartupEnv(
        createEnv({
          AUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ),
    ).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining(
          "Invalid application environment configuration:",
        ),
      }),
    );

    expect(() =>
      validateStartupEnv(
        createEnv({
          AUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ),
    ).toThrowError(/DATABASE_URL is required for the database connection\./);
    expect(() =>
      validateStartupEnv(
        createEnv({
          AUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ),
    ).toThrowError(/GOOGLE_CLIENT_ID is required for Google sign-in\./);
    expect(() =>
      validateStartupEnv(
        createEnv({
          AUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ),
    ).toThrowError(/GOOGLE_BOOKS_API_KEY is required for Google Books requests\./);
    expect(() =>
      validateStartupEnv(
        createEnv({
          AUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ),
    ).toThrowError(/AUTH_SECRET or NEXTAUTH_SECRET is required for authentication\./);
  });

  it("requires provider-specific rate-limit configuration", () => {
    expect(() =>
      validateStartupEnv(
        createEnv({
          RATE_LIMIT_PROVIDER: "upstash",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
        }),
      ),
    ).toThrowError(/UPSTASH_REDIS_REST_URL is required/);

    expect(() =>
      validateStartupEnv(
        createEnv({
          RATE_LIMIT_PROVIDER: "redis",
          RATE_LIMIT_REDIS_URL: "",
        }),
      ),
    ).toThrowError(/RATE_LIMIT_REDIS_URL is required/);
  });

  it("rejects invalid positive integer overrides", () => {
    expect(() =>
      validateStartupEnv(
        createEnv({
          RATE_LIMIT_CREATE_CLUB_LIMIT: "0",
          RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS: "abc",
        }),
      ),
    ).toThrowError(/RATE_LIMIT_CREATE_CLUB_LIMIT must be a positive integer\./);

    expect(() =>
      validateStartupEnv(
        createEnv({
          RATE_LIMIT_CREATE_CLUB_LIMIT: "0",
          RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS: "abc",
        }),
      ),
    ).toThrowError(
      /RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS must be a positive integer\./,
    );
  });

  it("rejects memory rate limiting in production-like runtime", () => {
    expect(() =>
      getMutationRateLimitEnv(
        createEnv({
          NODE_ENV: "production",
          RATE_LIMIT_PROVIDER: "memory",
        }),
      ),
    ).toThrowError(
      "RATE_LIMIT_PROVIDER=memory is only supported in test and local development environments.",
    );
  });
});
