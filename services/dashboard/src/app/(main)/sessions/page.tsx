"use client";

/**
 * Sessions List Page - Filterable, sortable list of all sessions.
 */

import { useCallback, useEffect, useState } from "react";

import { Download } from "lucide-react";

import { EmptyState } from "@/components/analytics";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { Button } from "@/components/ui/button";
import { getSessionsList } from "@/dev/mock-api";
import { useAuth } from "@/lib/auth";
import type { SessionFilters, SessionsListResponse, SortOrder } from "@/lib/types/api";

import { SessionsFilters } from "./_components/sessions-filters";
import { SessionsSummary } from "./_components/sessions-summary";
import { SessionsTable } from "./_components/sessions-table";

export default function SessionsListPage() {
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

  // Determine which org to show
  const orgId = currentOrgId ?? user?.orgId;

  // Check if user can see all sessions or only their own
  const canViewAllSessions = can("view_org_sessions");

  // Fetch sessions
  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(() => {
      const sessionsData = getSessionsList(orgId, { ...filters, from, to }, { page, pageSize }, { sortBy, sortOrder });

      // Filter to only user's sessions if they can't view all
      if (!canViewAllSessions && user) {
        sessionsData.data = sessionsData.data.filter((s) => s.createdByUserId === user.userId);
        sessionsData.pagination.totalItems = sessionsData.data.length;
        sessionsData.pagination.totalPages = Math.ceil(sessionsData.data.length / pageSize);
      }

      setResponse(sessionsData);
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [orgId, from, to, filters, page, pageSize, sortBy, sortOrder, canViewAllSessions, user]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page
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

  // Show empty state if no org context
  if (!orgId && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Select an Organization"
          description="Choose an organization from the dropdown to view sessions."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">View and analyze agent sessions</p>
        </div>
        <Button variant="outline" disabled>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

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
    </div>
  );
}
