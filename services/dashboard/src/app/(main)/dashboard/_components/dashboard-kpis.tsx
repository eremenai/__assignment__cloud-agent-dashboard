"use client";

/**
 * Dashboard KPIs sections with self-contained data fetching.
 */

import { useEffect, useState } from "react";

import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { useAuth } from "@/lib/auth";
import { fetchOrgMetrics } from "@/lib/data/org-data";
import type { OrgMetricsResponse } from "@/lib/types/api";

import { FrictionKPIsSection } from "./friction-kpis";
import { PlatformKPIsSection } from "./platform-kpis";

export function DashboardKPIs() {
  const { user, currentOrgId } = useAuth();
  const { from, to } = useTimeRangeParams();

  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<OrgMetricsResponse | null>(null);

  const orgId = currentOrgId ?? user?.orgId;

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeRange = { from, to };

    fetchOrgMetrics(orgId, timeRange)
      .then((data) => {
        setMetrics(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch org metrics:", error);
        setIsLoading(false);
      });
  }, [orgId, from, to]);

  return (
    <>
      <section>
        <h2 className="mb-3 font-medium text-muted-foreground text-sm">Platform</h2>
        <PlatformKPIsSection data={metrics?.platform ?? null} isLoading={isLoading} />
      </section>

      <section>
        <h2 className="mb-3 font-medium text-muted-foreground text-sm">Session Friction</h2>
        <FrictionKPIsSection data={metrics?.friction ?? null} isLoading={isLoading} />
      </section>
    </>
  );
}
