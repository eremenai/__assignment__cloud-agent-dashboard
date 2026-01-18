import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "../playwright/.auth/user.json");

/**
 * Setup test that logs in via mock-auth and saves the session state.
 * This state is then reused by all other tests.
 */
setup("authenticate", async ({ page }) => {
  // Navigate to mock-auth login which will auto-login and redirect
  // Using the callback parameter to redirect to dashboard
  const loginUrl = "http://localhost:3002/auth/login?callback=http://localhost:3000/dashboard";
  await page.goto(loginUrl);

  // Wait for redirect to complete (mock-auth auto-logs in as default user)
  await page.waitForURL(/.*localhost:3000.*/, { timeout: 30000 });

  // Wait for dashboard to load
  await page.waitForLoadState("networkidle");

  // Verify we're on the dashboard - use heading specifically
  await expect(page.getByRole("heading", { name: /Overview/i })).toBeVisible({ timeout: 15000 });

  // Save the authenticated state
  await page.context().storageState({ path: AUTH_FILE });
});
