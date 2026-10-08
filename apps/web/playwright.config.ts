import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run their own dev server against the test database (never the dev data).
 * Prepare it once with `npm run test:db:setup` from the repository root.
 */
const port = 3100;
const testDb =
  process.env.TEST_DATABASE_URL ?? "postgresql://vocab:vocab@localhost:5432/vocab_test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `next dev --port ${port}`,
    url: `http://localhost:${port}/signin`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: testDb, AUTH_DEV_LOGIN: "true", AUTH_URL: `http://localhost:${port}` },
  },
});
