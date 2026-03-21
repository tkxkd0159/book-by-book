import { beforeEach } from "vitest";

import { applyUnitTestEnv } from "./test-env";

applyUnitTestEnv();

beforeEach(() => {
  applyUnitTestEnv();
});
