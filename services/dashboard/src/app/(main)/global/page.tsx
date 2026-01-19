"use client";

/**
 * Global Overview Page - Cross-org view for SUPER_ADMIN users.
 *
 * Data fetching is handled by GlobalContent component.
 * GlobalContent uses useTimeRangeParams which requires a Suspense boundary.
 */

import { Suspense } from "react";

import { EmptyState, KPISkeleton, TableSkeleton } from "@/components/analytics";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

import { GlobalContent } from "./_components/global-content";

function GlobalContentFallback() {
  return (
    <div className="space-y-8">
      {/* KPIs skeleton */}
      <KPISkeleton rows={1} cardsPerRow={5} />

      {/* Tables skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={`table-skeleton-${i}`}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} columns={5} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function GlobalOverviewPage() {
  const { can } = useAuth();

  // Permission check
  const canViewGlobal = can("view_global_overview");

  // Access denied for non-SUPER_ADMIN
  if (!canViewGlobal) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Access denied"
          description="Only Super Administrators can access the global overview."
          actionLabel="Back to Dashboard"
          onAction={() => {
            window.location.href = "/dashboard";
          }}
        />
      </div>
    );
  }

  return (
    <div className="@container/main space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Global Overview</h1>
        <p className="text-muted-foreground">Platform-wide metrics across all organizations.</p>
      </div>

      {/* Content with data fetching */}
      <Suspense fallback={<GlobalContentFallback />}>
        <GlobalContent />
      </Suspense>
    </div>
  );
}
