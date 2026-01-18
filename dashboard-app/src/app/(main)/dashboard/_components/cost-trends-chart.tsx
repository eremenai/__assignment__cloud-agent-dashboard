"use client";

/**
 * Cost trends chart showing cost/cost per run/tokens over time.
 * Supports multiple metrics visible simultaneously.
 */

import { useState } from "react";

import { TrendAreaChart, type TrendDataPoint } from "@/components/charts";
import type { ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { TimeSeriesPoint } from "@/lib/types/domain";

interface CostTrendsChartProps {
  costData: TimeSeriesPoint[];
  costPerRunData?: TimeSeriesPoint[];
  tokensData?: TimeSeriesPoint[];
  className?: string;
}

type CostMetric = "cost" | "costPerRun" | "tokens";

const allChartConfig: ChartConfig = {
  cost: {
    label: "Total Cost",
    color: "var(--chart-3)",
  },
  costPerRun: {
    label: "Cost/Run",
    color: "var(--chart-5)",
  },
  tokens: {
    label: "Tokens",
    color: "var(--chart-2)",
  },
};

export function CostTrendsChart({ costData, costPerRunData, tokensData, className }: CostTrendsChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<CostMetric[]>(["cost"]);

  // Combine all data into single data points
  const data: TrendDataPoint[] = costData.map((point, idx) => ({
    date: point.date,
    cost: Math.round(point.value) / 100, // Convert cents to dollars
    costPerRun: costPerRunData ? Math.round(costPerRunData[idx]?.value ?? 0) / 100 : 0,
    tokens: tokensData ? Math.round(tokensData[idx]?.value ?? 0) : 0,
  }));

  // Build config for selected metrics
  const chartConfig: ChartConfig = {};
  for (const metric of selectedMetrics) {
    chartConfig[metric] = allChartConfig[metric];
  }

  // Primary Y-axis formatter for cost metrics
  const yAxisFormatter = (v: number) => formatCurrency(v);

  // Secondary Y-axis formatter for tokens
  const secondaryYAxisFormatter = (v: number) => formatNumber(v);

  // Tooltip formatter - choose format based on metric type
  const tooltipFormatter = (v: number, metricKey: string) => {
    if (metricKey === "tokens") {
      return formatNumber(v);
    }
    return formatCurrency(v);
  };

  // Determine if tokens is selected to show secondary axis
  const hasTokensSelected = selectedMetrics.includes("tokens");

  const handleMetricToggle = (values: string[]) => {
    if (values.length > 0) {
      setSelectedMetrics(values as CostMetric[]);
    }
  };

  return (
    <TrendAreaChart
      title="Cost Trends"
      description="Spending and token consumption over time"
      data={data}
      config={chartConfig}
      dataKeys={selectedMetrics}
      stacked={false}
      height={300}
      yAxisFormatter={yAxisFormatter}
      tooltipFormatter={tooltipFormatter}
      className={className}
      tooltip="Track spending and token consumption trends. Toggle metrics to compare cost, cost per run, and token usage over time."
      secondaryAxisKeys={hasTokensSelected ? ["tokens"] : []}
      secondaryYAxisFormatter={secondaryYAxisFormatter}
      headerExtra={
        <ToggleGroup type="multiple" value={selectedMetrics} onValueChange={handleMetricToggle} className="gap-1">
          <ToggleGroupItem value="cost" size="sm" className="h-7 px-2.5 text-xs">
            Cost
          </ToggleGroupItem>
          <ToggleGroupItem value="costPerRun" size="sm" className="h-7 px-2.5 text-xs">
            Cost/Run
          </ToggleGroupItem>
          <ToggleGroupItem value="tokens" size="sm" className="h-7 px-2.5 text-xs">
            Tokens
          </ToggleGroupItem>
        </ToggleGroup>
      }
    />
  );
}
