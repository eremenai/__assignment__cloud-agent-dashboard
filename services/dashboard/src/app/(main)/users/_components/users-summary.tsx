"use client";

/**
 * Users summary strip showing key metrics.
 */

import { formatCurrency, formatNumber } from "@/lib/format";

interface UsersSummaryProps {
  totalUsers: number;
  totalSessions: number;
  totalCostCents: number;
  avgHandoffRate: number;
}

export function UsersSummary({ totalUsers, totalSessions, totalCostCents, avgHandoffRate }: UsersSummaryProps) {
  return (
    <div className="flex flex-wrap gap-6 rounded-lg border bg-card p-4 text-sm">
      <div>
        <span className="text-muted-foreground">Total Users:</span>{" "}
        <span className="font-medium">{formatNumber(totalUsers)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Total Sessions:</span>{" "}
        <span className="font-medium">{formatNumber(totalSessions)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Total Cost:</span>{" "}
        <span className="font-medium">{formatCurrency(totalCostCents / 100)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Avg Handoff Rate:</span>{" "}
        <span className="font-medium">{avgHandoffRate.toFixed(1)}%</span>
      </div>
    </div>
  );
}
