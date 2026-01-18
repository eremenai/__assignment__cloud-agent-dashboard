"use client";

/**
 * Global overview content with self-contained data fetching.
 */

import { useEffect, useState } from "react";

import { KPICardSkeleton, TableSkeleton } from "@/components/analytics";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchGlobalMetrics, fetchGlobalOrgs } from "@/lib/data/global-data";
import type { GlobalKPIs, OrgWithMetrics } from "@/lib/types/domain";

import { GlobalKPIsSection } from "./global-kpis";
import { OrgHealthTable } from "./org-health-table";
import { OrgRankingsTable } from "./org-rankings-table";

interface GlobalData {
  kpis: GlobalKPIs;
  orgs: OrgWithMetrics[];
}

export function GlobalContent() {
  const { from, to } = useTimeRangeParams();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GlobalData | null>(null);

  // Fetch data
  useEffect(() => {
    setIsLoading(true);
    const timeRange = { from, to };

    Promise.all([
      fetchGlobalMetrics(timeRange),
      fetchGlobalOrgs(timeRange, { page: 1, pageSize: 100 }, { sortBy: "runCount", sortOrder: "desc" }),
    ])
      .then(([metricsResponse, orgsResponse]) => {
        setData({
          kpis: metricsResponse.kpis,
          orgs: orgsResponse.data,
        });
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch global data:", error);
        setIsLoading(false);
      });
  }, [from, to]);

  // Loading state
  if (isLoading) {
    return (
      <>
        {/* Global KPIs skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>

        {/* Organization Tables skeleton */}
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={10} columns={6} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={10} columns={4} />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {/* Global KPIs */}
      <GlobalKPIsSection kpis={data.kpis} />

      {/* Organization Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <OrgRankingsTable orgs={data.orgs} />
        <OrgHealthTable orgs={data.orgs} />
      </div>
    </>
  );
}
