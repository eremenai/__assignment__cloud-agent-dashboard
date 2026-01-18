import { test, expect } from "@playwright/test";

test.describe("Sidebar Navigation", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/dashboard");
	});

	test("should display sidebar with navigation items", async ({ page }) => {
		// Check for sidebar navigation items
		await expect(page.getByRole("link", { name: /Overview/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /Sessions/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /Users/i })).toBeVisible();
	});

	test("should navigate to Sessions page", async ({ page }) => {
		// Click Sessions link in sidebar menu button
		await page.locator('[data-sidebar="menu-button"]').filter({ hasText: "Sessions" }).click();

		// Should be on sessions page
		await expect(page).toHaveURL(/.*sessions/);
	});

	test("should navigate to Users page", async ({ page }) => {
		// Click Users link in sidebar menu button
		await page.locator('[data-sidebar="menu-button"]').filter({ hasText: "Users" }).click();

		// Should be on users page
		await expect(page).toHaveURL(/.*users/);
	});

	test("should preserve time range when navigating", async ({ page }) => {
		// First set a time range
		const timeRangeButton = page.locator("button").filter({ hasText: /Last \d+ days/ }).first();
		await timeRangeButton.click();
		await page.getByRole("menuitem", { name: /Last 30 days/i }).click();

		// Wait for URL to update
		await expect(page).toHaveURL(/.*from=.*&to=.*/);

		// Get the current from/to params
		const url = new URL(page.url());
		const fromParam = url.searchParams.get("from");
		const toParam = url.searchParams.get("to");

		// Navigate to Sessions (via sidebar menu button)
		await page.locator('[data-sidebar="menu-button"]').filter({ hasText: "Sessions" }).click();

		// Should preserve time range params
		await expect(page).toHaveURL(new RegExp(`from=${fromParam}`));
		await expect(page).toHaveURL(new RegExp(`to=${toParam}`));
	});
});

test.describe("Page Navigation Flow", () => {
	test("should navigate from dashboard to session detail", async ({ page }) => {
		await page.goto("/dashboard");
		await page.waitForTimeout(1000); // Wait for data to load

		// Click on a session link in the Top Sessions table (exclude sidebar links)
		const sessionLink = page.locator("table a[href^='/sessions/']").first();
		if (await sessionLink.isVisible().catch(() => false)) {
			await sessionLink.click();

			// Should be on session detail page
			await expect(page).toHaveURL(/.*sessions\/.+/);
			await expect(page.getByRole("tab", { name: "Timeline" })).toBeVisible();
		}
	});

	test("should navigate from dashboard to user detail", async ({ page }) => {
		await page.goto("/dashboard");
		await page.waitForTimeout(500);

		// Click on a user link in the Top Users table
		const userLink = page.locator("a[href^='/users/']").first();
		if (await userLink.isVisible()) {
			await userLink.click();

			// Should be on user detail page
			await expect(page).toHaveURL(/.*users\/.+/);
		}
	});

	test("should navigate back using browser back button", async ({ page }) => {
		await page.goto("/dashboard");

		// Navigate to Sessions (via sidebar menu button)
		await page.locator('[data-sidebar="menu-button"]').filter({ hasText: "Sessions" }).click();
		await expect(page).toHaveURL(/.*sessions/);

		// Go back
		await page.goBack();
		await expect(page).toHaveURL(/.*dashboard/);
	});
});
