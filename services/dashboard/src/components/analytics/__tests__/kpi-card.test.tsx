/**
 * Tests for KPICard component.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KPICard } from "../kpi-card";

describe("KPICard", () => {
  it("should render title and value", () => {
    render(<KPICard title="Total Runs" value="1,234" />);

    expect(screen.getByText("Total Runs")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("should render trend indicator when trend is provided", () => {
    render(<KPICard title="Success Rate" value="94.5%" trend={12.5} />);

    expect(screen.getByText("+12.5%")).toBeInTheDocument();
  });

  it("should render negative trend", () => {
    render(<KPICard title="Failed Runs" value="56" trend={-8.2} />);

    expect(screen.getByText("-8.2%")).toBeInTheDocument();
  });

  it("should render description and footer", () => {
    render(<KPICard title="Cost" value="$1,234" description="Total API costs" footer="vs last period" />);

    expect(screen.getByText("Total API costs")).toBeInTheDocument();
    expect(screen.getByText("vs last period")).toBeInTheDocument();
  });

  it("should show loading skeleton when isLoading is true", () => {
    const { container } = render(<KPICard title="Loading" value="..." isLoading={true} />);

    // Should not show actual content
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
    // Should have skeleton elements (using data-slot attribute)
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
