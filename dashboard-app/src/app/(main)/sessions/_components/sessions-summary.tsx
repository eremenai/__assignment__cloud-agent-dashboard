"use client";

/**
 * Sessions summary strip showing aggregate metrics for filtered sessions.
 */

import { formatDuration, formatPercent } from "@/lib/format";

interface SessionsSummaryProps {
	totalSessions: number;
	avgRunsPerSession: number;
	avgActiveTimeMs: number;
	avgLifespanMs: number;
	handoffRate: number;
}

export function SessionsSummary({
	totalSessions,
	avgRunsPerSession,
	avgActiveTimeMs,
	avgLifespanMs,
	handoffRate,
}: SessionsSummaryProps) {
	return (
		<div className="flex flex-wrap items-center gap-6 rounded-lg border bg-card px-4 py-3 text-sm">
			<div>
				<span className="font-medium">{totalSessions.toLocaleString()}</span>
				<span className="ml-1 text-muted-foreground">sessions</span>
			</div>
			<div className="h-4 w-px bg-border" />
			<div>
				<span className="text-muted-foreground">Avg</span>
				<span className="ml-1 font-medium">{avgRunsPerSession.toFixed(1)}</span>
				<span className="ml-1 text-muted-foreground">runs/session</span>
			</div>
			<div className="h-4 w-px bg-border" />
			<div>
				<span className="text-muted-foreground">Avg</span>
				<span className="ml-1 font-medium">{formatDuration(avgActiveTimeMs)}</span>
				<span className="ml-1 text-muted-foreground">active</span>
			</div>
			<div className="h-4 w-px bg-border" />
			<div>
				<span className="text-muted-foreground">Avg</span>
				<span className="ml-1 font-medium">{formatDuration(avgLifespanMs)}</span>
				<span className="ml-1 text-muted-foreground">lifespan</span>
			</div>
			<div className="h-4 w-px bg-border" />
			<div>
				<span className="font-medium">{formatPercent(handoffRate)}</span>
				<span className="ml-1 text-muted-foreground">handoff rate</span>
			</div>
		</div>
	);
}
