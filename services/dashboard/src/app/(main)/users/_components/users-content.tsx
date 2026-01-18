"use client";

/**
 * Users content with self-contained data fetching.
 */

import { useCallback, useEffect, useState } from "react";

import { TableSkeleton } from "@/components/analytics";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fetchUsersList } from "@/lib/data/users-data";
import type { PaginationMeta, SortParams } from "@/lib/types/api";
import type { UserWithMetrics } from "@/lib/types/domain";

import { UsersFilters } from "./users-filters";
import { UsersSummary } from "./users-summary";
import { UsersTable } from "./users-table";

interface UsersPageData {
  data: UserWithMetrics[];
  pagination: PaginationMeta;
  summary: {
    totalUsers: number;
    totalSessions: number;
    totalCostCents: number;
    avgHandoffRate: number;
  };
}

export function UsersContent() {
  const { currentOrgId } = useAuth();
  const { from, to } = useTimeRangeParams();

  // Filter state
  const [search, setSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Sort state
  const [sort, setSort] = useState<SortParams>({
    sortBy: "totalCostCents",
    sortOrder: "desc",
  });

  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<UsersPageData | null>(null);

  // Reset page when search changes - note: search filtering is client-side only
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  // Fetch data
  useEffect(() => {
    if (!currentOrgId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeRange = { from, to };

    fetchUsersList(currentOrgId, timeRange, { page, pageSize }, sort)
      .then((result) => {
        setData(result);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch users:", error);
        setIsLoading(false);
      });
  }, [currentOrgId, from, to, page, pageSize, sort]);

  const handleSortChange = useCallback((column: string) => {
    setSort((prev) => ({
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === "desc" ? "asc" : "desc",
    }));
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <>
        {/* Filters skeleton */}
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
        </div>

        {/* Summary skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton elements never reorder
            <Card key={`summary-${i}`}>
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table skeleton */}
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={10} columns={10} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Filters */}
      <UsersFilters search={search} onSearchChange={handleSearchChange} />

      {/* Summary */}
      {data && (
        <UsersSummary
          totalUsers={data.summary.totalUsers}
          totalSessions={data.summary.totalSessions}
          totalCostCents={data.summary.totalCostCents}
          avgHandoffRate={data.summary.avgHandoffRate}
        />
      )}

      {/* Table */}
      {data && (
        <UsersTable
          users={data.data}
          pagination={data.pagination}
          sort={sort}
          onPageChange={setPage}
          onSortChange={handleSortChange}
        />
      )}
    </>
  );
}
