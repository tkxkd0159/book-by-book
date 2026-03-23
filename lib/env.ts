export type CacheProvider = "upstash" | "redis" | "memory" | "disabled";
export type RateLimitProvider = CacheProvider;
export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal"
  | "silent";

type RawEnv = NodeJS.ProcessEnv;

type RuntimeEnv = {
  e2eBypassAuth: boolean;
  nodeEnv: string | null;
  requiresNextAuthUrl: boolean;
  vercelEnv: string | null;
  isDevelopment: boolean;
  isProductionLike: boolean;
};

export type CacheEnv = {
  provider: CacheProvider;
  redisUrl: string | null;
  upstashRestUrl: string | null;
  upstashRestToken: string | null;
};

type MutationRateLimitEnv = CacheEnv & {
  overrides: {
    createClubLimit: number | null;
    createClubWindowSeconds: number | null;
    addBookLimit: number | null;
    addBookWindowSeconds: number | null;
    startThreadLimit: number | null;
    startThreadWindowSeconds: number | null;
  };
};

type DatabaseEnv = {
  url: string;
};

type GoogleBooksEnv = {
  apiBaseUrl: string;
  apiKey: string;
};

type GoogleOAuthEnv = {
  clientId: string;
  clientSecret: string;
};

type AuthEnv = {
  nextAuthUrl: string | null;
  secret: string;
};

type LoggingEnv = {
  level: LogLevel;
};

type CacheProviderSource = "cache" | "rateLimit" | "default";

type ResolvedCacheProvider = {
  provider: CacheProvider;
  source: CacheProviderSource;
};

const DEFAULT_GOOGLE_BOOKS_API_BASE_URL =
  "https://www.googleapis.com/books/v1/volumes";
const DEFAULT_LOG_LEVEL: LogLevel = "info";
const AUTH_SECRET_REQUIRED_MESSAGE =
  "AUTH_SECRET or NEXTAUTH_SECRET is required for authentication.";

class EnvValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(formatValidationErrors(issues));
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

export class AppEnv {
  readonly #rawEnv: RawEnv;

  private constructor(rawEnv: RawEnv) {
    this.#rawEnv = rawEnv;
  }

  static from(rawEnv: RawEnv = process.env) {
    return new AppEnv(rawEnv);
  }

  get runtime(): RuntimeEnv {
    const nodeEnv = this.#readOptionalString("NODE_ENV");
    const e2eBypassAuth = this.#readOptionalString("E2E_BYPASS_AUTH") === "1";

    return {
      e2eBypassAuth,
      nodeEnv,
      requiresNextAuthUrl:
        (nodeEnv === "production" && !e2eBypassAuth) || e2eBypassAuth,
      vercelEnv: this.#readOptionalString("VERCEL_ENV"),
      isDevelopment: nodeEnv === "development",
      isProductionLike: nodeEnv === "production" && !e2eBypassAuth,
    };
  }

  get database(): DatabaseEnv {
    return {
      url: this.#readRequiredString(
        "DATABASE_URL",
        "DATABASE_URL is required for the database connection.",
      ),
    };
  }

  get googleBooks(): GoogleBooksEnv {
    return {
      apiBaseUrl:
        this.#readOptionalAbsoluteUrl("GOOGLE_BOOKS_API_BASE_URL") ??
        DEFAULT_GOOGLE_BOOKS_API_BASE_URL,
      apiKey: this.#readRequiredString(
        "GOOGLE_BOOKS_API_KEY",
        "GOOGLE_BOOKS_API_KEY is required for Google Books requests.",
      ),
    };
  }

  get googleOAuth(): GoogleOAuthEnv {
    return {
      clientId: this.#readRequiredString(
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_ID is required for Google sign-in.",
      ),
      clientSecret: this.#readRequiredString(
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_CLIENT_SECRET is required for Google sign-in.",
      ),
    };
  }

  get auth(): AuthEnv {
    return {
      nextAuthUrl: this.#readOptionalString("NEXTAUTH_URL"),
      secret: this.#readRequiredAuthSecret(),
    };
  }

  get logging(): LoggingEnv {
    return {
      level: this.#readLogLevel(),
    };
  }

  get cache(): CacheEnv {
    const resolvedProvider = this.#readCacheProvider();

    if (
      resolvedProvider.provider === "memory" &&
      this.runtime.isProductionLike
    ) {
      throw new Error(this.#getMemoryProviderErrorMessage(resolvedProvider.source));
    }

    return {
      provider: resolvedProvider.provider,
      redisUrl:
        resolvedProvider.provider === "redis"
          ? this.#readRequiredCacheRedisUrl(resolvedProvider.source)
          : null,
      upstashRestUrl:
        resolvedProvider.provider === "upstash"
          ? this.#readRequiredCacheUpstashRestUrl(resolvedProvider.source)
          : null,
      upstashRestToken:
        resolvedProvider.provider === "upstash"
          ? this.#readRequiredCacheUpstashRestToken(resolvedProvider.source)
          : null,
    };
  }

  get rateLimit(): MutationRateLimitEnv {
    const cache = this.cache;

    return {
      provider: cache.provider,
      redisUrl: cache.redisUrl,
      upstashRestUrl: cache.upstashRestUrl,
      upstashRestToken: cache.upstashRestToken,
      overrides: {
        createClubLimit: this.#readOptionalPositiveInteger(
          "RATE_LIMIT_CREATE_CLUB_LIMIT",
        ),
        createClubWindowSeconds: this.#readOptionalPositiveInteger(
          "RATE_LIMIT_CREATE_CLUB_WINDOW_SECONDS",
        ),
        addBookLimit: this.#readOptionalPositiveInteger(
          "RATE_LIMIT_ADD_BOOK_LIMIT",
        ),
        addBookWindowSeconds: this.#readOptionalPositiveInteger(
          "RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS",
        ),
        startThreadLimit: this.#readOptionalPositiveInteger(
          "RATE_LIMIT_START_THREAD_LIMIT",
        ),
        startThreadWindowSeconds: this.#readOptionalPositiveInteger(
          "RATE_LIMIT_START_THREAD_WINDOW_SECONDS",
        ),
      },
    };
  }

  validateForBuildOrThrow() {
    const issues: string[] = [];
    const runtime = this.runtime;

    this.#collectRequiredString(
      "DATABASE_URL",
      issues,
      "DATABASE_URL is required for the database connection.",
    );
    this.#collectRequiredString(
      "GOOGLE_CLIENT_ID",
      issues,
      "GOOGLE_CLIENT_ID is required for Google sign-in.",
    );
    this.#collectRequiredString(
      "GOOGLE_CLIENT_SECRET",
      issues,
      "GOOGLE_CLIENT_SECRET is required for Google sign-in.",
    );
    this.#collectRequiredString(
      "GOOGLE_BOOKS_API_KEY",
      issues,
      "GOOGLE_BOOKS_API_KEY is required for Google Books requests.",
    );
    this.#collectOptionalAbsoluteUrl("GOOGLE_BOOKS_API_BASE_URL", issues);

    this.#collectRequiredAuthSecret(issues);
    this.#collectLogLevel(issues);

    if (runtime.requiresNextAuthUrl) {
      this.#collectRequiredString(
        "NEXTAUTH_URL",
        issues,
        "NEXTAUTH_URL is required for production and e2e-authenticated app runs.",
      );
    }

    const resolvedProvider = this.#collectCacheProvider(issues);

    if (
      resolvedProvider.provider === "memory" &&
      runtime.isProductionLike
    ) {
      issues.push(this.#getMemoryProviderErrorMessage(resolvedProvider.source));
    }

    if (resolvedProvider.provider === "redis") {
      this.#collectRequiredCacheRedisUrl(issues, resolvedProvider.source);
    }

    if (resolvedProvider.provider === "upstash") {
      this.#collectRequiredCacheUpstashRestUrl(issues, resolvedProvider.source);
      this.#collectRequiredCacheUpstashRestToken(issues, resolvedProvider.source);
    }

    this.#collectOptionalPositiveInteger("RATE_LIMIT_CREATE_CLUB_LIMIT", issues);
    this.#collectOptionalPositiveInteger(
      "RATE_LIMIT_CREATE_CLUB_WINDOW_SECONDS",
      issues,
    );
    this.#collectOptionalPositiveInteger("RATE_LIMIT_ADD_BOOK_LIMIT", issues);
    this.#collectOptionalPositiveInteger(
      "RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS",
      issues,
    );
    this.#collectOptionalPositiveInteger("RATE_LIMIT_START_THREAD_LIMIT", issues);
    this.#collectOptionalPositiveInteger(
      "RATE_LIMIT_START_THREAD_WINDOW_SECONDS",
      issues,
    );

    if (issues.length > 0) {
      throw new EnvValidationError(issues);
    }
  }

  validateForStartupOrThrow() {
    this.validateForBuildOrThrow();
  }

  #collectLogLevel(issues: string[]) {
    try {
      this.#readLogLevel();
    } catch (error) {
      issues.push(
        error instanceof Error
          ? error.message
          : "LOG_LEVEL must be one of: trace, debug, info, warn, error, fatal, silent.",
      );
    }
  }

  #collectCacheProvider(issues: string[]): ResolvedCacheProvider {
    try {
      return this.#readCacheProvider();
    } catch (error) {
      issues.push(
        error instanceof Error
          ? error.message
          : "CACHE_PROVIDER must be one of: upstash, redis, memory, disabled.",
      );
      return {
        provider: "disabled",
        source: "default",
      };
    }
  }

  #readCacheProvider(): ResolvedCacheProvider {
    const cacheValue = this.#readOptionalString("CACHE_PROVIDER");
    if (cacheValue) {
      return {
        provider: this.#parseCacheProvider(cacheValue, "CACHE_PROVIDER"),
        source: "cache",
      };
    }

    const rateLimitValue = this.#readOptionalString("RATE_LIMIT_PROVIDER");
    if (rateLimitValue) {
      return {
        provider: this.#parseCacheProvider(rateLimitValue, "RATE_LIMIT_PROVIDER"),
        source: "rateLimit",
      };
    }

    return {
      provider: "disabled",
      source: "default",
    };
  }

  #parseCacheProvider(value: string, envName: "CACHE_PROVIDER" | "RATE_LIMIT_PROVIDER"): CacheProvider {
    if (
      value === "upstash" ||
      value === "redis" ||
      value === "memory" ||
      value === "disabled"
    ) {
      return value;
    }

    throw new Error(
      `${envName} must be one of: upstash, redis, memory, disabled.`,
    );
  }

  #readLogLevel(): LogLevel {
    const value = this.#readOptionalString("LOG_LEVEL");
    if (!value) {
      return DEFAULT_LOG_LEVEL;
    }

    if (
      value === "trace" ||
      value === "debug" ||
      value === "info" ||
      value === "warn" ||
      value === "error" ||
      value === "fatal" ||
      value === "silent"
    ) {
      return value;
    }

    throw new Error(
      "LOG_LEVEL must be one of: trace, debug, info, warn, error, fatal, silent.",
    );
  }

  #collectRequiredString(name: string, issues: string[], message: string) {
    if (!this.#readOptionalString(name)) {
      issues.push(message);
    }
  }

  #collectRequiredAuthSecret(issues: string[]) {
    if (!this.#readAuthSecret()) {
      issues.push(AUTH_SECRET_REQUIRED_MESSAGE);
    }
  }

  #collectRequiredCacheRedisUrl(
    issues: string[],
    source: CacheProviderSource,
  ) {
    if (
      this.#readOptionalString("CACHE_REDIS_URL") ||
      this.#readOptionalString("RATE_LIMIT_REDIS_URL")
    ) {
      return;
    }

    issues.push(this.#getRedisUrlErrorMessage(source));
  }

  #collectRequiredCacheUpstashRestUrl(
    issues: string[],
    source: CacheProviderSource,
  ) {
    if (
      this.#readOptionalString("CACHE_UPSTASH_REST_URL") ||
      this.#readOptionalString("UPSTASH_REDIS_REST_URL")
    ) {
      return;
    }

    issues.push(this.#getUpstashRestUrlErrorMessage(source));
  }

  #collectRequiredCacheUpstashRestToken(
    issues: string[],
    source: CacheProviderSource,
  ) {
    if (
      this.#readOptionalString("CACHE_UPSTASH_REST_TOKEN") ||
      this.#readOptionalString("UPSTASH_REDIS_REST_TOKEN")
    ) {
      return;
    }

    issues.push(this.#getUpstashRestTokenErrorMessage(source));
  }

  #collectOptionalAbsoluteUrl(name: string, issues: string[]) {
    const value = this.#readOptionalString(name);
    if (!value) {
      return;
    }

    try {
      this.#assertAbsoluteUrl(name, value);
    } catch (error) {
      issues.push(
        error instanceof Error
          ? error.message
          : `${name} must be an absolute URL.`,
      );
    }
  }

  #readRequiredString(name: string, message: string) {
    const value = this.#readOptionalString(name);
    if (!value) {
      throw new Error(message);
    }

    return value;
  }

  #readRequiredCacheRedisUrl(source: CacheProviderSource) {
    return (
      this.#readOptionalString("CACHE_REDIS_URL") ??
      this.#readRequiredString(
        "RATE_LIMIT_REDIS_URL",
        this.#getRedisUrlErrorMessage(source),
      )
    );
  }

  #readRequiredCacheUpstashRestUrl(source: CacheProviderSource) {
    return (
      this.#readOptionalString("CACHE_UPSTASH_REST_URL") ??
      this.#readRequiredString(
        "UPSTASH_REDIS_REST_URL",
        this.#getUpstashRestUrlErrorMessage(source),
      )
    );
  }

  #readRequiredCacheUpstashRestToken(source: CacheProviderSource) {
    return (
      this.#readOptionalString("CACHE_UPSTASH_REST_TOKEN") ??
      this.#readRequiredString(
        "UPSTASH_REDIS_REST_TOKEN",
        this.#getUpstashRestTokenErrorMessage(source),
      )
    );
  }

  #readRequiredAuthSecret() {
    const secret = this.#readAuthSecret();
    if (!secret) {
      throw new Error(AUTH_SECRET_REQUIRED_MESSAGE);
    }

    return secret;
  }

  #readOptionalAbsoluteUrl(name: string) {
    const value = this.#readOptionalString(name);
    if (!value) {
      return null;
    }

    this.#assertAbsoluteUrl(name, value);
    return value;
  }

  #collectOptionalPositiveInteger(name: string, issues: string[]) {
    const value = this.#readOptionalString(name);
    if (!value) {
      return;
    }

    if (!/^\d+$/.test(value) || Number.parseInt(value, 10) <= 0) {
      issues.push(`${name} must be a positive integer.`);
    }
  }

  #readOptionalPositiveInteger(name: string) {
    const value = this.#readOptionalString(name);
    if (!value) {
      return null;
    }

    if (!/^\d+$/.test(value) || Number.parseInt(value, 10) <= 0) {
      throw new Error(`${name} must be a positive integer.`);
    }

    return Number.parseInt(value, 10);
  }

  #readAuthSecret() {
    return (
      this.#readOptionalString("AUTH_SECRET") ??
      this.#readOptionalString("NEXTAUTH_SECRET")
    );
  }

  #readOptionalString(name: string) {
    const value = this.#rawEnv[name]?.trim();
    return value ? value : null;
  }

  #assertAbsoluteUrl(name: string, value: string) {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be an absolute URL.`);
    }

    if (!url.protocol || !url.hostname) {
      throw new Error(`${name} must be an absolute URL.`);
    }
  }

  #getMemoryProviderErrorMessage(source: CacheProviderSource) {
    if (source === "rateLimit") {
      return "RATE_LIMIT_PROVIDER=memory is only supported in test and local development environments.";
    }

    return "CACHE_PROVIDER=memory is only supported in test and local development environments.";
  }

  #getRedisUrlErrorMessage(source: CacheProviderSource) {
    if (source === "rateLimit") {
      return "RATE_LIMIT_REDIS_URL is required for the configured rate-limit provider.";
    }

    return "CACHE_REDIS_URL is required for the configured cache provider.";
  }

  #getUpstashRestUrlErrorMessage(source: CacheProviderSource) {
    if (source === "rateLimit") {
      return "UPSTASH_REDIS_REST_URL is required for the configured rate-limit provider.";
    }

    return "CACHE_UPSTASH_REST_URL is required for the configured cache provider.";
  }

  #getUpstashRestTokenErrorMessage(source: CacheProviderSource) {
    if (source === "rateLimit") {
      return "UPSTASH_REDIS_REST_TOKEN is required for the configured rate-limit provider.";
    }

    return "CACHE_UPSTASH_REST_TOKEN is required for the configured cache provider.";
  }
}

export const env = AppEnv.from();

function formatValidationErrors(issues: string[]) {
  return [
    "Invalid application environment configuration:",
    ...issues.map((issue) => `- ${issue}`),
  ].join("\n");
}
