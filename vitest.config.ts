import path from "node:path";

import { defineConfig } from "vitest/config";

loadOptionalEnvFile(".env.local");

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

function loadOptionalEnvFile(pathname: string) {
  try {
    process.loadEnvFile?.(pathname);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
