import os from "node:os";

import { defineConfig, devices } from "@playwright/test";

const defaultWorkers = Math.max(
  1,
  Math.min(4, Math.floor(os.availableParallelism() / 2)),
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers:
    Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? "", 10) || defaultWorkers,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  reporter: process.env.CI ? "github" : "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Google Chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "Microsoft Edge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
      },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["iPhone 13"] },
    },
  ],
});
