/**
 * Tests for EmptyState component.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { AlertCircle } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "../empty-state";

describe("EmptyState", () => {
  it("should render title", () => {
    render(<EmptyState title="No data available" />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    render(<EmptyState title="No sessions" description="There are no sessions in the selected time range." />);
    expect(screen.getByText("There are no sessions in the selected time range.")).toBeInTheDocument();
  });

  it("should render custom icon when provided", () => {
    render(<EmptyState title="Error" icon={<AlertCircle data-testid="custom-icon" />} />);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("should render action button when actionLabel and onAction are provided", () => {
    const handleAction = vi.fn();
    render(<EmptyState title="No data" actionLabel="Refresh" onAction={handleAction} />);

    const button = screen.getByRole("button", { name: "Refresh" });
    expect(button).toBeInTheDocument();
  });

  it("should call onAction when action button is clicked", () => {
    const handleAction = vi.fn();
    render(<EmptyState title="No data" actionLabel="Refresh" onAction={handleAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("should not render action button when only actionLabel is provided", () => {
    render(<EmptyState title="No data" actionLabel="Refresh" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
