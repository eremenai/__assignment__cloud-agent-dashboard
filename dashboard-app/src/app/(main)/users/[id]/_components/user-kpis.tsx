"use client";

/**
 * User KPIs section with key metrics.
 */

import { KPIRow, KPICard } from "@/components/analytics";
import type { UserWithMetrics } from "@/lib/types/domain";
import { formatNumber, formatCurrency, formatDuration, formatPercent } from "@/lib/format";

interface UserKPIsProps {
	user: UserWithMetrics;
}

export function UserKPIs({ user }: UserKPIsProps) {
	return (
		<KPIRow>
			<KPICard title="Sessions" value={formatNumber(user.sessionCount)} />
			<KPICard title="Runs" value={formatNumber(user.runCount)} />
			<KPICard title="Success Rate" value={formatPercent(user.successRate)} />
			<KPICard title="Avg Active Time" value={formatDuration(user.avgActiveTimeMs)} />
			<KPICard title="Handoff Rate" value={formatPercent(user.localHandoffRate)} />
			<KPICard title="Total Cost" value={formatCurrency(user.totalCostCents / 100)} />
		</KPIRow>
	);
}
