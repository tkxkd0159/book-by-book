const COMMON_TEST_ENV = {
  AUTH_SECRET: "book-by-book-test-auth-secret",
  GOOGLE_BOOKS_API_KEY: "book-by-book-test-google-books-key",
  GOOGLE_CLIENT_ID: "book-by-book-test-google-client-id",
  GOOGLE_CLIENT_SECRET: "book-by-book-test-google-client-secret",
  NODE_ENV: "test",
} as const;

export const UNIT_TEST_DATABASE_URL =
  "postgres://unit-test:unit-test@127.0.0.1:59999/book_by_book_unit";
export const INTEGRATION_POSTGRES_IMAGE = "postgres:18";
export const INTEGRATION_DATABASE_NAME = "book_by_book_integration";
export const INTEGRATION_DATABASE_USERNAME = "postgres";
export const INTEGRATION_DATABASE_PASSWORD = "postgres";
export const INTEGRATION_APP_USER_PASSWORD =
  "book-by-book-integration-db-password";

const APP_ENV_NAMES = [
  ...Object.keys(COMMON_TEST_ENV),
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "E2E_BYPASS_AUTH",
  "VERCEL_ENV",
  "GOOGLE_BOOKS_API_BASE_URL",
  "RATE_LIMIT_PROVIDER",
  "RATE_LIMIT_REDIS_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RATE_LIMIT_CREATE_CLUB_LIMIT",
  "RATE_LIMIT_CREATE_CLUB_WINDOW_SECONDS",
  "RATE_LIMIT_ADD_BOOK_LIMIT",
  "RATE_LIMIT_ADD_BOOK_WINDOW_SECONDS",
  "RATE_LIMIT_START_THREAD_LIMIT",
  "RATE_LIMIT_START_THREAD_WINDOW_SECONDS",
  "RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_LIMIT",
  "RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_WINDOW_SECONDS",
  "RATE_LIMIT_ADMIN_SIGNIN_IP_LIMIT",
  "RATE_LIMIT_ADMIN_SIGNIN_IP_WINDOW_SECONDS",
];

const UNIQUE_APP_ENV_NAMES = [...new Set(APP_ENV_NAMES)];

export function applyUnitTestEnv() {
  applyTestEnv({
    ...COMMON_TEST_ENV,
    DATABASE_URL: UNIT_TEST_DATABASE_URL,
  });
}

export function applyIntegrationTestEnv(databaseUrl: string) {
  applyTestEnv({
    ...COMMON_TEST_ENV,
    DATABASE_URL: databaseUrl,
  });
}

function applyTestEnv(nextEnv: Readonly<Record<string, string>>) {
  for (const name of UNIQUE_APP_ENV_NAMES) {
    delete process.env[name];
  }

  Object.assign(process.env, nextEnv);
}
