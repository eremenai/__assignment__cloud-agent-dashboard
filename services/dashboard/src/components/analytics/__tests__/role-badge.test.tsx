/**
 * Tests for RoleBadge component.
 *
 * Note: biome-ignore comments below suppress false positives where biome
 * misinterprets our custom "role" prop as the ARIA "role" attribute.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoleBadge } from "../role-badge";

describe("RoleBadge", () => {
  it("should render member role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="member" />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("should render manager role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="manager" />);
    expect(screen.getByText("Manager")).toBeInTheDocument();
  });

  it("should render admin role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="admin" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("should render support role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="support" />);
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("should render super_admin role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="super_admin" />);
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("should render custom label when provided", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="member" label="Team Member" />);
    expect(screen.getByText("Team Member")).toBeInTheDocument();
  });

  it("should apply correct CSS classes for member", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    const { container } = render(<RoleBadge role="member" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-gray-100");
  });

  it("should apply correct CSS classes for admin", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    const { container } = render(<RoleBadge role="admin" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-purple-100");
  });

  it("should apply correct CSS classes for super_admin", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    const { container } = render(<RoleBadge role="super_admin" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-red-100");
  });
});
