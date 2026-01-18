"use client";

/**
 * Friction KPIs section showing Runs/Session, Active Time, Lifespan, Handoff%, and Post-Handoff%.
 */

import { KPICard, KPIRow } from "@/components/analytics";
import { useTimeRange } from "@/components/layout/time-range-selector";
import { formatDateRange, formatDuration, formatPercent } from "@/lib/format";
import type { FrictionKPIs } from "@/lib/types/domain";

interface FrictionKPIsSectionProps {
  data: FrictionKPIs | null;
  isLoading?: boolean;
}

export function FrictionKPIsSection({ data, isLoading }: FrictionKPIsSectionProps) {
  const { from, to } = useTimeRange();
  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime() - 1);
  const previousPeriod = formatDateRange(prevFrom, prevTo);

  return (
    <KPIRow columns={5}>
      <KPICard
        title="Avg Runs/Session"
        value={data ? data.avgRunsPerSession.current.toFixed(1) : "0"}
        trend={data?.avgRunsPerSession.changePercent}
        trendPreviousValue={data ? data.avgRunsPerSession.previous.toFixed(1) : undefined}
        trendPreviousPeriod={previousPeriod}
        upIsGood={false}
        isLoading={isLoading}
        className="@container/card"
        tooltip="Average number of agent runs per session. Higher values indicate more iteration or tweaking needed."
      />
      <KPICard
        title="Avg Active Time"
        value={data?.avgActiveTimeMs ? formatDuration(data.avgActiveTimeMs.current) : "0s"}
        trend={data?.avgActiveTimeMs?.changePercent}
        trendPreviousValue={data?.avgActiveTimeMs ? formatDuration(data.avgActiveTimeMs.previous) : undefined}
        trendPreviousPeriod={previousPeriod}
        isLoading={isLoading}
        className="@container/card"
        tooltip="Average total agent execution time per session. Sum of all run durations within a session."
      />
      <KPICard
        title="Avg Lifespan"
        value={data?.avgLifespanMs ? formatDuration(data.avgLifespanMs.current) : "0s"}
        trend={data?.avgLifespanMs?.changePercent}
        trendPreviousValue={data?.avgLifespanMs ? formatDuration(data.avgLifespanMs.previous) : undefined}
        trendPreviousPeriod={previousPeriod}
        isLoading={isLoading}
        className="@container/card"
        tooltip="Average time between first prompt and last message in a session. Indicates how long users engage with sessions."
      />
      <KPICard
        title="Local Handoff Rate"
        value={data ? formatPercent(data.localHandoffRate.current) : "0%"}
        trend={data?.localHandoffRate.changePercent}
        trendPreviousValue={data ? formatPercent(data.localHandoffRate.previous) : undefined}
        trendPreviousPeriod={previousPeriod}
        upIsGood={false}
        isLoading={isLoading}
        className="@container/card"
        tooltip="Percentage of sessions where results were exported locally (teleport, CLI, or patch download)."
      />
      <KPICard
        title="Post-Handoff Iteration"
        value={data ? formatPercent(data.postHandoffIterationRate.current) : "0%"}
        trend={data?.postHandoffIterationRate.changePercent}
        trendPreviousValue={data ? formatPercent(data.postHandoffIterationRate.previous) : undefined}
        trendPreviousPeriod={previousPeriod}
        upIsGood={false}
        isLoading={isLoading}
        className="@container/card"
        tooltip="Percentage of sessions with additional runs after a local handoff. Proxy for 'handoff exposed issues requiring more work'."
      />
    </KPIRow>
  );
}
