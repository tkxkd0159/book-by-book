import postgres from "postgres";

const DEFAULTS = {
  host: "localhost",
  port: process.env.PG_PORT ?? "54329",
  user: process.env.PG_SUPERUSER ?? "postgres",
  password: process.env.PG_SUPERUSER_PASSWORD ?? "postgres",
  database: process.env.LOCAL_DB_NAME ?? "book_by_book_local",
};

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function getLocalDatabaseUrl() {
  return `postgres://${DEFAULTS.user}:${DEFAULTS.password}@${DEFAULTS.host}:${DEFAULTS.port}/${DEFAULTS.database}`;
}

function parseDatabaseUrl(value) {
  try {
    return new URL(value);
  } catch {
    console.error(`Invalid DATABASE_URL: ${value}`);
    process.exit(1);
  }
}

const databaseUrl = process.env.DATABASE_URL ?? getLocalDatabaseUrl();
const parsedUrl = parseDatabaseUrl(databaseUrl);
const host = parsedUrl.hostname;
const port = parsedUrl.port || "5432";

if (!localHosts.has(host) || port !== DEFAULTS.port) {
  process.exit(0);
}

const sql = postgres(databaseUrl, {
  connect_timeout: 5,
  idle_timeout: 0,
  max: 1,
});

try {
  await sql`select 1`;
  console.log(`Verified local PostgreSQL at ${host}:${port}.`);
} catch (error) {
  console.error(`Local PostgreSQL is not reachable at ${host}:${port}.`);
  console.error("Start it with ./scripts/setup-local-postgres.sh and try again.");
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 1 });
}
