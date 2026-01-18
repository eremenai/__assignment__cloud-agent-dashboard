"use client";

/**
 * Users List Page - View and compare users within the organization.
 */

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/analytics";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { getUsersList } from "@/dev/mock-api";
import { useAuth } from "@/lib/auth";
import type { PaginationMeta, SortParams } from "@/lib/types/api";
import type { UserWithMetrics } from "@/lib/types/domain";

import { UsersFilters } from "./_components/users-filters";
import { UsersSummary } from "./_components/users-summary";
import { UsersTable } from "./_components/users-table";

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

export default function UsersPage() {
  const { can, currentOrgId } = useAuth();
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
  const [data, setData] = useState<UsersPageData | null>(null);

  // Permission check
  const canViewUsers = can("view_users_list");

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, []);

  // Fetch data
  useEffect(() => {
    if (!currentOrgId || !canViewUsers) return;

    const timer = setTimeout(() => {
      const result = getUsersList(currentOrgId, { search, from, to }, { page, pageSize }, sort);
      setData(result);
    }, 200);

    return () => clearTimeout(timer);
  }, [currentOrgId, search, from, to, page, pageSize, sort, canViewUsers]);

  const handleSortChange = useCallback((column: string) => {
    setSort((prev) => ({
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === "desc" ? "asc" : "desc",
    }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // Access denied for non-managers
  if (!canViewUsers) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Access denied"
          description="You don't have permission to view users."
          actionLabel="Back to Dashboard"
          onAction={() => (window.location.href = "/dashboard")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Users</h1>
        <p className="text-muted-foreground">Compare user metrics and activity across your organization.</p>
      </div>

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
    </div>
  );
}
