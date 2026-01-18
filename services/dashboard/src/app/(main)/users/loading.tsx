/**
 * Loading state for the users list page.
 */

import { KPICardSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeaderSkeleton />

      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
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
