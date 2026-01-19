"use client";

/**
 * Trend area chart component for time series data.
 * Based on chart-area-interactive.tsx pattern.
 */

import { BarChart3, HelpCircle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  /** Format function for tooltip values - receives value and metric key */
  tooltipFormatter?: (value: number, metricKey: string) => string;
  /** Additional CSS classes for the card */
  className?: string;
  /** Extra content for the header (e.g., toggle buttons) */
  headerExtra?: React.ReactNode;
  /** Tooltip explaining what this chart shows */
  tooltip?: string;
  /** Keys that should use the secondary (right) Y-axis */
  secondaryAxisKeys?: string[];
  /** Format function for secondary Y axis values */
  secondaryYAxisFormatter?: (value: number) => string;
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
  headerExtra,
  tooltip,
  secondaryAxisKeys = [],
  secondaryYAxisFormatter,
}: TrendAreaChartProps) {
  const hasSecondaryAxis = secondaryAxisKeys.length > 0;
  const _primaryKeys = dataKeys.filter((key) => !secondaryAxisKeys.includes(key));
  const _secondaryKeys = dataKeys.filter((key) => secondaryAxisKeys.includes(key));

  const isEmpty = data.length === 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-1.5">
            {title}
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-4 cursor-help text-muted-foreground/60 hover:text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {headerExtra}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ height }}>
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-3 font-medium text-muted-foreground text-sm">No data available</p>
            <p className="mt-1 text-muted-foreground/70 text-xs">Data will appear here once available</p>
          </div>
        ) : (
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
                  formatter={
                    tooltipFormatter
                      ? (value, name, item) => {
                          const itemConfig = config[name as string];
                          const indicatorColor = item.color || item.payload?.fill;
                          return (
                            <div className="flex w-full items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: indicatorColor }}
                              />
                              <div className="flex flex-1 items-center justify-between leading-none">
                                <span className="text-muted-foreground">{itemConfig?.label || name}</span>
                                <span className="ml-2 font-medium font-mono text-foreground tabular-nums">
                                  {tooltipFormatter(Number(value), name as string)}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      : undefined
                  }
                  indicator="dot"
                />
              }
            />
            {dataKeys.map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                fill={`url(#fill-${key})`}
                stroke={`var(--color-${key})`}
                stackId={stacked ? "a" : undefined}
                yAxisId={secondaryAxisKeys.includes(key) ? "right" : "left"}
              />
            ))}
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
