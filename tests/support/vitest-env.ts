const REQUIRED_TEST_ENV_DEFAULTS = {
  AUTH_SECRET: "book-by-book-vitest-auth-secret",
  DATABASE_URL: "postgres://postgres:postgres@localhost:54329/book_by_book_local",
  GOOGLE_BOOKS_API_KEY: "book-by-book-vitest-google-books-key",
  GOOGLE_CLIENT_ID: "book-by-book-vitest-google-client-id",
  GOOGLE_CLIENT_SECRET: "book-by-book-vitest-google-client-secret",
  NODE_ENV: "test",
} as const;

for (const [name, value] of Object.entries(REQUIRED_TEST_ENV_DEFAULTS)) {
  if (!process.env[name]?.trim()) {
    process.env[name] = value;
  }
}
