"use client";

/**
 * Sessions data table with sorting and pagination.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowDown, ArrowUp, ArrowUpDown, Check, X } from "lucide-react";

import { EmptyState, StatusBadge } from "@/components/analytics";
import { useTimeRangeLink } from "@/components/layout/time-range-selector";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDuration, formatNumber, formatPercent, formatSessionId } from "@/lib/format";
import type { PaginationMeta, SortOrder } from "@/lib/types/api";
import type { SessionWithMetrics } from "@/lib/types/domain";
import { getInitials } from "@/lib/utils";

interface SessionsTableProps {
  sessions: SessionWithMetrics[];
  pagination: PaginationMeta;
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showCreatedBy?: boolean;
}

const sortableColumns = [
  "createdAt",
  "lifespanMs",
  "activeTimeMs",
  "runCount",
  "localHandoffCount",
  "successRate",
  "totalTokens",
  "totalCostCents",
];

function SortIcon({ column, sortBy, sortOrder }: { column: string; sortBy: string; sortOrder: SortOrder }) {
  if (column !== sortBy) {
    return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
  }
  return sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
}

export function SessionsTable({
  sessions,
  pagination,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onPageSizeChange,
  showCreatedBy = true,
}: SessionsTableProps) {
  const router = useRouter();
  const getTimeRangeLink = useTimeRangeLink();

  const handleRowClick = (sessionId: string) => {
    router.push(getTimeRangeLink(`/sessions/${sessionId}`));
  };

  const renderSortableHeader = (column: string, label: string) => {
    const isSortable = sortableColumns.includes(column);
    if (!isSortable) {
      return label;
    }
    return (
      <Button variant="ghost" size="sm" className="-ml-3 h-8 hover:bg-transparent" onClick={() => onSort(column)}>
        {label}
        <SortIcon column={column} sortBy={sortBy} sortOrder={sortOrder} />
      </Button>
    );
  };

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No sessions found"
        description="No sessions match your current filters. Try adjusting your search criteria."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Session</TableHead>
              {showCreatedBy && <TableHead className="w-[180px]">Created By</TableHead>}
              <TableHead className="w-[120px]">{renderSortableHeader("createdAt", "Started")}</TableHead>
              <TableHead className="w-[100px]">{renderSortableHeader("lifespanMs", "Lifespan")}</TableHead>
              <TableHead className="w-[100px]">{renderSortableHeader("activeTimeMs", "Active")}</TableHead>
              <TableHead className="w-[70px] text-right">{renderSortableHeader("runCount", "Runs")}</TableHead>
              <TableHead className="w-[90px] text-right">
                {renderSortableHeader("localHandoffCount", "Handoffs")}
              </TableHead>
              <TableHead className="w-[80px]">Post-H</TableHead>
              <TableHead className="w-[90px] text-right">{renderSortableHeader("successRate", "Success")}</TableHead>
              <TableHead className="w-[100px] text-right">{renderSortableHeader("totalTokens", "Tokens")}</TableHead>
              <TableHead className="w-[90px] text-right">{renderSortableHeader("totalCostCents", "Cost")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow
                key={session.sessionId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(session.sessionId)}
              >
                <TableCell>
                  <Link
                    href={getTimeRangeLink(`/sessions/${session.sessionId}`)}
                    className="font-mono text-primary text-sm hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {formatSessionId(session.sessionId)}
                  </Link>
                </TableCell>
                {showCreatedBy && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{getInitials(session.createdByUser?.name ?? "")}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="max-w-[120px] truncate text-sm">{session.createdByUser?.name ?? session.userId ?? "Unknown"}</span>
                        <span className="max-w-[120px] truncate text-muted-foreground text-xs">
                          {session.createdByUser?.email ?? ""}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">{formatDate(session.createdAt)}</TableCell>
                <TableCell>{formatDuration(session.lifespanMs)}</TableCell>
                <TableCell>{formatDuration(session.activeTimeMs)}</TableCell>
                <TableCell className="text-right">{session.runCount}</TableCell>
                <TableCell className="text-right">{session.localHandoffCount ?? session.handoffCount ?? 0}</TableCell>
                <TableCell>
                  {session.hasPostHandoffIteration ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                      <Check className="h-3 w-3" /> Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                      <X className="h-3 w-3" /> No
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {session.runCount > 0 ? (
                    <StatusBadge
                      status={
                        (session.successRate ?? 0) >= 90 ? "success" : (session.successRate ?? 0) >= 50 ? "timeout" : "fail"
                      }
                      label={formatPercent(session.successRate ?? 0)}
                    />
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{formatNumber(session.totalTokens)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(session.totalCostCents / 100)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span>Show</span>
          <Select value={pagination.pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
