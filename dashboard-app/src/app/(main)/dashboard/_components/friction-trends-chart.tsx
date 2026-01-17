"use client";

/**
 * Friction trends chart showing runs/session and handoff rates over time.
 */

import { TrendLineChart } from "@/components/charts";
import type { ChartConfig } from "@/components/ui/chart";
import type { MultiSeriesPoint } from "@/lib/types/domain";

interface FrictionTrendsChartProps {
	frictionData: MultiSeriesPoint[];
	className?: string;
}

const chartConfig: ChartConfig = {
	avgRunsPerSession: {
		label: "Runs/Session",
		color: "var(--chart-4)",
	},
	handoffRate: {
		label: "Handoff Rate %",
		color: "var(--chart-5)",
	},
};

export function FrictionTrendsChart({
	frictionData,
	className,
}: FrictionTrendsChartProps) {
	const data = frictionData.map((point) => ({
		date: point.date,
		avgRunsPerSession: Math.round((point.avgRunsPerSession as number) * 10) / 10,
		handoffRate: Math.round(point.handoffRate as number),
	}));

	return (
		<TrendLineChart
			title="Friction Trends"
			description="Session friction metrics over time"
			data={data}
			config={chartConfig}
			dataKeys={["avgRunsPerSession", "handoffRate"]}
			showLegend={true}
			height={300}
			className={className}
		/>
	);
}
