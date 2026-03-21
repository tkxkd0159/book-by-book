import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

import teardownIntegrationDatabase from "./integration-global-teardown";
import {
  applySchemaToDatabase,
  clearIntegrationRuntimeState,
  writeIntegrationRuntimeState,
} from "./integration-runtime";
import {
  INTEGRATION_DATABASE_NAME,
  INTEGRATION_DATABASE_PASSWORD,
  INTEGRATION_DATABASE_USERNAME,
  INTEGRATION_POSTGRES_IMAGE,
} from "./test-env";

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer(INTEGRATION_POSTGRES_IMAGE)
    .withDatabase(INTEGRATION_DATABASE_NAME)
    .withUsername(INTEGRATION_DATABASE_USERNAME)
    .withPassword(INTEGRATION_DATABASE_PASSWORD)
    .start();

  const databaseUrl = container.getConnectionUri();

  try {
    await applySchemaToDatabase(databaseUrl);
    await writeIntegrationRuntimeState({
      containerId: container.getId(),
      databaseUrl,
    });
    project.provide("integrationDatabaseUrl", databaseUrl);
  } catch (error) {
    await container.stop().catch(() => undefined);
    await clearIntegrationRuntimeState().catch(() => undefined);
    throw error;
  }

  return async () => {
    await teardownIntegrationDatabase();
  };
}
