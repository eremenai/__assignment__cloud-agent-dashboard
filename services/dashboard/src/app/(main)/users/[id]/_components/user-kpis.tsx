"use client";

/**
 * User KPIs section with key metrics in two rows.
 */

import { KPICard, KPIRow } from "@/components/analytics";
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "@/lib/format";
import type { UserWithMetrics } from "@/lib/types/domain";

interface UserKPIsProps {
  user: UserWithMetrics;
}

export function UserKPIs({ user }: UserKPIsProps) {
  return (
    <div className="space-y-4">
      {/* Row 1: Activity metrics */}
      <KPIRow columns={5}>
        <KPICard
          title="Sessions"
          value={formatNumber(user.sessionCount)}
          tooltip="Total number of sessions created by this user in the selected period."
        />
        <KPICard
          title="Runs"
          value={formatNumber(user.runCount)}
          tooltip="Total number of agent runs across all sessions for this user."
        />
        <KPICard
          title="Runs/Session"
          value={user.avgRunsPerSession.toFixed(1)}
          tooltip="Average runs per session. Higher values indicate more iteration needed."
        />
        <KPICard
          title="Avg Active"
          value={formatDuration(user.avgActiveTimeMs)}
          tooltip="Average total agent execution time per session for this user."
        />
        <KPICard
          title="Avg Lifespan"
          value={formatDuration(user.avgLifespanMs ?? 0)}
          tooltip="Average time from first prompt to last message in sessions."
        />
      </KPIRow>
      {/* Row 2: Quality & cost metrics */}
      <KPIRow columns={5}>
        <KPICard
          title="Handoff Rate"
          value={formatPercent(user.localHandoffRate ?? user.handoffRate ?? 0)}
          tooltip="Percentage of sessions where results were exported locally."
        />
        <KPICard
          title="Post-Handoff Iter."
          value={formatPercent(user.postHandoffIterationRate)}
          tooltip="Percentage of sessions with runs after local handoff."
        />
        <KPICard
          title="Success Rate"
          value={formatPercent(user.successRate)}
          tooltip="Percentage of runs that completed successfully."
        />
        <KPICard
          title="Total Tokens"
          value={formatNumber(user.totalTokens)}
          tooltip="Total input and output tokens consumed by this user."
        />
        <KPICard
          title="Total Cost"
          value={formatCurrency(user.totalCostCents / 100)}
          tooltip="Total monetary cost from all runs by this user."
        />
      </KPIRow>
    </div>
  );
}
