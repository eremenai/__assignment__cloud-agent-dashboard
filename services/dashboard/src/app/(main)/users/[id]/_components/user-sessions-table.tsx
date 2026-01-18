"use client";

/**
 * Recent sessions table for a specific user.
 */

import Link from "next/link";

import { EmptyState, StatusBadge } from "@/components/analytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDuration, formatSessionId } from "@/lib/format";
import type { SessionWithMetrics } from "@/lib/types/domain";

interface UserSessionsTableProps {
  sessions: SessionWithMetrics[];
  /** User ID for breadcrumb context when navigating to session */
  userId?: string;
  /** User name for breadcrumb context when navigating to session */
  userName?: string;
}

export function UserSessionsTable({ sessions, userId, userName }: UserSessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState title="No sessions" description="This user hasn't created any sessions in the selected time range." />
    );
  }

  // Build session link with user context for breadcrumbs
  const getSessionHref = (sessionId: string) => {
    if (userId && userName) {
      const params = new URLSearchParams({
        fromUser: userId,
        fromUserName: userName,
      });
      return `/sessions/${sessionId}?${params.toString()}`;
    }
    return `/sessions/${sessionId}`;
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Session</TableHead>
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead className="w-[80px]">Runs</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Duration</TableHead>
            <TableHead className="w-[80px] text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.slice(0, 10).map((session) => {
            const hasFailures = session.failedRunCount > 0;
            return (
              <TableRow key={session.sessionId}>
                <TableCell>
                  <Link href={getSessionHref(session.sessionId)} className="font-mono text-sm hover:underline">
                    {formatSessionId(session.sessionId)}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(session.createdAt)}</TableCell>
                <TableCell>{session.runCount}</TableCell>
                <TableCell>
                  {hasFailures ? <StatusBadge status="FAILED" /> : <StatusBadge status="SUCCEEDED" />}
                </TableCell>
                <TableCell>{formatDuration(session.lifespanMs)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(session.totalCostCents / 100)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
