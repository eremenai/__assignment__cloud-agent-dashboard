/**
 * Loading state for the global overview page.
 */

import { KPICardSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/analytics";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="@container/main space-y-8">
      {/* Header */}
      <PageHeaderSkeleton />

      {/* Global KPIs */}
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

      {/* Organization Tables */}
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
    </div>
  );
}
