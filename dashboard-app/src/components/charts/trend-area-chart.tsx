"use client";

/**
 * Trend area chart component for time series data.
 * Based on chart-area-interactive.tsx pattern.
 */

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export interface TrendDataPoint {
	date: string;
	[key: string]: string | number;
}

interface TrendAreaChartProps {
	/** Chart title */
	title: string;
	/** Chart description */
	description?: string;
	/** Data points to display */
	data: TrendDataPoint[];
	/** Configuration for the data series */
	config: ChartConfig;
	/** Keys of the data series to display */
	dataKeys: string[];
	/** Whether to stack the areas */
	stacked?: boolean;
	/** Height of the chart in pixels */
	height?: number;
	/** Format function for Y axis values */
	yAxisFormatter?: (value: number) => string;
	/** Format function for tooltip values */
	tooltipFormatter?: (value: number) => string;
	/** Additional CSS classes for the card */
	className?: string;
}

export function TrendAreaChart({
	title,
	description,
	data,
	config,
	dataKeys,
	stacked = false,
	height = 300,
	yAxisFormatter = (v) => v.toString(),
	tooltipFormatter,
	className,
}: TrendAreaChartProps) {
	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer config={config} className="w-full" style={{ height }}>
					<AreaChart data={data}>
						<defs>
							{dataKeys.map((key) => (
								<linearGradient key={`fill-${key}`} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
									<stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
								</linearGradient>
							))}
						</defs>
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
							tickFormatter={yAxisFormatter}
							width={60}
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
									formatter={tooltipFormatter ? (value) => tooltipFormatter(Number(value)) : undefined}
									indicator="dot"
								/>
							}
						/>
						{dataKeys.map((key, index) => (
							<Area
								key={key}
								dataKey={key}
								type="monotone"
								fill={`url(#fill-${key})`}
								stroke={`var(--color-${key})`}
								stackId={stacked ? "a" : undefined}
							/>
						))}
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
