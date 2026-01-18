import { defineConfig, devices } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "playwright/.auth/user.json");

/**
 * Playwright configuration for running E2E tests against Docker services.
 * Does not start a web server - expects services to be running via docker compose.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Setup project that handles authentication
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Main tests that depend on auth setup
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
      dependencies: ["setup"],
    },
  ],
  // No webServer - tests expect Docker services to be running
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
});
