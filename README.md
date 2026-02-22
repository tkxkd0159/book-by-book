## Book by Book

Milestone 1 implementation includes:
- Google OAuth sign-in
- Google Books search and import/cache
- Book detail page backed by local Postgres cache

## Required Environment Variables

Create `.env.local` with:

```bash
DATABASE_URL=postgres://...
AUTH_SECRET=your-long-random-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_BOOKS_API_KEY=...
```

Optional:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
```

Generate a strong secret:

```bash
openssl rand -base64 32
```

Google Cloud OAuth redirect URI must include:

```bash
http://localhost:3000/api/auth/callback/google
```

## Database Setup

Schema file:

```bash
db/schema/data.sql
```

The SQL expects `$APP_USER_PASSWORD` to be substituted when creating the app DB user:

```bash
export APP_USER_PASSWORD="replace-me"
envsubst < db/schema/data.sql | psql "$DATABASE_URL"
```

## Run

```bash
pnpm dev
```

## Quality Gates

```bash
pnpm lint
pnpm build
```
