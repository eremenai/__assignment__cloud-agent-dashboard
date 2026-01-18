"use client";

/**
 * Reliability section showing failure breakdown as stacked bar chart.
 */

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatPercent } from "@/lib/format";
import type { FailureCategoryCount, MultiSeriesPoint } from "@/lib/types/domain";

interface ReliabilitySectionProps {
  reliabilityBreakdown: MultiSeriesPoint[];
  failures: {
    categories: FailureCategoryCount[];
    totalFailures: number;
  };
  className?: string;
}

const chartConfig: ChartConfig = {
  errors: {
    label: "Errors",
    color: "var(--chart-1)", // red-ish
  },
  timeouts: {
    label: "Timeouts",
    color: "var(--chart-4)", // orange-ish
  },
  cancels: {
    label: "Cancels",
    color: "var(--chart-5)", // gray-ish
  },
};

const failureCategoryLabels: Record<string, string> = {
  timeout: "Timeout",
  tool_error: "Tool Error",
  model_error: "Model Error",
  unknown: "Unknown",
  // Legacy uppercase values for backwards compatibility
  TIMEOUT: "Timeout",
  RATE_LIMIT: "Rate Limit",
  CONTEXT_LENGTH: "Context Length",
  TOOL_ERROR: "Tool Error",
  VALIDATION_ERROR: "Validation Error",
  INTERNAL_ERROR: "Internal Error",
  USER_CANCELED: "User Canceled",
};

export function ReliabilitySection({ reliabilityBreakdown, failures, className }: ReliabilitySectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Reliability</CardTitle>
        <CardDescription>Failures and cancellations over time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stacked Bar Chart for failures */}
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart data={reliabilityBreakdown}>
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
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="errors" stackId="a" fill="var(--color-errors)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="timeouts" stackId="a" fill="var(--color-timeouts)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="cancels" stackId="a" fill="var(--color-cancels)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>

        {/* Failure Categories Table */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Top Failure Categories</h4>
          {failures.totalFailures === 0 ? (
            <p className="text-muted-foreground text-sm">No failures in this period</p>
          ) : (
            <div className="space-y-1">
              {failures.categories.slice(0, 5).map((category) => (
                <div key={category.category} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {failureCategoryLabels[category.category] ?? category.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.count}</span>
                    <span className="text-muted-foreground">({formatPercent(category.percentage)})</span>
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
