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
  it("should render MEMBER role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="MEMBER" />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("should render MANAGER role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="MANAGER" />);
    expect(screen.getByText("Manager")).toBeInTheDocument();
  });

  it("should render ORG_ADMIN role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="ORG_ADMIN" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("should render SUPPORT role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="SUPPORT" />);
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("should render SUPER_ADMIN role", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="SUPER_ADMIN" />);
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("should render custom label when provided", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    render(<RoleBadge role="MEMBER" label="Team Member" />);
    expect(screen.getByText("Team Member")).toBeInTheDocument();
  });

  it("should apply correct CSS classes for MEMBER", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    const { container } = render(<RoleBadge role="MEMBER" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-gray-100");
  });

  it("should apply correct CSS classes for ORG_ADMIN", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    const { container } = render(<RoleBadge role="ORG_ADMIN" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-purple-100");
  });

  it("should apply correct CSS classes for SUPER_ADMIN", () => {
    // biome-ignore lint/a11y/useValidAriaRole: "role" is a custom prop, not ARIA role
    const { container } = render(<RoleBadge role="SUPER_ADMIN" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-red-100");
  });
});
