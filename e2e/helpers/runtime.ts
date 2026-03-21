import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import postgres from "postgres";

const ROOT_DIR = process.cwd();
const SCHEMA_FILE_PATH = path.join(ROOT_DIR, "db/schema/data.sql");
const RUNTIME_STATE_PATH = path.join(
  ROOT_DIR,
  "test-results",
  "playwright-runtime-state.json",
);

const DEFAULT_APP_USER_PASSWORD = "local-dev-password";
const DEFAULT_SERVER_PORT_BASE = 4100;
const DEFAULT_TEMPLATE_DATABASE = "book_by_book_e2e_template";
const DEFAULT_DATABASE_PREFIX = "book_by_book_e2e";
const DEFAULT_HEALTHCHECK_PATH = "/signin";
const QUIET_POSTGRES_OPTIONS = {
  onnotice() {
    // Test schema resets use many drop-if-exists statements.
  },
} as const;

export const E2E_POSTGRES_IMAGE = "postgres:18";
export const E2E_TEMPLATE_DATABASE = DEFAULT_TEMPLATE_DATABASE;
export const E2E_SERVER_ENV = {
  AUTH_SECRET: "book-by-book-e2e-auth-secret",
  E2E_BYPASS_AUTH: "1",
  GOOGLE_BOOKS_API_KEY: "book-by-book-e2e-google-books-api-key",
  GOOGLE_CLIENT_ID: "book-by-book-e2e-google-client-id",
  GOOGLE_CLIENT_SECRET: "book-by-book-e2e-google-client-secret",
  RATE_LIMIT_PROVIDER: "memory",
  RATE_LIMIT_CREATE_CLUB_LIMIT: "2",
} as const;

export type PlaywrightRuntimeState = {
  adminDatabaseUrl: string;
  containerId: string;
  templateDatabase: string;
};

export async function loadEnvFiles() {
  loadOptionalEnvFile(".env");
  loadOptionalEnvFile(".env.local");
}

export function readAppUserPassword() {
  return process.env.APP_USER_PASSWORD?.trim() || DEFAULT_APP_USER_PASSWORD;
}

function loadOptionalEnvFile(pathname: string) {
  try {
    process.loadEnvFile?.(pathname);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function writeRuntimeState(state: PlaywrightRuntimeState) {
  await mkdir(path.dirname(RUNTIME_STATE_PATH), { recursive: true });
  await writeFile(RUNTIME_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

export async function readRuntimeState() {
  const rawState = await readFile(RUNTIME_STATE_PATH, "utf8");
  return JSON.parse(rawState) as PlaywrightRuntimeState;
}

export async function clearRuntimeState() {
  await rm(RUNTIME_STATE_PATH, { force: true });
}

export async function runCommand(input: {
  command: string;
  args: string[];
  env?: Record<string, string | undefined>;
}) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(input.command, input.args, {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        ...input.env,
      },
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${input.command} ${input.args.join(" ")} exited with ${code ?? signal ?? "unknown status"}.`,
        ),
      );
    });
  });
}

export function createDatabaseUrl(baseUrl: string, databaseName: string) {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export function createWorkerDatabaseName(projectName: string, parallelIndex: number) {
  return truncateIdentifier(
    `${DEFAULT_DATABASE_PREFIX}_${slugifyProjectName(projectName)}_${parallelIndex}`,
  );
}

export function createWorkerServerPort(
  projectName: string,
  parallelIndex: number,
) {
  const hash = createHash("sha1").update(projectName).digest();
  const projectSlot = hash.readUInt16BE(0) % 1000;
  return DEFAULT_SERVER_PORT_BASE + projectSlot * 10 + parallelIndex;
}

export async function createDatabaseClone(input: {
  adminDatabaseUrl: string;
  databaseName: string;
  templateDatabase: string;
}) {
  const adminSql = postgres(input.adminDatabaseUrl, {
    max: 1,
    ...QUIET_POSTGRES_OPTIONS,
  });

  try {
    await dropDatabaseIfExists(adminSql, input.databaseName);
    await adminSql.unsafe(
      `create database ${quoteIdentifier(input.databaseName)} template ${quoteIdentifier(input.templateDatabase)}`,
    );
  } finally {
    await adminSql.end({ timeout: 5 });
  }
}

export async function dropDatabase(input: {
  adminDatabaseUrl: string;
  databaseName: string;
}) {
  const adminSql = postgres(input.adminDatabaseUrl, {
    max: 1,
    ...QUIET_POSTGRES_OPTIONS,
  });

  try {
    await dropDatabaseIfExists(adminSql, input.databaseName);
  } finally {
    await adminSql.end({ timeout: 5 });
  }
}

export async function applySchemaToDatabase(input: {
  adminDatabaseUrl: string;
  databaseName: string;
  appUserPassword: string;
}) {
  const schemaSql = await readSchemaSql(input.appUserPassword);
  const databaseUrl = createDatabaseUrl(input.adminDatabaseUrl, input.databaseName);
  const databaseSql = postgres(databaseUrl, {
    max: 1,
    ...QUIET_POSTGRES_OPTIONS,
  });

  try {
    await databaseSql.unsafe(schemaSql).simple();
  } finally {
    await databaseSql.end({ timeout: 5 });
  }
}

export async function waitForServerReady(input: {
  baseUrl: string;
  logs: string[];
  serverName: string;
  onExit: Promise<never>;
}) {
  const targetUrl = new URL(DEFAULT_HEALTHCHECK_PATH, input.baseUrl);
  const startedAt = Date.now();
  const timeoutMs = 120_000;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(targetUrl, {
        redirect: "manual",
      });

      if (response.status < 500) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await Promise.race([delay(500), input.onExit]);
  }

  throw new Error(
    `${input.serverName} did not become ready in time.\n${input.logs.join("")}`,
  );
}

async function dropDatabaseIfExists(
  adminSql: postgres.Sql,
  databaseName: string,
) {
  await terminateDatabaseConnections(adminSql, databaseName);
  await adminSql.unsafe(`drop database if exists ${quoteIdentifier(databaseName)}`);
}

async function terminateDatabaseConnections(
  adminSql: postgres.Sql,
  databaseName: string,
) {
  await adminSql`
    select pg_terminate_backend(pid)
    from pg_stat_activity
    where datname = ${databaseName}
      and pid <> pg_backend_pid()
  `;
}

async function readSchemaSql(appUserPassword: string) {
  const schemaSql = await readFile(SCHEMA_FILE_PATH, "utf8");
  return schemaSql.replaceAll(
    "$APP_USER_PASSWORD",
    appUserPassword.replaceAll("'", "''"),
  );
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function slugifyProjectName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function truncateIdentifier(identifier: string) {
  return identifier.slice(0, 63);
}
