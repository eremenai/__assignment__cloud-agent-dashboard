/**
 * Tests for StatusBadge component.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getStatusColor, StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("should render success status", () => {
    render(<StatusBadge status="success" />);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("should render fail status", () => {
    render(<StatusBadge status="fail" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("should render timeout status", () => {
    render(<StatusBadge status="timeout" />);
    expect(screen.getByText("Timeout")).toBeInTheDocument();
  });

  it("should render cancelled status", () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText("Canceled")).toBeInTheDocument();
  });

  it("should render custom label when provided", () => {
    render(<StatusBadge status="success" label="Completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("should apply correct CSS classes for success", () => {
    const { container } = render(<StatusBadge status="success" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-green-100");
  });

  it("should apply correct CSS classes for fail", () => {
    const { container } = render(<StatusBadge status="fail" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-red-100");
  });
});

describe("getStatusColor", () => {
  it("should return green for success", () => {
    const color = getStatusColor("success");
    expect(color).toContain("142"); // green hue
  });

  it("should return red for fail", () => {
    const color = getStatusColor("fail");
    expect(color).toContain("0"); // red hue
  });

  it("should return amber for timeout", () => {
    const color = getStatusColor("timeout");
    expect(color).toContain("45"); // amber hue
  });
});
