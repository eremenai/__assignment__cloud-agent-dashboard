"use client";

/**
 * Users table with metrics and pagination.
 */

import Link from "next/link";

import { ArrowUpDown, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

import { EmptyState, RoleBadge } from "@/components/analytics";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "@/lib/format";
import type { PaginationMeta, SortParams } from "@/lib/types/api";
import type { UserWithMetrics } from "@/lib/types/domain";

interface UsersTableProps {
  users: UserWithMetrics[];
  pagination: PaginationMeta;
  sort: SortParams;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string) => void;
}

export function UsersTable({ users, pagination, sort, onPageChange, onSortChange }: UsersTableProps) {
  if (users.length === 0) {
    return <EmptyState title="No users found" description="No users match your current filters." />;
  }

  const SortableHeader = ({
    column,
    children,
    tooltip,
  }: {
    column: string;
    children: React.ReactNode;
    tooltip?: string;
  }) => (
    <TableHead className="cursor-pointer hover:text-foreground" onClick={() => onSortChange(column)}>
      <div className="flex items-center gap-1">
        {children}
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                <HelpCircle className="size-3 cursor-help text-muted-foreground/60 hover:text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <ArrowUpDown className={`h-3 w-3 ${sort.sortBy === column ? "opacity-100" : "opacity-30"}`} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">User</TableHead>
              <TableHead className="w-[80px]">Role</TableHead>
              <SortableHeader column="sessionCount">Sessions</SortableHeader>
              <SortableHeader column="runCount">Runs</SortableHeader>
              <SortableHeader
                column="avgRunsPerSession"
                tooltip="Average number of runs per session. Lower values indicate less iteration needed."
              >
                R/Sess
              </SortableHeader>
              <SortableHeader column="avgActiveTimeMs" tooltip="Average total agent execution time per session">
                Avg Active
              </SortableHeader>
              <SortableHeader
                column="avgLifespanMs"
                tooltip="Average time between first prompt and last message in a session"
              >
                Avg Lifespan
              </SortableHeader>
              <SortableHeader
                column="localHandoffRate"
                tooltip="Percentage of sessions with local handoff (teleport, CLI, or patch download)"
              >
                Handoff%
              </SortableHeader>
              <SortableHeader
                column="postHandoffIterationRate"
                tooltip="Percentage of sessions with additional runs after a local handoff"
              >
                Post-H%
              </SortableHeader>
              <SortableHeader column="successRate" tooltip="Percentage of runs that completed successfully">
                Success%
              </SortableHeader>
              <SortableHeader column="totalTokens" tooltip="Total tokens (input + output) consumed">
                Tokens
              </SortableHeader>
              <SortableHeader column="totalCostCents">Cost</SortableHeader>
              <SortableHeader column="costPerRun" tooltip="Average cost per agent run">
                Cost/Run
              </SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.userId}>
                <TableCell>
                  <Link href={`/users/${user.userId}`} className="flex flex-col hover:underline">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-muted-foreground text-xs">{user.email}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell>{formatNumber(user.sessionCount)}</TableCell>
                <TableCell>{formatNumber(user.runCount)}</TableCell>
                <TableCell className={user.avgRunsPerSession > 4 ? "text-amber-600" : ""}>
                  {user.avgRunsPerSession.toFixed(1)}
                </TableCell>
                <TableCell>{formatDuration(user.avgActiveTimeMs)}</TableCell>
                <TableCell>{formatDuration(user.avgLifespanMs ?? 0)}</TableCell>
                <TableCell className={(user.localHandoffRate ?? user.handoffRate ?? 0) > 50 ? "text-amber-600" : ""}>
                  {formatPercent(user.localHandoffRate ?? user.handoffRate ?? 0)}
                </TableCell>
                <TableCell className={user.postHandoffIterationRate > 30 ? "text-amber-600" : ""}>
                  {formatPercent(user.postHandoffIterationRate)}
                </TableCell>
                <TableCell>
                  <span className={user.successRate >= 85 ? "" : "text-red-600"}>
                    {formatPercent(user.successRate)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatNumber(user.totalTokens)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(user.totalCostCents / 100)}</TableCell>
                <TableCell>{formatCurrency((user.costPerRun ?? 0) / 100)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
          {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} users
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
