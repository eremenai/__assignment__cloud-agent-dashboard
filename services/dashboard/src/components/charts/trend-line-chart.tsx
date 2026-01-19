"use client";

/**
 * Trend line chart component for time series data.
 */

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import type { TrendDataPoint } from "./trend-area-chart";

interface TrendLineChartProps {
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
  /** Height of the chart in pixels */
  height?: number;
  /** Format function for Y axis values */
  yAxisFormatter?: (value: number) => string;
  /** Format function for tooltip values */
  tooltipFormatter?: (value: number) => string;
  /** Show legend */
  showLegend?: boolean;
  /** Additional CSS classes for the card */
  className?: string;
  /** Keys that should use the secondary (right) Y-axis */
  secondaryAxisKeys?: string[];
  /** Format function for secondary Y axis values */
  secondaryYAxisFormatter?: (value: number) => string;
}

export function TrendLineChart({
  title,
  description,
  data,
  config,
  dataKeys,
  height = 300,
  yAxisFormatter = (v) => v.toString(),
  tooltipFormatter,
  showLegend = false,
  className,
  secondaryAxisKeys = [],
  secondaryYAxisFormatter,
}: TrendLineChartProps) {
  const hasSecondaryAxis = secondaryAxisKeys.length > 0;
  const isEmpty = data.length === 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ height }}>
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-3 font-medium text-muted-foreground text-sm">No data available</p>
            <p className="mt-1 text-muted-foreground/70 text-xs">Data will appear here once available</p>
          </div>
        ) : (
        <ChartContainer config={config} className="w-full" style={{ height }}>
          <LineChart data={data}>
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
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={yAxisFormatter}
              width={60}
            />
            {hasSecondaryAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={secondaryYAxisFormatter || yAxisFormatter}
                width={60}
              />
            )}
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
                  indicator="line"
                />
              }
            />
            {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            {dataKeys.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                yAxisId={secondaryAxisKeys.includes(key) ? "right" : "left"}
              />
            ))}
          </LineChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
