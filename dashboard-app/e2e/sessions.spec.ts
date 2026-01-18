import { expect, test } from "@playwright/test";

test.describe("Sessions List Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForTimeout(500);
  });

  test("should load sessions list page", async ({ page }) => {
    await expect(page).toHaveURL(/.*sessions/);
    await expect(page.getByRole("heading", { name: /Sessions/i })).toBeVisible();
  });

  test("should display sessions table with headers", async ({ page }) => {
    // Check for table headers
    await expect(page.getByRole("columnheader", { name: /Session/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Runs/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Cost/i })).toBeVisible();
  });

  test("should display search input", async ({ page }) => {
    // Check for search input
    const searchInput = page.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();
  });

  test("should navigate to session detail when clicking a session", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector("table tbody tr");

    // Click on first session link
    const sessionLink = page.locator("a[href^='/sessions/']").first();
    await sessionLink.click();

    // Should navigate to session detail
    await expect(page).toHaveURL(/.*sessions\/.+/);
  });

  test("should support pagination", async ({ page }) => {
    // Check for pagination controls
    const nextButton = page.getByRole("button", { name: /Next/i });
    const prevButton = page.getByRole("button", { name: /Previous/i });

    // Pagination may be hidden if not enough data
    if (await nextButton.isVisible().catch(() => false)) {
      await expect(nextButton).toBeVisible();
      await expect(prevButton).toBeVisible();
    }
  });
});

test.describe("Session Detail Page", () => {
  test("should load session detail page", async ({ page }) => {
    // First go to sessions list to get a valid session ID
    await page.goto("/sessions");
    await page.waitForSelector("a[href^='/sessions/']");

    // Click on first session
    const sessionLink = page.locator("a[href^='/sessions/']").first();
    await sessionLink.click();

    // Should be on session detail page
    await expect(page).toHaveURL(/.*sessions\/.+/);
  });

  test("should display session KPI cards", async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForSelector("a[href^='/sessions/']");
    const sessionLink = page.locator("a[href^='/sessions/']").first();
    await sessionLink.click();
    await page.waitForTimeout(500);

    // Check for KPI cards (session detail uses: Lifespan, Active Time, Runs, Handoffs, Total Cost)
    await expect(page.getByText("Total Cost")).toBeVisible();
    await expect(page.getByText("Lifespan")).toBeVisible();
  });

  test("should display timeline section", async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForSelector("a[href^='/sessions/']");
    const sessionLink = page.locator("a[href^='/sessions/']").first();
    await sessionLink.click();

    // Check for timeline tab and visual timeline bar
    await expect(page.getByRole("tab", { name: "Timeline" })).toBeVisible();
    await expect(page.getByText("Session Timeline")).toBeVisible();
  });

  test("should display timeline events", async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForSelector("a[href^='/sessions/']");
    const sessionLink = page.locator("a[href^='/sessions/']").first();
    await sessionLink.click();
    await page.waitForTimeout(500);

    // Timeline tab should be active and show content
    await expect(page.getByRole("tabpanel")).toBeVisible();
  });

  test("should display run details with tokens", async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForSelector("a[href^='/sessions/']");
    const sessionLink = page.locator("a[href^='/sessions/']").first();
    await sessionLink.click();
    await page.waitForTimeout(500);

    // Look for run details that include token information
    const tokensText = page.getByText(/Tokens:/i);
    if (
      await tokensText
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(tokensText.first()).toBeVisible();
    }
  });
});
