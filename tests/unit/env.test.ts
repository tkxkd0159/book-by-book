import { describe, expect, it } from "vitest";

import { AppEnv } from "@/lib/env";

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
    const appEnv = AppEnv.from(createEnv());
    appEnv.validateForBuildOrThrow();

    expect(appEnv.database.url).toContain("postgres://");
    expect(appEnv.googleBooks.apiBaseUrl).toBe(
      "https://www.googleapis.com/books/v1/volumes",
    );
    expect(appEnv.googleOAuth.clientId).toBe("test-google-client-id");
    expect(appEnv.auth.secret).toBe("test-auth-secret");
    expect(appEnv.logging.level).toBe("info");
    expect(appEnv.cache.provider).toBe("disabled");
    expect(appEnv.rateLimit.provider).toBe("disabled");
  });

  it("accepts supported log level overrides", () => {
    expect(
      AppEnv.from(
        createEnv({
          LOG_LEVEL: "debug",
        }),
      ).logging.level,
    ).toBe("debug");

    expect(
      AppEnv.from(
        createEnv({
          LOG_LEVEL: "silent",
        }),
      ).logging.level,
    ).toBe("silent");
  });

  it("accepts an absolute Google Books API base URL override", () => {
    const appEnv = AppEnv.from(
      createEnv({
        GOOGLE_BOOKS_API_BASE_URL: "http://127.0.0.1:4101/books/v1/volumes",
      }),
    );
    appEnv.validateForBuildOrThrow();

    expect(appEnv.googleBooks.apiBaseUrl).toBe(
      "http://127.0.0.1:4101/books/v1/volumes",
    );
  });

  it("accepts NEXTAUTH_SECRET when AUTH_SECRET is absent", () => {
    const appEnv = AppEnv.from(
      createEnv({
        AUTH_SECRET: "",
        NEXTAUTH_SECRET: "nextauth-test-secret",
      }),
    );
    appEnv.validateForBuildOrThrow();

    expect(appEnv.auth.secret).toBe("nextauth-test-secret");
  });

  it("prefers AUTH_SECRET when both auth secret env vars are set", () => {
    const appEnv = AppEnv.from(
      createEnv({
        AUTH_SECRET: "auth-secret",
        NEXTAUTH_SECRET: "nextauth-secret",
      }),
    );

    expect(appEnv.auth.secret).toBe("auth-secret");
  });

  it("throws when auth config is accessed without an auth secret", () => {
    expect(() =>
      AppEnv.from(
        createEnv({
          AUTH_SECRET: "",
          NEXTAUTH_SECRET: "",
        }),
      ).auth.secret,
    ).toThrow(/AUTH_SECRET or NEXTAUTH_SECRET is required for authentication\./);
  });

  it("aggregates multiple missing required values", () => {
    expect(() =>
      AppEnv.from(
        createEnv({
          AUTH_SECRET: "",
          NEXTAUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          "Invalid application environment configuration:",
        ),
      }),
    );

    expect(() =>
      AppEnv.from(
        createEnv({
          AUTH_SECRET: "",
          NEXTAUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(/DATABASE_URL is required for the database connection\./);
    expect(() =>
      AppEnv.from(
        createEnv({
          AUTH_SECRET: "",
          NEXTAUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(/GOOGLE_CLIENT_ID is required for Google sign-in\./);
    expect(() =>
      AppEnv.from(
        createEnv({
          AUTH_SECRET: "",
          NEXTAUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(/GOOGLE_BOOKS_API_KEY is required for Google Books requests\./);
    expect(() =>
      AppEnv.from(
        createEnv({
          AUTH_SECRET: "",
          NEXTAUTH_SECRET: "",
          DATABASE_URL: "",
          GOOGLE_BOOKS_API_KEY: "",
          GOOGLE_CLIENT_ID: "",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(
      /AUTH_SECRET or NEXTAUTH_SECRET is required for authentication\./,
    );
  });

  it("requires provider-specific rate-limit configuration", () => {
    expect(() =>
      AppEnv.from(
        createEnv({
          RATE_LIMIT_PROVIDER: "upstash",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(/UPSTASH_REDIS_REST_URL is required/);

    expect(() =>
      AppEnv.from(
        createEnv({
          RATE_LIMIT_PROVIDER: "redis",
          RATE_LIMIT_REDIS_URL: "",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(/RATE_LIMIT_REDIS_URL is required/);
  });

  it("accepts generic cache backend configuration", () => {
    const appEnv = AppEnv.from(
      createEnv({
        CACHE_PROVIDER: "redis",
        CACHE_REDIS_URL: "redis://localhost:6379",
      }),
    );

    expect(appEnv.cache.provider).toBe("redis");
    expect(appEnv.cache.redisUrl).toBe("redis://localhost:6379");
    expect(appEnv.rateLimit.provider).toBe("redis");
  });

  it("falls back to legacy rate-limit backend envs for cache config", () => {
    const appEnv = AppEnv.from(
      createEnv({
        RATE_LIMIT_PROVIDER: "upstash",
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "test-token",
      }),
    );

    expect(appEnv.cache.provider).toBe("upstash");
    expect(appEnv.cache.upstashRestUrl).toBe("https://example.upstash.io");
    expect(appEnv.cache.upstashRestToken).toBe("test-token");
  });

  it("rejects invalid positive integer overrides", () => {
    expect(() =>
      AppEnv.from(
        createEnv({
          RATE_LIMIT_CREATE_CLUB_LIMIT: "0",
          RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS: "abc",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(/RATE_LIMIT_CREATE_CLUB_LIMIT must be a positive integer\./);

    expect(() =>
      AppEnv.from(
        createEnv({
          RATE_LIMIT_CREATE_CLUB_LIMIT: "0",
          RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS: "abc",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(
      /RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS must be a positive integer\./,
    );
  });

  it("rejects a non-absolute Google Books API base URL override", () => {
    expect(() =>
      AppEnv.from(
        createEnv({
          GOOGLE_BOOKS_API_BASE_URL: "/books/v1/volumes",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(/GOOGLE_BOOKS_API_BASE_URL must be an absolute URL\./);
  });

  it("rejects an invalid LOG_LEVEL value", () => {
    expect(() =>
      AppEnv.from(
        createEnv({
          LOG_LEVEL: "verbose",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(/LOG_LEVEL must be one of: trace, debug, info, warn, error, fatal, silent\./);
  });

  it("requires NEXTAUTH_URL for production-like app runs", () => {
    expect(() =>
      AppEnv.from(
        createEnv({
          NEXTAUTH_URL: "",
          NODE_ENV: "production",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(
      /NEXTAUTH_URL is required for production and e2e-authenticated app runs\./,
    );
  });

  it("requires NEXTAUTH_URL for e2e bypass app runs", () => {
    expect(() =>
      AppEnv.from(
        createEnv({
          E2E_BYPASS_AUTH: "1",
          NEXTAUTH_URL: "",
          NODE_ENV: "test",
        }),
      ).validateForBuildOrThrow(),
    ).toThrow(
      /NEXTAUTH_URL is required for production and e2e-authenticated app runs\./,
    );
  });

  it("rejects memory rate limiting in production-like runtime", () => {
    expect(
      () =>
        AppEnv.from(
          createEnv({
            NODE_ENV: "production",
            RATE_LIMIT_PROVIDER: "memory",
          }),
        ).rateLimit,
    ).toThrow(
      "RATE_LIMIT_PROVIDER=memory is only supported in test and local development environments.",
    );
  });

  it("rejects memory cache in production-like runtime", () => {
    expect(
      () =>
        AppEnv.from(
          createEnv({
            CACHE_PROVIDER: "memory",
            NODE_ENV: "production",
          }),
        ).cache,
    ).toThrow(
      "CACHE_PROVIDER=memory is only supported in test and local development environments.",
    );
  });
});
