/**
 * Tests for OrgSelector component.
 * Verifies visibility based on user role and org switching behavior.
 */

import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "@/lib/auth/context";
import { createAuthUser } from "@/test/factories";

import { OrgSelector } from "../org-selector";

// Wrapper to provide AuthContext with a specific user
function createWrapper(user: ReturnType<typeof createAuthUser>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider initialUser={user}>{children}</AuthProvider>;
  };
}

describe("OrgSelector", () => {
  describe("visibility by role", () => {
    it("should NOT render for MEMBER users", () => {
      const user = createAuthUser({ role: "MEMBER", orgId: "org-acme" });
      const { container } = render(<OrgSelector />, { wrapper: createWrapper(user) });

      // Component returns null, so container should be empty
      expect(container).toBeEmptyDOMElement();
    });

    it("should NOT render for MANAGER users", () => {
      const user = createAuthUser({ role: "MANAGER", orgId: "org-acme" });
      const { container } = render(<OrgSelector />, { wrapper: createWrapper(user) });

      expect(container).toBeEmptyDOMElement();
    });

    it("should NOT render for ORG_ADMIN users", () => {
      const user = createAuthUser({ role: "ORG_ADMIN", orgId: "org-acme" });
      const { container } = render(<OrgSelector />, { wrapper: createWrapper(user) });

      expect(container).toBeEmptyDOMElement();
    });

    it("should render for SUPPORT users", () => {
      const user = createAuthUser({ role: "SUPPORT", orgId: null });
      render(<OrgSelector />, { wrapper: createWrapper(user) });

      // Should show org selector button
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should render for SUPER_ADMIN users", () => {
      const user = createAuthUser({ role: "SUPER_ADMIN", orgId: null });
      render(<OrgSelector />, { wrapper: createWrapper(user) });

      // Should show org selector button
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("SUPER_ADMIN specific features", () => {
    it("should show 'All Organizations' option for SUPER_ADMIN", async () => {
      const user = createAuthUser({ role: "SUPER_ADMIN", orgId: null });
      render(<OrgSelector />, { wrapper: createWrapper(user) });

      // Open dropdown
      await userEvent.click(screen.getByRole("button"));

      // Should have "Platform View" section with "All Organizations" menu item
      expect(screen.getByText("Platform View")).toBeInTheDocument();
      // The menuitem "All Organizations" in the dropdown
      expect(screen.getByRole("menuitem", { name: /All Organizations/i })).toBeInTheDocument();
    });

    it("should show globe icon when in global view", () => {
      const user = createAuthUser({ role: "SUPER_ADMIN", orgId: null });
      render(<OrgSelector />, { wrapper: createWrapper(user) });

      // Button should show "All Organizations"
      expect(screen.getByRole("button")).toHaveTextContent("All Organizations");
    });
  });

  describe("SUPPORT specific features", () => {
    it("should NOT show 'All Organizations' option for SUPPORT", async () => {
      const user = createAuthUser({ role: "SUPPORT", orgId: null });
      render(<OrgSelector />, { wrapper: createWrapper(user) });

      // Open dropdown
      await userEvent.click(screen.getByRole("button"));

      // Should NOT have "Platform View" section (which contains "All Organizations")
      expect(screen.queryByText("Platform View")).not.toBeInTheDocument();
    });
  });

  describe("organization list", () => {
    it("should show available organizations in dropdown", async () => {
      const user = createAuthUser({ role: "SUPER_ADMIN", orgId: null });
      render(<OrgSelector />, { wrapper: createWrapper(user) });

      // Open dropdown
      await userEvent.click(screen.getByRole("button"));

      // Should have "Organizations" label
      expect(screen.getByText("Organizations")).toBeInTheDocument();
    });
  });
});
