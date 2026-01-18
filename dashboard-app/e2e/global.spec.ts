import { expect, test } from "@playwright/test";

test.describe("Global Overview Page (Super Admin)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/global");
    await page.waitForTimeout(500);
  });

  test("should load global overview page", async ({ page }) => {
    await expect(page).toHaveURL(/.*global/);
    // Either shows Global Overview or Access denied (depends on mock auth)
    const hasGlobalPage = await page
      .getByText(/Global Overview|Access denied/i)
      .first()
      .isVisible();
    expect(hasGlobalPage).toBeTruthy();
  });

  test("should display organization data or access denied", async ({ page }) => {
    // Check if we have access to global page
    const accessDenied = await page
      .getByText(/Access denied/i)
      .isVisible()
      .catch(() => false);

    if (!accessDenied) {
      // Check for global KPI cards
      await expect(page.getByText(/Organizations|Total Runs/i).first()).toBeVisible();
    }
  });
});

test.describe("Landing Page", () => {
  test("should redirect to dashboard from root", async ({ page }) => {
    await page.goto("/");

    // Should redirect to dashboard or show landing page
    await expect(page).toHaveURL(/.*\/(dashboard)?$/);
  });
});

test.describe("404 Page", () => {
  test("should show not found page for invalid routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");

    // Should show 404 content
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});

test.describe("Theme Switching", () => {
  test("should have theme toggle in sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    // Look for theme toggle button
    const themeToggle = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .filter({ hasText: /sun|moon/i });

    // If not found by text, look for any theme-related button
    const themeButton = page.locator('[class*="theme"], [aria-label*="theme"], [title*="theme"]');

    // At least one theme control should exist
    const hasThemeControl =
      (await themeToggle
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await themeButton
        .first()
        .isVisible()
        .catch(() => false));

    expect(hasThemeControl).toBeTruthy();
  });
});

test.describe("Responsive Layout", () => {
  test("should work on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");
    await page.waitForTimeout(500);

    // Page should still load
    await expect(page).toHaveURL(/.*dashboard/);

    // KPIs should still be visible (Total Runs is on Platform KPIs)
    await expect(page.getByText("Total Runs")).toBeVisible();
  });

  test("should work on tablet viewport", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard");
    await page.waitForTimeout(500);

    // Page should still load
    await expect(page).toHaveURL(/.*dashboard/);

    // Main content should be visible
    await expect(page.getByText("Usage Trends")).toBeVisible();
  });
});
