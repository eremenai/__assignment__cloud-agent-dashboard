"use client";

/**
 * Org Overview Dashboard - Primary landing page.
 * Shows adoption, reliability, cost, and friction metrics.
 *
 * Each section fetches its own data for better loading UX and code organization.
 */

import { EmptyState } from "@/components/analytics";
import { useAuth } from "@/lib/auth";

import { DashboardCharts } from "./_components/dashboard-charts";
import { DashboardKPIs } from "./_components/dashboard-kpis";
import { DashboardTables } from "./_components/dashboard-tables";

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
      <DashboardKPIs />

      {/* Charts - fetches its own data */}
      <DashboardCharts />

      {/* Tables - fetches its own data */}
      <DashboardTables />
    </div>
  );
}
