"use client";

/**
 * Users content with self-contained data fetching.
 */

import { useCallback, useEffect, useRef, useState } from "react";

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

  // Data state - separate initial loading from table loading
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [data, setData] = useState<UsersPageData | null>(null);
  const isFirstLoad = useRef(true);

  // Reset page when search changes - note: search filtering is client-side only
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  // Fetch data
  useEffect(() => {
    if (!currentOrgId) {
      setIsInitialLoading(false);
      return;
    }

    // Use table loading for subsequent fetches
    if (isFirstLoad.current) {
      setIsInitialLoading(true);
    } else {
      setIsTableLoading(true);
    }

    const timeRange = { from, to };

    fetchUsersList(currentOrgId, timeRange, { page, pageSize }, sort, { search })
      .then((result) => {
        setData(result);
        setIsInitialLoading(false);
        setIsTableLoading(false);
        isFirstLoad.current = false;
      })
      .catch((error) => {
        console.error("Failed to fetch users:", error);
        setIsInitialLoading(false);
        setIsTableLoading(false);
        isFirstLoad.current = false;
      });
  }, [currentOrgId, from, to, page, pageSize, sort, search]);

  const handleSortChange = useCallback((column: string) => {
    setSort((prev) => ({
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === "desc" ? "asc" : "desc",
    }));
  }, []);

  // Initial loading - show full skeleton
  if (isInitialLoading) {
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

      {/* Table - show loading overlay when fetching */}
      <div className="relative">
        {isTableLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        )}
        {data && (
          <UsersTable
            users={data.data}
            pagination={data.pagination}
            sort={sort}
            onPageChange={setPage}
            onSortChange={handleSortChange}
          />
        )}
      </div>
    </>
  );
}
