import path from "node:path";

import { defineConfig } from "vitest/config";

process.loadEnvFile?.(".env.local");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    maxWorkers: 1,
  },
});
