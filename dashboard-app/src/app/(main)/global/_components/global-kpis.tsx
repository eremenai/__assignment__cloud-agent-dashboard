"use client";

/**
 * Global KPIs section showing platform-wide metrics.
 */

import { KPIRow, KPICard } from "@/components/analytics";
import type { GlobalKPIs } from "@/lib/types/domain";
import { formatNumber, formatCurrency, formatDuration, formatPercent } from "@/lib/format";

interface GlobalKPIsSectionProps {
	kpis: GlobalKPIs;
}

export function GlobalKPIsSection({ kpis }: GlobalKPIsSectionProps) {
	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold">Platform Overview</h2>
			<KPIRow>
				<KPICard
					title="Organizations"
					value={formatNumber(kpis.totalOrgs)}
					description="Active organizations"
				/>
				<KPICard
					title="Active Users"
					value={formatNumber(kpis.activeUsers.current)}
					trend={kpis.activeUsers.changePercent}
					upIsGood
				/>
				<KPICard
					title="Total Runs"
					value={formatNumber(kpis.totalRuns.current)}
					trend={kpis.totalRuns.changePercent}
					upIsGood
				/>
				<KPICard
					title="Success Rate"
					value={formatPercent(kpis.successRate.current)}
					trend={kpis.successRate.changePercent}
					upIsGood
				/>
				<KPICard
					title="p95 Duration"
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
