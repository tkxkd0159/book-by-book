import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

import { INTEGRATION_APP_USER_PASSWORD } from "./test-env";

const ROOT_DIR = process.cwd();
const SCHEMA_FILE_PATH = path.join(ROOT_DIR, "db/schema/data.sql");
const RUNTIME_STATE_PATH = path.join(
  ROOT_DIR,
  "test-results",
  "vitest-integration-runtime-state.json",
);

const QUIET_POSTGRES_OPTIONS = {
  onnotice() {
    // Schema application emits many expected notices for create-if-not-exists DDL.
  },
} as const;

export type IntegrationRuntimeState = {
  containerId: string;
  databaseUrl: string;
};

export async function applySchemaToDatabase(databaseUrl: string) {
  const schemaSql = await readSchemaSql(INTEGRATION_APP_USER_PASSWORD);
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

export async function writeIntegrationRuntimeState(
  state: IntegrationRuntimeState,
) {
  await mkdir(path.dirname(RUNTIME_STATE_PATH), { recursive: true });
  await writeFile(RUNTIME_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

export async function readIntegrationRuntimeState() {
  const rawState = await readFile(RUNTIME_STATE_PATH, "utf8");
  return JSON.parse(rawState) as IntegrationRuntimeState;
}

export async function clearIntegrationRuntimeState() {
  await rm(RUNTIME_STATE_PATH, { force: true });
}

async function readSchemaSql(appUserPassword: string) {
  const schemaSql = await readFile(SCHEMA_FILE_PATH, "utf8");
  return schemaSql.replaceAll(
    "$APP_USER_PASSWORD",
    appUserPassword.replaceAll("'", "''"),
  );
}
