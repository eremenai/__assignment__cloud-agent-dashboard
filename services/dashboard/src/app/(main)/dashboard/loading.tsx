/**
 * Loading state for the dashboard page.
 */

import { ChartSkeleton, KPICardSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/analytics";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="@container/main space-y-6">
      {/* Page Header */}
      <PageHeaderSkeleton />

      {/* Platform KPIs */}
      <section>
        <Skeleton className="mb-3 h-4 w-16" />
        <div className="grid @3xl/main:grid-cols-5 @xl/main:grid-cols-3 gap-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      </section>

      {/* Friction KPIs */}
      <section>
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="grid @xl/main:grid-cols-3 gap-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid @3xl/main:grid-cols-2 gap-4">
        <ChartSkeleton height={250} />
        <ChartSkeleton height={250} />
      </section>

      {/* Friction & Reliability Row */}
      <section className="grid @3xl/main:grid-cols-2 gap-4">
        <ChartSkeleton height={250} />
        <ChartSkeleton height={250} />
      </section>

      {/* Tables */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={6} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={8} />
        </CardContent>
      </Card>
    </div>
  );
}
