import { test, expect } from "@playwright/test";

test.describe("Dashboard Overview Page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/dashboard");
		// Wait for page to load data
		await page.waitForTimeout(500);
	});

	test("should load dashboard page with KPI cards", async ({ page }) => {
		// Page should have loaded
		await expect(page).toHaveURL(/.*dashboard/);

		// Check for Platform KPI cards
		await expect(page.getByText("Total Runs")).toBeVisible();
		await expect(page.getByText("Success Rate")).toBeVisible();
		await expect(page.getByText("Total Cost")).toBeVisible();
		await expect(page.getByText("Total Tokens")).toBeVisible();
	});

	test("should display Usage Trends chart with toggles", async ({ page }) => {
		// Check for Usage Trends card
		await expect(page.getByText("Usage Trends")).toBeVisible();

		// Check for toggle buttons (using partial match for flexibility)
		await expect(page.locator("button", { hasText: "Runs" }).first()).toBeVisible();
		await expect(page.locator("button", { hasText: "Sessions" }).first()).toBeVisible();
	});

	test("should toggle Usage Trends metrics", async ({ page }) => {
		// Wait for chart to load
		await page.waitForSelector("text=Usage Trends");

		// Click Active Users toggle
		const activeUsersToggle = page.locator("button", { hasText: "Active Users" }).first();
		if (await activeUsersToggle.isVisible()) {
			await activeUsersToggle.click();
		}
	});

	test("should display Cost Trends chart with metric selector", async ({ page }) => {
		// Check for Cost Trends card
		await expect(page.getByText("Cost Trends")).toBeVisible();

		// Check for metric toggles
		await expect(page.locator("button", { hasText: "Tokens" }).first()).toBeVisible();
	});

	test("should switch Cost Trends metric", async ({ page }) => {
		// Wait for chart
		await page.waitForSelector("text=Cost Trends");

		// Click Tokens toggle
		const tokensToggle = page.locator("button", { hasText: "Tokens" }).first();
		await tokensToggle.click();
	});

	test("should display Reliability chart", async ({ page }) => {
		// Check for Reliability card
		await expect(page.getByText("Reliability")).toBeVisible();

		// Check for legend items (stacked bar chart)
		await expect(page.getByText("Errors")).toBeVisible();
		await expect(page.getByText("Timeouts")).toBeVisible();
	});

	test("should display Top Sessions table with sort dropdown", async ({ page }) => {
		// Check for Top Sessions card
		await expect(page.getByText("Top Sessions")).toBeVisible();

		// Check for View all link (first one is for sessions)
		await expect(page.getByRole("link", { name: /View all/i }).first()).toBeVisible();
	});

	test("should display Top Users table", async ({ page }) => {
		// Check for Top Users card
		await expect(page.getByText("Top Users")).toBeVisible();

		// Check for table content
		await expect(page.getByRole("columnheader", { name: /User/i })).toBeVisible();
	});
});

test.describe("Time Range Selector", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/dashboard");
	});

	test("should display time range selector", async ({ page }) => {
		// Check for time range button with calendar icon
		const timeRangeButton = page.locator("button").filter({ hasText: /Last \d+ days|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/ });
		await expect(timeRangeButton.first()).toBeVisible();
	});

	test("should open time range dropdown", async ({ page }) => {
		// Find and click the time range button
		const timeRangeButton = page.locator("button").filter({ hasText: /Last \d+ days/ }).first();
		await timeRangeButton.click();

		// Check for preset options in dropdown
		await expect(page.getByRole("menuitem", { name: /Last 7 days/i })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: /Last 30 days/i })).toBeVisible();
	});

	test("should select 30 day range and update URL", async ({ page }) => {
		// Open dropdown
		const timeRangeButton = page.locator("button").filter({ hasText: /Last \d+ days/ }).first();
		await timeRangeButton.click();

		// Select 30 days
		await page.getByRole("menuitem", { name: /Last 30 days/i }).click();

		// URL should have from and to params
		await expect(page).toHaveURL(/.*from=.*&to=.*/);
	});

	test("should open custom range picker dialog", async ({ page }) => {
		// Open dropdown
		const timeRangeButton = page.locator("button").filter({ hasText: /Last \d+ days/ }).first();
		await timeRangeButton.click();

		// Click custom range
		await page.getByRole("menuitem", { name: /Custom range/i }).click();

		// Dialog should open with title and calendar
		await expect(page.getByText("Select date range")).toBeVisible();
		await expect(page.locator("[data-slot='calendar']")).toBeVisible();
	});

	test("should select custom date range and apply", async ({ page }) => {
		// Open dropdown
		const timeRangeButton = page.locator("button").filter({ hasText: /Last \d+ days/ }).first();
		await timeRangeButton.click();

		// Click custom range
		await page.getByRole("menuitem", { name: /Custom range/i }).click();

		// Dialog should open
		await expect(page.getByText("Select date range")).toBeVisible();

		// Wait for the calendar to be visible
		await page.waitForSelector("[data-slot='calendar']");

		// Find day buttons within the calendar (they have data-day attribute)
		// Click day 5 as start date
		const day5 = page.locator("[data-slot='calendar'] button").filter({ hasText: /^5$/ }).first();
		await day5.click();

		// Give the calendar time to register the first click
		await page.waitForTimeout(200);

		// Click day 15 as end date
		const day15 = page.locator("[data-slot='calendar'] button").filter({ hasText: /^15$/ }).first();
		await day15.click();

		// Wait for Apply button to be enabled (indicates valid range)
		const applyButton = page.getByRole("button", { name: /Apply/i });
		await expect(applyButton).toBeEnabled({ timeout: 5000 });

		// Click apply
		await applyButton.click();

		// Dialog should close and URL should be updated
		await expect(page.getByText("Select date range")).not.toBeVisible();
		await expect(page).toHaveURL(/.*from=.*&to=.*/);
	});

	test("should reset selection on third click and select new range", async ({ page }) => {
		// Open dropdown
		const timeRangeButton = page.locator("button").filter({ hasText: /Last \d+ days/ }).first();
		await timeRangeButton.click();

		// Click custom range
		await page.getByRole("menuitem", { name: /Custom range/i }).click();

		// Dialog should open
		await expect(page.getByText("Select date range")).toBeVisible();
		await page.waitForSelector("[data-slot='calendar']");

		const applyButton = page.getByRole("button", { name: /Apply/i });

		// Click day 10 as first start date
		const day10 = page.locator("[data-slot='calendar'] button").filter({ hasText: /^10$/ }).first();
		await day10.click();
		await page.waitForTimeout(200);

		// Click day 15 as first end date
		const day15 = page.locator("[data-slot='calendar'] button").filter({ hasText: /^15$/ }).first();
		await day15.click();
		await page.waitForTimeout(200);

		// Apply should be enabled now (range 10-15 complete)
		await expect(applyButton).toBeEnabled();

		// Click day 19 - this should reset and start a new range
		const day19 = page.locator("[data-slot='calendar'] button").filter({ hasText: /^19$/ }).first();
		await day19.click();
		await page.waitForTimeout(200);

		// Apply should be disabled now (only start date selected)
		await expect(applyButton).toBeDisabled();

		// Click day 25 as new end date
		const day25 = page.locator("[data-slot='calendar'] button").filter({ hasText: /^25$/ }).first();
		await day25.click();
		await page.waitForTimeout(200);

		// Apply should be enabled again (range 19-25 complete)
		await expect(applyButton).toBeEnabled();

		// Apply and verify
		await applyButton.click();

		// Dialog should close
		await expect(page.getByText("Select date range")).not.toBeVisible();

		// URL should contain the date range (19 and 25)
		await expect(page).toHaveURL(/.*from=.*19.*&to=.*25.*/);
	});
});
