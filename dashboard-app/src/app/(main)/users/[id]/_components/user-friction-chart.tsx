"use client";

/**
 * User friction trend chart (runs per session and handoff rate).
 */

import { TrendLineChart, type TrendDataPoint } from "@/components/charts";
import type { ChartConfig } from "@/components/ui/chart";
import type { MultiSeriesPoint } from "@/lib/types/domain";

interface UserFrictionChartProps {
	data: MultiSeriesPoint[];
}

const chartConfig: ChartConfig = {
	avgRunsPerSession: {
		label: "Runs/Session",
		color: "var(--chart-4)",
	},
	handoffRate: {
		label: "Handoff %",
		color: "var(--chart-5)",
	},
};

export function UserFrictionChart({ data }: UserFrictionChartProps) {
	const chartData: TrendDataPoint[] = data.map((point) => ({
		date: point.date,
		avgRunsPerSession: Math.round((Number(point.avgRunsPerSession) || 0) * 10) / 10,
		handoffRate: Math.round(Number(point.handoffRate) || 0),
	}));

	return (
		<TrendLineChart
			title="Friction Indicators"
			description="Runs per session and handoff rate over time"
			data={chartData}
			config={chartConfig}
			dataKeys={["avgRunsPerSession", "handoffRate"]}
			height={250}
			showLegend
		/>
	);
}
