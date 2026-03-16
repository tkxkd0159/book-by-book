import { defineConfig, devices } from "@playwright/test";

const e2eBaseUrl = "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // These E2E suites share one dev server and one mutable fixture database.
  // Cross-project concurrency lets one browser reset state out from under another.
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: e2eBaseUrl,
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
  webServer: {
    command: "pnpm exec next dev --port 3100",
    url: `${e2eBaseUrl}/signin`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL:
        "postgresql://postgres:postgres@localhost:54329/book_by_book_local",
      E2E_BYPASS_AUTH: "1",
      NEXTAUTH_URL: e2eBaseUrl,
      RATE_LIMIT_PROVIDER: "memory",
      RATE_LIMIT_CREATE_CLUB_LIMIT: "2",
    },
  },
});
