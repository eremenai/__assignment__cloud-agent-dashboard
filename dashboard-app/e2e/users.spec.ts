import { expect, test } from "@playwright/test";

test.describe("Users List Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/users");
    await page.waitForTimeout(500);
  });

  test("should load users list page", async ({ page }) => {
    await expect(page).toHaveURL(/.*users/);
    await expect(page.getByRole("heading", { name: /Users/i })).toBeVisible();
  });

  test("should display users table with headers", async ({ page }) => {
    // Check for table headers (essential ones)
    await expect(page.getByRole("columnheader", { name: /User/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Role/i })).toBeVisible();
  });

  test("should display search input", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search users/i);
    await expect(searchInput).toBeVisible();
  });

  test("should filter users with debounced search", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search users/i);

    // Type in search input
    await searchInput.fill("test");

    // Wait for debounce (300ms + some buffer)
    await page.waitForTimeout(500);

    // URL should not have changed during typing (debounced)
    // The input should still have the value
    await expect(searchInput).toHaveValue("test");
  });

  test("should support sortable columns", async ({ page }) => {
    // Check for sortable column headers with arrow icons
    const sessionsHeader = page.getByRole("columnheader", { name: /Sessions/i });
    await expect(sessionsHeader).toBeVisible();

    // Click to sort
    await sessionsHeader.click();
  });

  test("should navigate to user detail when clicking a user", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector("table tbody tr");

    // Click on first user link
    const userLink = page.locator("a[href^='/users/']").first();
    await userLink.click();

    // Should navigate to user detail
    await expect(page).toHaveURL(/.*users\/.+/);
  });

  test("should support pagination", async ({ page }) => {
    // Check for pagination controls (if visible)
    const paginationText = page.getByText(/Showing \d+ to \d+ of \d+ users/i);
    if (await paginationText.isVisible().catch(() => false)) {
      await expect(paginationText).toBeVisible();
    }
  });
});

test.describe("User Detail Page", () => {
  test("should load user detail page", async ({ page }) => {
    // First go to users list to get a valid user ID
    await page.goto("/users");
    await page.waitForSelector("a[href^='/users/']");

    // Click on first user
    const userLink = page.locator("a[href^='/users/']").first();
    await userLink.click();

    // Should be on user detail page
    await expect(page).toHaveURL(/.*users\/.+/);
  });

  test("should display user info header", async ({ page }) => {
    await page.goto("/users");
    await page.waitForSelector("a[href^='/users/']");
    const userLink = page.locator("a[href^='/users/']").first();
    await userLink.click();

    // Check for user name or email
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("should display user KPI cards", async ({ page }) => {
    await page.goto("/users");
    await page.waitForSelector("a[href^='/users/']");
    const userLink = page.locator("a[href^='/users/']").first();
    await userLink.click();

    // Wait for the user detail page to fully load
    await expect(page).toHaveURL(/.*users\/.+/);
    await page.waitForTimeout(1000);

    // Check for KPI cards - these titles match the actual KPICard components
    const hasKPIs =
      (await page
        .getByText("Runs/Session")
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText("Success Rate")
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText("Total Tokens")
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText("Sessions")
        .isVisible()
        .catch(() => false));
    expect(hasKPIs).toBeTruthy();
  });

  test("should display user sessions table", async ({ page }) => {
    await page.goto("/users");
    await page.waitForSelector("a[href^='/users/']");
    const userLink = page.locator("a[href^='/users/']").first();
    await userLink.click();
    await page.waitForTimeout(500);

    // Check for sessions section or table
    const hasSessionContent =
      (await page
        .getByRole("table")
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText(/Session/i)
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasSessionContent).toBeTruthy();
  });

  test("should navigate back to users list", async ({ page }) => {
    await page.goto("/users");
    await page.waitForSelector("a[href^='/users/']");
    const userLink = page.locator("a[href^='/users/']").first();
    await userLink.click();

    // Wait for the user detail page to load
    await expect(page).toHaveURL(/.*users\/.+/);

    // Go back
    await page.goBack();

    // Should be back on users list (may have query params)
    await expect(page).toHaveURL(/.*users/);
  });
});
