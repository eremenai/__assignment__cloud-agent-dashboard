"use client";

/**
 * User detail content with self-contained data fetching.
 */

import { useEffect, useState } from "react";

import { ChartSkeleton, EmptyState, KPICardSkeleton, TableSkeleton } from "@/components/analytics";
import { useBreadcrumbs } from "@/components/layout";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fetchSessionsList } from "@/lib/data/sessions-data";
import { fetchUserDetail } from "@/lib/data/users-data";
import type { SessionWithMetrics, UserDetailResponse } from "@/lib/types";

import { UserActivityChart } from "./user-activity-chart";
import { UserCostChart } from "./user-cost-chart";
import { UserFrictionChart } from "./user-friction-chart";
import { UserHeader } from "./user-header";
import { UserKPIs } from "./user-kpis";
import { UserSessionsTable } from "./user-sessions-table";

interface UserContentProps {
  userId: string;
}

export function UserContent({ userId }: UserContentProps) {
  const { canViewUser, currentOrgId, user } = useAuth();
  const { from, to } = useTimeRangeParams();
  const { setMetadata, clearMetadata } = useBreadcrumbs();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [sessions, setSessions] = useState<SessionWithMetrics[]>([]);

  const orgId = currentOrgId ?? user?.orgId;

  // Fetch data
  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeRange = { from, to };

    Promise.all([
      fetchUserDetail(orgId, userId, timeRange),
      fetchSessionsList(orgId, timeRange, { page: 1, pageSize: 10 }, { sortBy: "createdAt", sortOrder: "desc" }),
    ])
      .then(([userDetail, sessionsResponse]) => {
        setData(userDetail);
        // Filter sessions to this user
        const userSessions = sessionsResponse.data.filter((s) => s.createdByUserId === userId);
        setSessions(userSessions);
        setIsLoading(false);

        // Set breadcrumb metadata with user name
        if (userDetail) {
          setMetadata({
            userName: userDetail.user.name,
            fromUserId: userId,
            fromUserName: userDetail.user.name,
          });
        }
      })
      .catch((error) => {
        console.error("Failed to fetch user detail:", error);
        setIsLoading(false);
      });

    return () => {
      clearMetadata();
    };
  }, [userId, from, to, setMetadata, clearMetadata, orgId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="@container/main space-y-6">
        {/* User Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* KPIs skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>

        {/* Charts skeleton */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ChartSkeleton height={200} />
          <ChartSkeleton height={200} />
          <ChartSkeleton height={200} />
        </div>

        {/* Recent Sessions skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} columns={8} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not found
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="User not found"
          description="The user you're looking for doesn't exist or you don't have access to it."
          actionLabel="Back to Users"
          onAction={() => {
            window.location.href = "/users";
          }}
        />
      </div>
    );
  }

  // Permission check
  if (!canViewUser(userId)) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Access denied"
          description="You don't have permission to view this user."
          actionLabel="Back to Dashboard"
          onAction={() => {
            window.location.href = "/dashboard";
          }}
        />
      </div>
    );
  }

  return (
    <div className="@container/main space-y-6">
      {/* User Header */}
      <UserHeader user={data.user} />

      {/* KPIs */}
      <UserKPIs user={data.user} />

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <UserActivityChart data={data.trends.activity} />
        <UserCostChart data={data.trends.cost} />
        <UserFrictionChart data={data.trends.friction} />
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <UserSessionsTable sessions={sessions} userId={userId} userName={data.user.name} />
        </CardContent>
      </Card>
    </div>
  );
}
