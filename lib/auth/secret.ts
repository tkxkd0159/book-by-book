const DEV_AUTH_SECRET = "book-by-book-dev-auth-secret-change-me";

export function resolveAuthSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret) {
    return secret;
  }

  const fallbackSeed =
    process.env.GOOGLE_CLIENT_SECRET ??
    process.env.GOOGLE_CLIENT_ID ??
    DEV_AUTH_SECRET;

  return `book-by-book:${fallbackSeed}`;
}
