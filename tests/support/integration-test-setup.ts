import { beforeEach, inject } from "vitest";

import { applyIntegrationTestEnv } from "./test-env";

const integrationDatabaseUrl = inject("integrationDatabaseUrl");

applyIntegrationTestEnv(integrationDatabaseUrl);

beforeEach(() => {
  applyIntegrationTestEnv(integrationDatabaseUrl);
});
