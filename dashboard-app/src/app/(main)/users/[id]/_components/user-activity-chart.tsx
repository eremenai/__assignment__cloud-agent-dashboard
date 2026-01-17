"use client";

/**
 * User activity trend chart (runs and sessions over time).
 */

import { TrendAreaChart, type TrendDataPoint } from "@/components/charts";
import type { ChartConfig } from "@/components/ui/chart";
import type { MultiSeriesPoint } from "@/lib/types/domain";

interface UserActivityChartProps {
	data: MultiSeriesPoint[];
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

export function UserActivityChart({ data }: UserActivityChartProps) {
	const chartData: TrendDataPoint[] = data.map((point) => ({
		date: point.date,
		runs: Math.round(Number(point.runs) || 0),
		sessions: Math.round(Number(point.sessions) || 0),
	}));

	return (
		<TrendAreaChart
			title="Activity"
			description="Runs and sessions over time"
			data={chartData}
			config={chartConfig}
			dataKeys={["runs", "sessions"]}
			height={250}
		/>
	);
}
