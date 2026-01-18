"use client";

/**
 * Usage trends chart showing runs/sessions/active users over time.
 */

import { useState } from "react";

import { TrendAreaChart, type TrendDataPoint } from "@/components/charts";
import type { ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TimeSeriesPoint } from "@/lib/types/domain";

interface UsageTrendsChartProps {
  usageData: TimeSeriesPoint[];
  sessionsData: TimeSeriesPoint[];
  activeUsersData?: TimeSeriesPoint[];
  className?: string;
}

type UsageMetric = "runs" | "sessions" | "activeUsers";

const allChartConfig: ChartConfig = {
  runs: {
    label: "Runs",
    color: "var(--chart-1)",
  },
  sessions: {
    label: "Sessions",
    color: "var(--chart-2)",
  },
  activeUsers: {
    label: "Active Users",
    color: "var(--chart-4)",
  },
};

export function UsageTrendsChart({ usageData, sessionsData, activeUsersData, className }: UsageTrendsChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<UsageMetric[]>(["runs", "sessions"]);

  // Combine all data into single data points
  const data: TrendDataPoint[] = usageData.map((point, idx) => ({
    date: point.date,
    runs: Math.round(point.value),
    sessions: Math.round(sessionsData[idx]?.value ?? point.value * 0.6),
    activeUsers: Math.round(activeUsersData?.[idx]?.value ?? 5),
  }));

  // Build config for selected metrics only
  const chartConfig: ChartConfig = {};
  for (const metric of selectedMetrics) {
    chartConfig[metric] = allChartConfig[metric];
  }

  const handleMetricToggle = (values: string[]) => {
    if (values.length > 0) {
      setSelectedMetrics(values as UsageMetric[]);
    }
  };

  return (
    <TrendAreaChart
      title="Usage Trends"
      description="Activity volume over time"
      tooltip="Track daily runs, sessions, and active users to understand platform adoption and engagement patterns."
      data={data}
      config={chartConfig}
      dataKeys={selectedMetrics}
      stacked={false}
      height={300}
      className={className}
      headerExtra={
        <ToggleGroup type="multiple" value={selectedMetrics} onValueChange={handleMetricToggle} className="gap-1">
          <ToggleGroupItem value="runs" size="sm" className="h-7 px-2.5 text-xs">
            Runs
          </ToggleGroupItem>
          <ToggleGroupItem value="sessions" size="sm" className="h-7 px-2.5 text-xs">
            Sessions
          </ToggleGroupItem>
          <ToggleGroupItem value="activeUsers" size="sm" className="h-7 px-2.5 text-xs">
            Active Users
          </ToggleGroupItem>
        </ToggleGroup>
      }
    />
  );
}
