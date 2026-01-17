"use client";

/**
 * Cost trends chart showing cost over time.
 */

import { TrendAreaChart, type TrendDataPoint } from "@/components/charts";
import type { ChartConfig } from "@/components/ui/chart";
import type { TimeSeriesPoint } from "@/lib/types/domain";
import { formatCurrency } from "@/lib/format";

interface CostTrendsChartProps {
	costData: TimeSeriesPoint[];
	className?: string;
}

const chartConfig: ChartConfig = {
	cost: {
		label: "Cost",
		color: "var(--chart-3)",
	},
};

export function CostTrendsChart({ costData, className }: CostTrendsChartProps) {
	const data: TrendDataPoint[] = costData.map((point) => ({
		date: point.date,
		cost: Math.round(point.value) / 100, // Convert cents to dollars
	}));

	return (
		<TrendAreaChart
			title="Cost Trends"
			description="Total cost over time"
			data={data}
			config={chartConfig}
			dataKeys={["cost"]}
			height={300}
			yAxisFormatter={(v) => formatCurrency(v)}
			tooltipFormatter={(v) => formatCurrency(v)}
			className={className}
		/>
	);
}
