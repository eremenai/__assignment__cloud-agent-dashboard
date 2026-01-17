"use client";

/**
 * Friction KPIs section showing Runs/Session, Active Time, Lifespan, Handoff%, and Post-Handoff%.
 */

import { KPICard, KPIRow } from "@/components/analytics";
import type { FrictionKPIs } from "@/lib/types/domain";
import { formatDuration, formatPercent } from "@/lib/format";

interface FrictionKPIsSectionProps {
	data: FrictionKPIs | null;
	isLoading?: boolean;
}

export function FrictionKPIsSection({ data, isLoading }: FrictionKPIsSectionProps) {
	return (
		<KPIRow columns={5}>
			<KPICard
				title="Avg Runs/Session"
				value={data ? data.avgRunsPerSession.current.toFixed(1) : "0"}
				trend={data?.avgRunsPerSession.changePercent}
				upIsGood={false}
				description="Lower is better"
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
			<KPICard
				title="Avg Active Time"
				value={data ? formatDuration(data.avgActiveTimeMs.current) : "0s"}
				trend={data?.avgActiveTimeMs.changePercent}
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
			<KPICard
				title="Avg Lifespan"
				value={data ? formatDuration(data.avgLifespanMs.current) : "0s"}
				trend={data?.avgLifespanMs.changePercent}
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
			<KPICard
				title="Local Handoff Rate"
				value={data ? formatPercent(data.localHandoffRate.current) : "0%"}
				trend={data?.localHandoffRate.changePercent}
				upIsGood={false}
				description="% sessions with handoff"
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
			<KPICard
				title="Post-Handoff Iteration"
				value={data ? formatPercent(data.postHandoffIterationRate.current) : "0%"}
				trend={data?.postHandoffIterationRate.changePercent}
				upIsGood={false}
				description="% with runs after handoff"
				footer="vs previous period"
				isLoading={isLoading}
				className="@container/card"
			/>
		</KPIRow>
	);
}
