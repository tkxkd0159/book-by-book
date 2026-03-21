import { PostgreSqlContainer } from "@testcontainers/postgresql";

import {
  E2E_POSTGRES_IMAGE,
  E2E_SERVER_ENV,
  E2E_TEMPLATE_DATABASE,
  applySchemaToDatabase,
  createDatabaseClone,
  createDatabaseUrl,
  loadEnvFiles,
  readAppUserPassword,
  runCommand,
  writeRuntimeState,
} from "./helpers/runtime";

export default async function globalSetup() {
  await loadEnvFiles();

  const container = await new PostgreSqlContainer(E2E_POSTGRES_IMAGE)
    .withDatabase("postgres")
    .withUsername("postgres")
    .withPassword("postgres")
    .start();

  const adminDatabaseUrl = container.getConnectionUri();
  const appUserPassword = readAppUserPassword();
  const templateDatabaseUrl = createDatabaseUrl(
    adminDatabaseUrl,
    E2E_TEMPLATE_DATABASE,
  );

  try {
    await createDatabaseClone({
      adminDatabaseUrl,
      databaseName: E2E_TEMPLATE_DATABASE,
      templateDatabase: "postgres",
    });

    await applySchemaToDatabase({
      adminDatabaseUrl,
      databaseName: E2E_TEMPLATE_DATABASE,
      appUserPassword,
    });

    await runCommand({
      command: "pnpm",
      args: ["build"],
      env: {
        ...E2E_SERVER_ENV,
        DATABASE_URL: templateDatabaseUrl,
        NEXTAUTH_URL: "http://localhost:4100",
      },
    });

    await writeRuntimeState({
      adminDatabaseUrl,
      containerId: container.getId(),
      templateDatabase: E2E_TEMPLATE_DATABASE,
    });
  } catch (error) {
    await container.stop().catch(() => undefined);
    throw error;
  }
}
