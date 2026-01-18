"use client";

/**
 * Dashboard charts with self-contained data fetching.
 */

import { useEffect, useState } from "react";

import { ChartSkeleton } from "@/components/analytics";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { useAuth } from "@/lib/auth";
import { fetchOrgFailures, fetchOrgTrends } from "@/lib/data/org-data";
import type { OrgTrendsResponse } from "@/lib/types/api";
import type { FailureCategoryCount } from "@/lib/types/domain";

import { CostTrendsChart } from "./cost-trends-chart";
import { FrictionTrendsChart } from "./friction-trends-chart";
import { ReliabilitySection } from "./reliability-section";
import { UsageTrendsChart } from "./usage-trends-chart";

export function DashboardCharts() {
  const { user, currentOrgId } = useAuth();
  const { from, to } = useTimeRangeParams();

  const [isLoading, setIsLoading] = useState(true);
  const [trends, setTrends] = useState<OrgTrendsResponse | null>(null);
  const [failures, setFailures] = useState<{
    categories: FailureCategoryCount[];
    totalFailures: number;
  } | null>(null);

  const orgId = currentOrgId ?? user?.orgId;

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeRange = { from, to };

    Promise.all([fetchOrgTrends(orgId, timeRange), fetchOrgFailures(orgId, timeRange)])
      .then(([trendsData, failuresData]) => {
        setTrends(trendsData);
        setFailures(failuresData);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch chart data:", error);
        setIsLoading(false);
      });
  }, [orgId, from, to]);

  if (isLoading || !trends || !failures) {
    return (
      <>
        <section className="grid @3xl/main:grid-cols-2 gap-4">
          <ChartSkeleton height={250} />
          <ChartSkeleton height={250} />
        </section>
        <section className="grid @3xl/main:grid-cols-2 gap-4">
          <ChartSkeleton height={250} />
          <ChartSkeleton height={250} />
        </section>
      </>
    );
  }

  return (
    <>
      <section className="grid @3xl/main:grid-cols-2 gap-4">
        <UsageTrendsChart usageData={trends.usage} sessionsData={trends.sessions} activeUsersData={trends.activeUsers} />
        <CostTrendsChart costData={trends.cost} costPerRunData={trends.costPerRun} tokensData={trends.tokens} />
      </section>

      <section className="grid @3xl/main:grid-cols-2 gap-4">
        <FrictionTrendsChart frictionData={trends.friction} />
        <ReliabilitySection reliabilityBreakdown={trends.reliabilityBreakdown} failures={failures} />
      </section>
    </>
  );
}
