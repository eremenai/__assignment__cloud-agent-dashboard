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
    <div className="flex flex-wrap gap-6 rounded-lg border bg-card p-4 text-sm">
      <div>
        <span className="text-muted-foreground">Total Sessions:</span>{" "}
        <span className="font-medium">{totalSessions.toLocaleString()}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Avg Runs/Session:</span>{" "}
        <span className="font-medium">{avgRunsPerSession.toFixed(1)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Avg Active:</span>{" "}
        <span className="font-medium">{formatDuration(avgActiveTimeMs)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Avg Lifespan:</span>{" "}
        <span className="font-medium">{formatDuration(avgLifespanMs)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Handoff Rate:</span>{" "}
        <span className="font-medium">{formatPercent(handoffRate)}</span>
      </div>
    </div>
  );
}
