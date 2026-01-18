"use client";

/**
 * Dashboard tables with self-contained data fetching.
 */

import { useEffect, useState } from "react";

import { TableSkeleton } from "@/components/analytics";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { fetchSessionsList } from "@/lib/data/sessions-data";
import { fetchUsersList } from "@/lib/data/users-data";
import type { SessionsListResponse, UsersListResponse } from "@/lib/types/api";

import { TopSessionsTable } from "./top-sessions-table";
import { TopUsersTable } from "./top-users-table";

export function DashboardTables() {
  const { user, currentOrgId, can } = useAuth();
  const { from, to } = useTimeRangeParams();

  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionsListResponse | null>(null);
  const [users, setUsers] = useState<UsersListResponse | null>(null);

  const orgId = currentOrgId ?? user?.orgId;
  const canViewUsers = can("view_users_list");

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeRange = { from, to };

    const promises: Promise<unknown>[] = [
      fetchSessionsList(orgId, timeRange, { page: 1, pageSize: 10 }, { sortBy: "totalCostCents", sortOrder: "desc" }),
    ];

    if (canViewUsers) {
      promises.push(
        fetchUsersList(orgId, timeRange, { page: 1, pageSize: 10 }, { sortBy: "totalCostCents", sortOrder: "desc" }),
      );
    }

    Promise.all(promises)
      .then(([sessionsData, usersData]) => {
        setSessions(sessionsData as SessionsListResponse);
        if (usersData) {
          setUsers(usersData as UsersListResponse);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch table data:", error);
        setIsLoading(false);
      });
  }, [orgId, from, to, canViewUsers]);

  if (isLoading) {
    return (
      <>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} columns={6} />
          </CardContent>
        </Card>
        {canViewUsers && (
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} columns={8} />
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  return (
    <>
      {sessions && <TopSessionsTable sessions={sessions.data.slice(0, 10)} />}
      {users && canViewUsers && <TopUsersTable users={users.data.slice(0, 10)} />}
    </>
  );
}
