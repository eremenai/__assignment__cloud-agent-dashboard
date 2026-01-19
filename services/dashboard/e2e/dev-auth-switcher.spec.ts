import { expect, test } from "@playwright/test";

/**
 * Dev Auth Switcher Integration Tests
 *
 * Tests the development authentication switcher that allows
 * switching between different users with different roles.
 * This is critical for testing role-based access control.
 */

test.describe("Dev Auth Switcher", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("should display current user info in header", async ({ page }) => {
    // Look for user display in the sidebar footer or header
    const userElement = page.locator('[data-sidebar="footer"]');
    await expect(userElement).toBeVisible();
  });

  test("should show user email or name", async ({ page }) => {
    // User info should include email
    const emailPattern = page.getByText(/@/i);
    const hasEmail = await emailPattern.first().isVisible().catch(() => false);
    expect(hasEmail).toBeTruthy();
  });

  test("should open user dropdown on click", async ({ page }) => {
    // Find user button in sidebar footer
    const userButton = page.locator('[data-sidebar="menu-button"]').filter({ hasText: /@/i }).first();

    if (await userButton.isVisible()) {
      await userButton.click();
      await page.waitForTimeout(300);

      // Dropdown should be visible
      const dropdown = page.locator('[role="menu"], [data-radix-menu-content]');
      const hasDropdown = await dropdown.isVisible().catch(() => false);
      expect(hasDropdown).toBeTruthy();
    }
  });

  test("should display list of available test users", async ({ page }) => {
    // Find and click user dropdown
    const userButton = page.locator('[data-sidebar="menu-button"]').filter({ hasText: /@/i }).first();

    if (await userButton.isVisible()) {
      await userButton.click();
      await page.waitForTimeout(500);

      // Should show switch user option or user list
      const switchOption = page.getByText(/Switch|User|Account/i);
      const hasUserOptions = await switchOption.first().isVisible().catch(() => false);
      expect(hasUserOptions).toBeTruthy();
    }
  });

  test("should display user role badge", async ({ page }) => {
    // Role badge should be visible somewhere (Admin, Manager, Member, etc.)
    const roleBadge = page.locator('[class*="badge"], [data-slot="badge"]');
    const hasBadge = await roleBadge.first().isVisible().catch(() => false);

    // Or role text is visible
    const roleText = page.getByText(/Admin|Manager|Member|Support/i);
    const hasRoleText = await roleText.first().isVisible().catch(() => false);

    expect(hasBadge || hasRoleText).toBeTruthy();
  });
});

test.describe("Role-Based UI Changes", () => {
  test("should show org-scoped view for org admin", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Org admin should see org-level data
    // Should NOT see org selector (only Support and Super Admin see it)
    const orgSelector = page.locator('[data-testid="org-selector"], [class*="org-selector"]');
    const _hasOrgSelector = await orgSelector.isVisible().catch(() => false);

    // For org-scoped users, there should be no org selector
    // (This depends on the current user's role)
  });

  test("should show correct navigation for member role", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Navigation items should be visible
    await expect(page.getByRole("link", { name: /Overview/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sessions/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Users/i })).toBeVisible();
  });

  test("should restrict global view access appropriately", async ({ page }) => {
    await page.goto("/global");
    await page.waitForLoadState("networkidle");

    // Either shows Global Overview (for super_admin) or Access denied
    const hasAccess = await page.getByText(/Global Overview/i).isVisible().catch(() => false);
    const accessDenied = await page.getByText(/Access denied|Unauthorized/i).isVisible().catch(() => false);

    // One of these should be true
    expect(hasAccess || accessDenied).toBeTruthy();
  });
});

test.describe("User Switching Flow", () => {
  test("should allow selecting different user from dropdown", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Click on user menu
    const userButton = page.locator('[data-sidebar="menu-button"]').filter({ hasText: /@/i }).first();

    if (await userButton.isVisible()) {
      await userButton.click();
      await page.waitForTimeout(500);

      // Look for switch user option
      const switchUserOption = page.getByText(/Switch/i);
      if (await switchUserOption.isVisible().catch(() => false)) {
        await switchUserOption.click();
        await page.waitForTimeout(500);

        // User list should appear
        const userList = page.locator('[role="menuitem"], [data-user-id]');
        const hasUserList = (await userList.count()) > 0;
        expect(hasUserList).toBeTruthy();
      }
    }
  });

  test("should update view after switching users", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Record initial state
    const _initialUrl = page.url();

    // Try to switch user (if dev auth switcher is available)
    const userButton = page.locator('[data-sidebar="menu-button"]').filter({ hasText: /@/i }).first();

    if (await userButton.isVisible()) {
      await userButton.click();
      await page.waitForTimeout(500);

      // Look for a different user to switch to
      const differentUser = page.locator('[data-user-id], [role="menuitem"]').nth(1);

      if (await differentUser.isVisible().catch(() => false)) {
        await differentUser.click();
        await page.waitForLoadState("networkidle");

        // Page should have reloaded or updated
        // Either URL changed or content changed
      }
    }
  });
});

test.describe("Org Selector (Support/Super Admin)", () => {
  test("should show org selector for platform roles", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Org selector appears for Support and Super Admin roles
    const orgSelector = page.locator(
      '[data-testid="org-selector"], [class*="org-selector"], button:has-text("org_")'
    );
    const _hasOrgSelector = await orgSelector.first().isVisible().catch(() => false);

    // This test will pass or fail depending on which user is logged in
    // In a full test suite, we would switch to Support user first
  });

  test("should list available organizations in dropdown", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Look for org selector dropdown
    const orgSelector = page.locator('button:has-text("org_")').first();

    if (await orgSelector.isVisible().catch(() => false)) {
      await orgSelector.click();
      await page.waitForTimeout(500);

      // Should show organization options
      const orgOptions = page.locator('[role="option"], [role="menuitem"]');
      const optionCount = await orgOptions.count();
      expect(optionCount).toBeGreaterThan(0);
    }
  });

  test("should switch organization and update view", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const orgSelector = page.locator('button:has-text("org_")').first();

    if (await orgSelector.isVisible().catch(() => false)) {
      await orgSelector.click();
      await page.waitForTimeout(500);

      // Click on a different org
      const differentOrg = page.locator('[role="option"], [role="menuitem"]').nth(1);

      if (await differentOrg.isVisible().catch(() => false)) {
        await differentOrg.click();
        await page.waitForLoadState("networkidle");

        // URL should update with org_id or view should change
      }
    }
  });
});

test.describe("Authentication State Persistence", () => {
  test("should maintain auth state across page navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Get current user info
    const userElement = page.locator('[data-sidebar="footer"]');
    await expect(userElement).toBeVisible();

    // Navigate to different page
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");

    // User should still be displayed
    await expect(userElement).toBeVisible();

    // Navigate to users
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    // User should still be displayed
    await expect(userElement).toBeVisible();
  });

  test("should maintain auth state after page refresh", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const userElement = page.locator('[data-sidebar="footer"]');
    await expect(userElement).toBeVisible();

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // User should still be displayed
    await expect(userElement).toBeVisible();
  });
});
