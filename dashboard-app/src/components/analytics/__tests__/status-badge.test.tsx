/**
 * Tests for StatusBadge component.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getStatusColor, StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("should render SUCCEEDED status", () => {
    render(<StatusBadge status="SUCCEEDED" />);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("should render FAILED status", () => {
    render(<StatusBadge status="FAILED" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("should render TIMEOUT status", () => {
    render(<StatusBadge status="TIMEOUT" />);
    expect(screen.getByText("Timeout")).toBeInTheDocument();
  });

  it("should render CANCELED status", () => {
    render(<StatusBadge status="CANCELED" />);
    expect(screen.getByText("Canceled")).toBeInTheDocument();
  });

  it("should render custom label when provided", () => {
    render(<StatusBadge status="SUCCEEDED" label="Completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("should apply correct CSS classes for SUCCEEDED", () => {
    const { container } = render(<StatusBadge status="SUCCEEDED" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-green-100");
  });

  it("should apply correct CSS classes for FAILED", () => {
    const { container } = render(<StatusBadge status="FAILED" />);
    const badge = container.querySelector("span");
    expect(badge).toHaveClass("bg-red-100");
  });
});

describe("getStatusColor", () => {
  it("should return green for SUCCEEDED", () => {
    const color = getStatusColor("SUCCEEDED");
    expect(color).toContain("142"); // green hue
  });

  it("should return red for FAILED", () => {
    const color = getStatusColor("FAILED");
    expect(color).toContain("0"); // red hue
  });

  it("should return amber for TIMEOUT", () => {
    const color = getStatusColor("TIMEOUT");
    expect(color).toContain("45"); // amber hue
  });
});
