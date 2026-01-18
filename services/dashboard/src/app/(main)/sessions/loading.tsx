/**
 * Loading state for the sessions list page.
 */

import { KPICardSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SessionsLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton rows={10} columns={10} />
        </CardContent>
      </Card>
    </div>
  );
}
