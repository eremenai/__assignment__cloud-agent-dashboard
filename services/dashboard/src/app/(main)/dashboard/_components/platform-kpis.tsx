"use client";

/**
 * Platform KPIs section showing Total Runs, Success Rate, p95 Duration, Cost, and Tokens.
 */

import { KPICard, KPIRow } from "@/components/analytics";
import { useTimeRange } from "@/components/layout/time-range-selector";
import { formatCurrency, formatDateRange, formatDuration, formatNumber } from "@/lib/format";
import type { PlatformKPIs } from "@/lib/types/domain";

interface PlatformKPIsSectionProps {
  data: PlatformKPIs | null;
  isLoading?: boolean;
}

export function PlatformKPIsSection({ data, isLoading }: PlatformKPIsSectionProps) {
  const { from, to } = useTimeRange();
  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime() - 1);
  const previousPeriod = formatDateRange(prevFrom, prevTo);

  return (
    <KPIRow columns={5}>
      <KPICard
        title="Total Runs"
        value={data ? formatNumber(data.totalRuns.current) : "0"}
        trend={data?.totalRuns.changePercent}
        trendPreviousValue={data ? formatNumber(data.totalRuns.previous) : undefined}
        trendPreviousPeriod={previousPeriod}
        upIsGood={true}
        isLoading={isLoading}
        className="@container/card"
        tooltip="Total number of agent execution attempts within sessions during the selected period."
      />
      <KPICard
        title="Success Rate"
        value={data ? `${data.successRate.current.toFixed(1)}%` : "0%"}
        trend={data?.successRate.changePercent}
        trendPreviousValue={data ? `${data.successRate.previous.toFixed(1)}%` : undefined}
        trendPreviousPeriod={previousPeriod}
        upIsGood={true}
        isLoading={isLoading}
        className="@container/card"
        tooltip="Percentage of runs that completed successfully without errors, timeouts, or cancellations."
      />
      <KPICard
        title="p95 Duration"
        value={data ? formatDuration(data.p95DurationMs.current) : "0s"}
        trend={data?.p95DurationMs.changePercent}
        trendPreviousValue={data ? formatDuration(data.p95DurationMs.previous) : undefined}
        trendPreviousPeriod={previousPeriod}
        upIsGood={false}
        isLoading={isLoading}
        className="@container/card"
        tooltip="The 95th percentile of run execution time. 95% of runs complete faster than this duration."
      />
      <KPICard
        title="Total Cost"
        value={data ? formatCurrency(data.totalCostCents.current / 100) : "$0"}
        trend={data?.totalCostCents.changePercent}
        trendPreviousValue={data ? formatCurrency(data.totalCostCents.previous / 100) : undefined}
        trendPreviousPeriod={previousPeriod}
        upIsGood={false}
        isLoading={isLoading}
        className="@container/card"
        tooltip="Total monetary cost incurred from all runs during the selected period."
      />
      <KPICard
        title="Total Tokens"
        value={data ? formatNumber(data.totalTokens.current) : "0"}
        trend={data?.totalTokens.changePercent}
        trendPreviousValue={data ? formatNumber(data.totalTokens.previous) : undefined}
        trendPreviousPeriod={previousPeriod}
        isLoading={isLoading}
        className="@container/card"
        tooltip="Total input and output tokens consumed across all runs during the selected period."
      />
    </KPIRow>
  );
}
