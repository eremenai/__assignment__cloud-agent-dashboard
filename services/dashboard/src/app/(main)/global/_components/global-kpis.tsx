"use client";

/**
 * Global KPIs section showing platform-wide metrics.
 */

import { KPICard, KPIRow } from "@/components/analytics";
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "@/lib/format";
import type { GlobalKPIs } from "@/lib/types/domain";

interface GlobalKPIsSectionProps {
  kpis: GlobalKPIs;
}

export function GlobalKPIsSection({ kpis }: GlobalKPIsSectionProps) {
  const totalOrgsValue = typeof kpis.totalOrgs === "number" ? kpis.totalOrgs : kpis.totalOrgs.current;
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Platform Overview</h2>
      <KPIRow>
        <KPICard title="Organizations" value={formatNumber(totalOrgsValue)} description="Active organizations" />
        <KPICard
          title="Active Users"
          value={kpis.activeUsers ? formatNumber(kpis.activeUsers.current) : "0"}
          trend={kpis.activeUsers?.changePercent}
          upIsGood
        />
        <KPICard
          title="Total Runs"
          value={kpis.totalRuns ? formatNumber(kpis.totalRuns.current) : "0"}
          trend={kpis.totalRuns?.changePercent}
          upIsGood
        />
        <KPICard
          title="Success Rate"
          value={formatPercent(kpis.successRate.current)}
          trend={kpis.successRate.changePercent}
          upIsGood
        />
        <KPICard
          title="p95 Run Time"
          value={formatDuration(kpis.p95DurationMs.current)}
          trend={kpis.p95DurationMs.changePercent}
          upIsGood={false}
        />
        <KPICard
          title="Total Cost"
          value={formatCurrency(kpis.totalCostCents.current / 100)}
          trend={kpis.totalCostCents.changePercent}
          upIsGood={false}
        />
      </KPIRow>
    </div>
  );
}
