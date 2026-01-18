"use client";

/**
 * Sessions content with self-contained data fetching.
 */

import { useCallback, useEffect, useState } from "react";

import { TableSkeleton } from "@/components/analytics";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fetchSessionsList } from "@/lib/data/sessions-data";
import type { SessionFilters, SessionsListResponse, SortOrder } from "@/lib/types/api";

import { SessionsFilters } from "./sessions-filters";
import { SessionsSummary } from "./sessions-summary";
import { SessionsTable } from "./sessions-table";

export function SessionsContent() {
  const { user, currentOrgId, can } = useAuth();
  const { from, to } = useTimeRangeParams();

  const [isLoading, setIsLoading] = useState(true);
  const [response, setResponse] = useState<SessionsListResponse | null>(null);

  // Filter state
  const [filters, setFilters] = useState<Partial<SessionFilters>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const orgId = currentOrgId ?? user?.orgId;
  const canViewAllSessions = can("view_org_sessions");

  // Fetch sessions
  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeRange = { from, to };

    fetchSessionsList(orgId, timeRange, { page, pageSize }, { sortBy, sortOrder })
      .then((sessionsData) => {
        // Filter to only user's sessions if they can't view all
        if (!canViewAllSessions && user) {
          sessionsData.data = sessionsData.data.filter((s) => s.createdByUserId === user.userId);
          sessionsData.pagination.totalItems = sessionsData.data.length;
          sessionsData.pagination.totalPages = Math.ceil(sessionsData.data.length / pageSize);
        }

        setResponse(sessionsData);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch sessions:", error);
        setIsLoading(false);
      });
  }, [orgId, from, to, page, pageSize, sortBy, sortOrder, canViewAllSessions, user]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  // Handle sorting
  const handleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(column);
        setSortOrder("desc");
      }
      setPage(1);
    },
    [sortBy],
  );

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // Render loading skeletons
  if (isLoading) {
    return (
      <>
        {/* Filters skeleton */}
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Summary skeleton */}
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
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
      <SessionsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearchChange={handleSearchChange}
        onClear={handleClearFilters}
      />

      {/* Summary */}
      {response && (
        <SessionsSummary
          totalSessions={response.summary.totalSessions}
          avgRunsPerSession={response.summary.avgRunsPerSession}
          avgActiveTimeMs={response.summary.avgActiveTimeMs}
          avgLifespanMs={response.summary.avgLifespanMs}
          handoffRate={response.summary.handoffRate}
        />
      )}

      {/* Table */}
      {response && (
        <SessionsTable
          sessions={response.data}
          pagination={response.pagination}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          showCreatedBy={canViewAllSessions}
        />
      )}
    </>
  );
}
