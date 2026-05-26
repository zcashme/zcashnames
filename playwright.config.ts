// Playwright E2E config: targets the local dev server at :3000,
// runs tests from ./tests with 2 retries and action timeouts.
// Only the Chromium project is enabled; fullyParallel is set
// but workers=1 ensures serial execution.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 1,
  retries: 2,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
