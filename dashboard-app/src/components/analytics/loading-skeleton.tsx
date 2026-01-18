/**
 * Loading skeleton components for various dashboard elements.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  /** Show footer area */
  hasFooter?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for KPI card loading state.
 */
export function KPICardSkeleton({ hasFooter = false, className }: CardSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-16" />
      </CardHeader>
      {hasFooter && (
        <CardContent className="flex flex-col gap-1.5 pt-0">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      )}
    </Card>
  );
}

interface ChartSkeletonProps {
  /** Chart height */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for chart loading state.
 */
export function ChartSkeleton({ height = 300, className }: ChartSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn("w-full")} style={{ height }} />
      </CardContent>
    </Card>
  );
}

interface TableSkeletonProps {
  /** Number of rows to show */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton for table loading state.
 */
export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header row */}
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for page header loading state.
 */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}
