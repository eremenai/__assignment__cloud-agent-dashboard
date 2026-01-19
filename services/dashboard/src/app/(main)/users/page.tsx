"use client";

/**
 * Users List Page - View and compare users within the organization.
 *
 * Data fetching is handled by UsersContent component.
 * UsersContent uses useTimeRangeParams which requires a Suspense boundary.
 */

import { Suspense } from "react";

import { EmptyState, TableSkeleton } from "@/components/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

import { UsersContent } from "./_components/users-content";

function UsersContentFallback() {
  return (
    <>
      {/* Filters skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Summary skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["users", "sessions", "runs", "cost"] as const).map((name) => (
          <Card key={`summary-${name}`}>
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

export default function UsersPage() {
  const { can } = useAuth();

  // Permission check
  const canViewUsers = can("view_users_list");

  // Access denied for non-managers
  if (!canViewUsers) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Access denied"
          description="You don't have permission to view users."
          actionLabel="Back to Dashboard"
          onAction={() => {
            window.location.href = "/dashboard";
          }}
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

      {/* Content with data fetching */}
      <Suspense fallback={<UsersContentFallback />}>
        <UsersContent />
      </Suspense>
    </div>
  );
}
