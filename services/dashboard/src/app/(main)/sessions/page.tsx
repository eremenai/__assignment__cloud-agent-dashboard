"use client";

/**
 * Sessions List Page - Filterable, sortable list of all sessions.
 *
 * Data fetching is handled by SessionsContent component.
 * SessionsContent uses useTimeRangeParams which requires a Suspense boundary.
 */

import { Suspense } from "react";

import { Download } from "lucide-react";

import { EmptyState, TableSkeleton } from "@/components/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

import { SessionsContent } from "./_components/sessions-content";

function SessionsContentFallback() {
  return (
    <>
      {/* Filters skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Summary skeleton */}
      <div className="grid gap-4 md:grid-cols-5">
        {(["runs", "time", "lifespan", "handoff", "iteration"] as const).map((name) => (
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
          <TableSkeleton rows={10} columns={8} />
        </CardContent>
      </Card>
    </>
  );
}

export default function SessionsListPage() {
  const { user, currentOrgId, isLoading: authLoading } = useAuth();

  const orgId = currentOrgId ?? user?.orgId;

  // Show empty state if no org context
  if (!authLoading && !orgId) {
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

      {/* Content with data fetching */}
      <Suspense fallback={<SessionsContentFallback />}>
        <SessionsContent />
      </Suspense>
    </div>
  );
}
