/**
 * Tests for RoleBadge component.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { RoleBadge } from "../role-badge";

describe("RoleBadge", () => {
	it("should render MEMBER role", () => {
		render(<RoleBadge role="MEMBER" />);
		expect(screen.getByText("Member")).toBeInTheDocument();
	});

	it("should render MANAGER role", () => {
		render(<RoleBadge role="MANAGER" />);
		expect(screen.getByText("Manager")).toBeInTheDocument();
	});

	it("should render ORG_ADMIN role", () => {
		render(<RoleBadge role="ORG_ADMIN" />);
		expect(screen.getByText("Admin")).toBeInTheDocument();
	});

	it("should render SUPPORT role", () => {
		render(<RoleBadge role="SUPPORT" />);
		expect(screen.getByText("Support")).toBeInTheDocument();
	});

	it("should render SUPER_ADMIN role", () => {
		render(<RoleBadge role="SUPER_ADMIN" />);
		expect(screen.getByText("Super Admin")).toBeInTheDocument();
	});

	it("should render custom label when provided", () => {
		render(<RoleBadge role="MEMBER" label="Team Member" />);
		expect(screen.getByText("Team Member")).toBeInTheDocument();
	});

	it("should apply correct CSS classes for MEMBER", () => {
		const { container } = render(<RoleBadge role="MEMBER" />);
		const badge = container.querySelector("span");
		expect(badge).toHaveClass("bg-gray-100");
	});

	it("should apply correct CSS classes for ORG_ADMIN", () => {
		const { container } = render(<RoleBadge role="ORG_ADMIN" />);
		const badge = container.querySelector("span");
		expect(badge).toHaveClass("bg-purple-100");
	});

	it("should apply correct CSS classes for SUPER_ADMIN", () => {
		const { container } = render(<RoleBadge role="SUPER_ADMIN" />);
		const badge = container.querySelector("span");
		expect(badge).toHaveClass("bg-red-100");
	});
});
