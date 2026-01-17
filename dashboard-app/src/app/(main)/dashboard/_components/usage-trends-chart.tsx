"use client";

/**
 * Usage trends chart showing runs/sessions over time.
 */

import { TrendAreaChart, type TrendDataPoint } from "@/components/charts";
import type { ChartConfig } from "@/components/ui/chart";
import type { TimeSeriesPoint } from "@/lib/types/domain";

interface UsageTrendsChartProps {
	usageData: TimeSeriesPoint[];
	sessionsData: TimeSeriesPoint[];
	className?: string;
}

const chartConfig: ChartConfig = {
	runs: {
		label: "Runs",
		color: "var(--chart-1)",
	},
	sessions: {
		label: "Sessions",
		color: "var(--chart-2)",
	},
};

export function UsageTrendsChart({
	usageData,
	sessionsData,
	className,
}: UsageTrendsChartProps) {
	// Combine usage and sessions data into single data points
	const data: TrendDataPoint[] = usageData.map((point, idx) => ({
		date: point.date,
		runs: Math.round(point.value),
		sessions: Math.round(sessionsData[idx]?.value ?? point.value * 0.6),
	}));

	return (
		<TrendAreaChart
			title="Usage Trends"
			description="Runs and sessions over time"
			data={data}
			config={chartConfig}
			dataKeys={["runs", "sessions"]}
			stacked={false}
			height={300}
			className={className}
		/>
	);
}
