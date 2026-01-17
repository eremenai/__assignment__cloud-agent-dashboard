"use client";

/**
 * Reliability section showing success rate trend and top failure categories.
 */

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { TimeSeriesPoint, FailureCategoryCount } from "@/lib/types/domain";
import { formatPercent } from "@/lib/format";

interface ReliabilitySectionProps {
	reliabilityData: TimeSeriesPoint[];
	failures: {
		categories: FailureCategoryCount[];
		totalFailures: number;
	};
	className?: string;
}

const chartConfig: ChartConfig = {
	successRate: {
		label: "Success Rate",
		color: "var(--chart-1)",
	},
};

const failureCategoryLabels: Record<string, string> = {
	TIMEOUT: "Timeout",
	RATE_LIMIT: "Rate Limit",
	CONTEXT_LENGTH: "Context Length",
	TOOL_ERROR: "Tool Error",
	VALIDATION_ERROR: "Validation Error",
	INTERNAL_ERROR: "Internal Error",
	USER_CANCELED: "User Canceled",
};

export function ReliabilitySection({
	reliabilityData,
	failures,
	className,
}: ReliabilitySectionProps) {
	const chartData = reliabilityData.map((point) => ({
		date: point.date,
		successRate: Math.round(point.value * 10) / 10,
	}));

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>Reliability</CardTitle>
				<CardDescription>Success rate trend and failure breakdown</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Success Rate Chart */}
				<ChartContainer config={chartConfig} className="h-48 w-full">
					<LineChart data={chartData}>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								});
							}}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							domain={[80, 100]}
							tickFormatter={(v) => `${v}%`}
							width={50}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={(value) => {
										return new Date(value).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										});
									}}
									formatter={(value) => `${value}%`}
									indicator="line"
								/>
							}
						/>
						<Line
							dataKey="successRate"
							type="monotone"
							stroke="var(--color-successRate)"
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4 }}
						/>
					</LineChart>
				</ChartContainer>

				{/* Failure Categories Table */}
				<div className="space-y-2">
					<h4 className="text-sm font-medium">Top Failure Categories</h4>
					{failures.totalFailures === 0 ? (
						<p className="text-sm text-muted-foreground">No failures in this period</p>
					) : (
						<div className="space-y-1">
							{failures.categories.slice(0, 5).map((category) => (
								<div
									key={category.category}
									className="flex items-center justify-between text-sm"
								>
									<span className="text-muted-foreground">
										{failureCategoryLabels[category.category] ?? category.category}
									</span>
									<div className="flex items-center gap-2">
										<span className="font-medium">{category.count}</span>
										<span className="text-muted-foreground">
											({formatPercent(category.percentage)})
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
