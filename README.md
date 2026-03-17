## Book by Book

Milestone 1 implementation includes:
- Google OAuth sign-in
- Google Books search and import/cache
- Book detail page backed by local Postgres cache

## Required Environment Variables

Create `.env.local` with:

```bash
AUTH_SECRET=your-long-random-secret

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_BOOKS_API_KEY=...

DATABASE_URL=postgres://...

RATE_LIMIT_PROVIDER=<redis|upstash>
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
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

Or bootstrap local PostgreSQL with Docker and apply schema + migrations:

```bash
./scripts/setup-local-postgres.sh
```

Optional env overrides for Docker setup:

```bash
PG_CONTAINER_NAME=book-by-book-postgres
PG_IMAGE=postgres:18
PG_PORT=54329
PG_SUPERUSER=postgres
PG_SUPERUSER_PASSWORD=postgres
LOCAL_DB_NAME=book_by_book_local
APP_USER_PASSWORD=local-dev-password
PG_VOLUME_NAME=book-by-book-postgres-data
PG_VOLUME_MOUNT=/var/lib/postgresql
```

Clean up the local Docker PostgreSQL container and volume:

```bash
./scripts/cleanup-local-postgres.sh
```

Optional env overrides for cleanup:

```bash
PG_CONTAINER_NAME=book-by-book-postgres
PG_VOLUME_NAME=book-by-book-postgres-data
REMOVE_VOLUME=1
```

## Run

```bash
pnpm dev
```

When you run `npm start` or `pnpm start`, a `prestart` hook now verifies that local PostgreSQL is reachable at `localhost:54329` when `DATABASE_URL` targets the local dev database. If it is not running, start it with:

```bash
./scripts/setup-local-postgres.sh
```

## Quality Gates

```bash
pnpm lint
pnpm build
```
