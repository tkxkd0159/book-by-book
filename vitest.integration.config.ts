import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: "./tests/support/integration-global-setup.ts",
    include: [
      "tests/integration/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    maxWorkers: 1,
    setupFiles: ["./tests/support/integration-test-setup.ts"],
  },
});
