export type RateLimitProvider = "upstash" | "redis" | "memory" | "disabled";

type RawEnv = NodeJS.ProcessEnv;

type RuntimeEnv = {
  e2eBypassAuth: boolean;
  nodeEnv: string | null;
  mockGoogleBooks: boolean;
  vercelEnv: string | null;
  isDevelopment: boolean;
  isProductionLike: boolean;
};

type StartupEnv = {
  runtime: RuntimeEnv;
  databaseUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  googleBooksApiKey: string | null;
  authSecret: string;
  nextAuthUrl: string | null;
  mutationRateLimit: MutationRateLimitEnv;
};

type MutationRateLimitEnv = {
  provider: RateLimitProvider;
  redisUrl: string | null;
  upstashRestUrl: string | null;
  upstashRestToken: string | null;
  overrides: {
    createClubLimit: number | null;
    createClubWindowSeconds: number | null;
    addBookLimit: number | null;
    addBookWindowSeconds: number | null;
    startThreadLimit: number | null;
    startThreadWindowSeconds: number | null;
  };
};

const TEST_AUTH_SECRET_FALLBACK = "book-by-book:test-auth-secret";

export function getRuntimeEnv(rawEnv: RawEnv = process.env): RuntimeEnv {
  const nodeEnv = readOptionalString(rawEnv, "NODE_ENV");
  const vercelEnv = readOptionalString(rawEnv, "VERCEL_ENV");
  const e2eBypassAuth = readOptionalString(rawEnv, "E2E_BYPASS_AUTH") === "1";
  const mockGoogleBooks = readOptionalString(rawEnv, "MOCK_GOOGLE_BOOKS") === "1";
  const isDevelopment = nodeEnv === "development";

  return {
    e2eBypassAuth,
    nodeEnv,
    mockGoogleBooks,
    vercelEnv,
    isDevelopment,
    isProductionLike: nodeEnv === "production" && !e2eBypassAuth,
  };
}

export function getDatabaseEnv(rawEnv: RawEnv = process.env) {
  return {
    databaseUrl: readRequiredString(
      rawEnv,
      "DATABASE_URL",
      "DATABASE_URL is required for the database connection.",
    ),
  };
}

export function getGoogleBooksEnv(rawEnv: RawEnv = process.env) {
  const runtime = getRuntimeEnv(rawEnv);
  if (runtime.mockGoogleBooks) {
    return {
      apiKey: readOptionalString(rawEnv, "GOOGLE_BOOKS_API_KEY"),
    };
  }

  return {
    apiKey: readRequiredString(
      rawEnv,
      "GOOGLE_BOOKS_API_KEY",
      "GOOGLE_BOOKS_API_KEY is required for Google Books requests.",
    ),
  };
}

export function getGoogleOAuthEnv(rawEnv: RawEnv = process.env) {
  return {
    clientId: readRequiredString(
      rawEnv,
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_ID is required for Google sign-in.",
    ),
    clientSecret: readRequiredString(
      rawEnv,
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_CLIENT_SECRET is required for Google sign-in.",
    ),
  };
}

export function getAuthSecret(
  rawEnv: RawEnv = process.env,
  options?: { allowTestFallback?: boolean },
) {
  const secret =
    readOptionalString(rawEnv, "AUTH_SECRET") ??
    readOptionalString(rawEnv, "NEXTAUTH_SECRET");

  if (secret) {
    return secret;
  }

  if (options?.allowTestFallback && getRuntimeEnv(rawEnv).nodeEnv === "test") {
    return TEST_AUTH_SECRET_FALLBACK;
  }

  throw new Error(
    "AUTH_SECRET or NEXTAUTH_SECRET is required for authentication.",
  );
}

export function getMutationRateLimitEnv(rawEnv: RawEnv = process.env) {
  const runtime = getRuntimeEnv(rawEnv);
  const provider = readRateLimitProvider(rawEnv);

  if (provider === "memory" && runtime.isProductionLike) {
    throw new Error(
      "RATE_LIMIT_PROVIDER=memory is only supported in test and local development environments.",
    );
  }

  return {
    provider,
    redisUrl:
      provider === "redis"
        ? readRequiredString(
            rawEnv,
            "RATE_LIMIT_REDIS_URL",
            "RATE_LIMIT_REDIS_URL is required for the configured rate-limit provider.",
          )
        : null,
    upstashRestUrl:
      provider === "upstash"
        ? readRequiredString(
            rawEnv,
            "UPSTASH_REDIS_REST_URL",
            "UPSTASH_REDIS_REST_URL is required for the configured rate-limit provider.",
          )
        : null,
    upstashRestToken:
      provider === "upstash"
        ? readRequiredString(
            rawEnv,
            "UPSTASH_REDIS_REST_TOKEN",
            "UPSTASH_REDIS_REST_TOKEN is required for the configured rate-limit provider.",
          )
        : null,
    overrides: {
      createClubLimit: readOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_CREATE_CLUB_LIMIT",
      ),
      createClubWindowSeconds: readOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_CREATE_CLUB_WINDOW_SECONDS",
      ),
      addBookLimit: readOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_ADD_BOOK_LIMIT",
      ),
      addBookWindowSeconds: readOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS",
      ),
      startThreadLimit: readOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_START_THREAD_LIMIT",
      ),
      startThreadWindowSeconds: readOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_START_THREAD_WINDOW_SECONDS",
      ),
    },
  } satisfies MutationRateLimitEnv;
}

export function validateStartupEnv(rawEnv: RawEnv = process.env): StartupEnv {
  const errors: string[] = [];
  const runtime = getRuntimeEnv(rawEnv);
  const databaseUrl = collectRequiredString(
    rawEnv,
    "DATABASE_URL",
    errors,
    "DATABASE_URL is required for the database connection.",
  );
  const googleClientId = collectRequiredString(
    rawEnv,
    "GOOGLE_CLIENT_ID",
    errors,
    "GOOGLE_CLIENT_ID is required for Google sign-in.",
  );
  const googleClientSecret = collectRequiredString(
    rawEnv,
    "GOOGLE_CLIENT_SECRET",
    errors,
    "GOOGLE_CLIENT_SECRET is required for Google sign-in.",
  );
  const googleBooksApiKey =
    runtime.mockGoogleBooks
      ? readOptionalString(rawEnv, "GOOGLE_BOOKS_API_KEY")
      : collectRequiredString(
          rawEnv,
          "GOOGLE_BOOKS_API_KEY",
          errors,
          "GOOGLE_BOOKS_API_KEY is required for Google Books requests.",
        );
  const authSecret = collectAuthSecret(rawEnv, errors);
  const nextAuthUrl = readOptionalString(rawEnv, "NEXTAUTH_URL");
  const mutationRateLimit = collectMutationRateLimitEnv(rawEnv, errors, runtime);

  if (errors.length > 0) {
    throw new Error(formatValidationErrors(errors));
  }

  return {
    runtime,
    databaseUrl: databaseUrl!,
    googleClientId: googleClientId!,
    googleClientSecret: googleClientSecret!,
    googleBooksApiKey,
    authSecret: authSecret!,
    nextAuthUrl,
    mutationRateLimit,
  };
}

function collectMutationRateLimitEnv(
  rawEnv: RawEnv,
  errors: string[],
  runtime: RuntimeEnv,
): MutationRateLimitEnv {
  const provider = collectRateLimitProvider(rawEnv, errors);

  if (provider === "memory" && runtime.isProductionLike) {
    errors.push(
      "RATE_LIMIT_PROVIDER=memory is only supported in test and local development environments.",
    );
  }

  return {
    provider,
    redisUrl:
      provider === "redis"
        ? collectRequiredString(
            rawEnv,
            "RATE_LIMIT_REDIS_URL",
            errors,
            "RATE_LIMIT_REDIS_URL is required for the configured rate-limit provider.",
          )
        : null,
    upstashRestUrl:
      provider === "upstash"
        ? collectRequiredString(
            rawEnv,
            "UPSTASH_REDIS_REST_URL",
            errors,
            "UPSTASH_REDIS_REST_URL is required for the configured rate-limit provider.",
          )
        : null,
    upstashRestToken:
      provider === "upstash"
        ? collectRequiredString(
            rawEnv,
            "UPSTASH_REDIS_REST_TOKEN",
            errors,
            "UPSTASH_REDIS_REST_TOKEN is required for the configured rate-limit provider.",
          )
        : null,
    overrides: {
      createClubLimit: collectOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_CREATE_CLUB_LIMIT",
        errors,
      ),
      createClubWindowSeconds: collectOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_CREATE_CLUB_WINDOW_SECONDS",
        errors,
      ),
      addBookLimit: collectOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_ADD_BOOK_LIMIT",
        errors,
      ),
      addBookWindowSeconds: collectOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS",
        errors,
      ),
      startThreadLimit: collectOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_START_THREAD_LIMIT",
        errors,
      ),
      startThreadWindowSeconds: collectOptionalPositiveInteger(
        rawEnv,
        "RATE_LIMIT_START_THREAD_WINDOW_SECONDS",
        errors,
      ),
    },
  };
}

function collectAuthSecret(rawEnv: RawEnv, errors: string[]) {
  const secret =
    readOptionalString(rawEnv, "AUTH_SECRET") ??
    readOptionalString(rawEnv, "NEXTAUTH_SECRET");

  if (!secret) {
    errors.push("AUTH_SECRET or NEXTAUTH_SECRET is required for authentication.");
    return null;
  }

  return secret;
}

function collectRateLimitProvider(
  rawEnv: RawEnv,
  errors: string[],
): RateLimitProvider {
  try {
    return readRateLimitProvider(rawEnv);
  } catch (error) {
    errors.push(
      error instanceof Error
        ? error.message
        : "RATE_LIMIT_PROVIDER must be one of: upstash, redis, memory, disabled.",
    );
    return "disabled";
  }
}

function readRateLimitProvider(rawEnv: RawEnv): RateLimitProvider {
  const value = readOptionalString(rawEnv, "RATE_LIMIT_PROVIDER");
  if (!value) {
    return "disabled";
  }

  if (
    value === "upstash" ||
    value === "redis" ||
    value === "memory" ||
    value === "disabled"
  ) {
    return value;
  }

  throw new Error(
    "RATE_LIMIT_PROVIDER must be one of: upstash, redis, memory, disabled.",
  );
}

function collectRequiredString(
  rawEnv: RawEnv,
  name: string,
  errors: string[],
  message: string,
) {
  const value = readOptionalString(rawEnv, name);
  if (!value) {
    errors.push(message);
    return null;
  }

  return value;
}

function readRequiredString(rawEnv: RawEnv, name: string, message: string) {
  const value = readOptionalString(rawEnv, name);
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function collectOptionalPositiveInteger(
  rawEnv: RawEnv,
  name: string,
  errors: string[],
) {
  const value = readOptionalString(rawEnv, name);
  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value) || Number.parseInt(value, 10) <= 0) {
    errors.push(`${name} must be a positive integer.`);
    return null;
  }

  return Number.parseInt(value, 10);
}

function readOptionalPositiveInteger(rawEnv: RawEnv, name: string) {
  const value = readOptionalString(rawEnv, name);
  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value) || Number.parseInt(value, 10) <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return Number.parseInt(value, 10);
}

function readOptionalString(rawEnv: RawEnv, name: string) {
  const value = rawEnv[name]?.trim();
  return value ? value : null;
}

function formatValidationErrors(errors: string[]) {
  return [
    "Invalid application environment configuration:",
    ...errors.map((error) => `- ${error}`),
  ].join("\n");
}
