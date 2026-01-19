"use client";

/**
 * Org Overview Dashboard - Primary landing page.
 * Shows adoption, reliability, cost, and friction metrics.
 *
 * Each section fetches its own data for better loading UX and code organization.
 * Components using useTimeRangeParams/useSearchParams are wrapped in Suspense boundaries.
 */

import { Suspense } from "react";

import { EmptyState, KPISkeleton, TableSkeleton } from "@/components/analytics";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

import { DashboardCharts } from "./_components/dashboard-charts";
import { DashboardKPIs } from "./_components/dashboard-kpis";
import { DashboardTables } from "./_components/dashboard-tables";

function KPIsFallback() {
  return <KPISkeleton rows={2} cardsPerRow={5} />;
}

function ChartsFallback() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={`chart-skeleton-${i}`}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TablesFallback() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={`table-skeleton-${i}`}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} columns={4} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function OrgOverviewPage() {
  const { user, currentOrgId, isLoading: authLoading } = useAuth();

  const orgId = currentOrgId ?? user?.orgId;

  // Show empty state if no org context (after auth is loaded)
  if (!authLoading && !orgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Select an Organization"
          description="Choose an organization from the dropdown to view its dashboard."
        />
      </div>
    );
  }

  return (
    <div className="@container/main space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Platform health and adoption metrics</p>
      </div>

      {/* KPIs - fetches its own data */}
      <Suspense fallback={<KPIsFallback />}>
        <DashboardKPIs />
      </Suspense>

      {/* Charts - fetches its own data */}
      <Suspense fallback={<ChartsFallback />}>
        <DashboardCharts />
      </Suspense>

      {/* Tables - fetches its own data */}
      <Suspense fallback={<TablesFallback />}>
        <DashboardTables />
      </Suspense>
    </div>
  );
}
