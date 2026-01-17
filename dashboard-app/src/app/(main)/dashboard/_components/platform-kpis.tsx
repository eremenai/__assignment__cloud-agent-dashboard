"use client";

/**
 * Platform KPIs section showing Total Runs, Success Rate, p95 Duration, Cost, and Tokens.
 */

import { KPICard, KPIRow } from "@/components/analytics";
import type { PlatformKPIs } from "@/lib/types/domain";
import { formatCurrency, formatDuration, formatNumber } from "@/lib/format";

interface PlatformKPIsSectionProps {
	data: PlatformKPIs | null;
	isLoading?: boolean;
}

export function PlatformKPIsSection({ data, isLoading }: PlatformKPIsSectionProps) {
	return (
		<KPIRow columns={5}>
			<KPICard
				title="Total Runs"
				value={data ? formatNumber(data.totalRuns.current) : "0"}
				trend={data?.totalRuns.changePercent}
				upIsGood={true}
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
			<KPICard
				title="Success Rate"
				value={data ? `${data.successRate.current.toFixed(1)}%` : "0%"}
				trend={data?.successRate.changePercent}
				upIsGood={true}
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
			<KPICard
				title="p95 Duration"
				value={data ? formatDuration(data.p95DurationMs.current) : "0s"}
				trend={data?.p95DurationMs.changePercent}
				upIsGood={false}
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
			<KPICard
				title="Total Cost"
				value={data ? formatCurrency(data.totalCostCents.current / 100) : "$0"}
				trend={data?.totalCostCents.changePercent}
				upIsGood={false}
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
			<KPICard
				title="Total Tokens"
				value={data ? formatNumber(data.totalTokens.current) : "0"}
				trend={data?.totalTokens.changePercent}
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
		</KPIRow>
	);
}
