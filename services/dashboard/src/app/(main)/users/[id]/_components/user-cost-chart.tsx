"use client";

/**
 * User cost trend chart.
 */

import { TrendAreaChart, type TrendDataPoint } from "@/components/charts";
import type { ChartConfig } from "@/components/ui/chart";
import type { TimeSeriesPoint } from "@/lib/types/domain";

interface UserCostChartProps {
  data: TimeSeriesPoint[];
}

const chartConfig: ChartConfig = {
  cost: {
    label: "Cost ($)",
    color: "var(--chart-3)",
  },
};

export function UserCostChart({ data }: UserCostChartProps) {
  const chartData: TrendDataPoint[] = data.map((point) => ({
    date: point.date,
    cost: Math.round((point.value / 100) * 100) / 100, // Convert cents to dollars with 2 decimal places
  }));

  return (
    <TrendAreaChart
      title="Cost"
      description="Daily spending in dollars"
      data={chartData}
      config={chartConfig}
      dataKeys={["cost"]}
      height={250}
      yAxisFormatter={(v) => `$${v}`}
    />
  );
}
