"use client";

/**
 * Runs tab showing detailed run information.
 */

import { ExternalLink } from "lucide-react";

import { EmptyState, StatusBadge } from "@/components/analytics";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDuration, formatNumber } from "@/lib/format";
import type { Run } from "@/lib/types/domain";

interface RunsTabProps {
  runs: Run[];
  onRunClick?: (runId: string) => void;
}

export function RunsTab({ runs, onRunClick }: RunsTabProps) {
  if (runs.length === 0) {
    return <EmptyState title="No runs" description="No runs have been executed in this session." />;
  }

  // Sort runs by start time
  const sortedRuns = [...runs].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Run</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[140px]">Started</TableHead>
            <TableHead className="w-[90px]">Duration</TableHead>
            <TableHead className="w-[90px] text-right">Input Tokens</TableHead>
            <TableHead className="w-[90px] text-right">Output Tokens</TableHead>
            <TableHead className="w-[90px] text-right">Total Tokens</TableHead>
            <TableHead className="w-[80px] text-right">Cost</TableHead>
            <TableHead className="w-[120px]">Error</TableHead>
            {onRunClick && <TableHead className="w-[60px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRuns.map((run, index) => (
            <TableRow
              key={run.runId}
              className={onRunClick ? "cursor-pointer hover:bg-muted/50" : undefined}
              onClick={onRunClick ? () => onRunClick(run.runId) : undefined}
            >
              <TableCell className="font-mono">#{index + 1}</TableCell>
              <TableCell>
                <StatusBadge status={run.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(run.startedAt)}</TableCell>
              <TableCell>{formatDuration(run.executionMs)}</TableCell>
              <TableCell className="text-right">{formatNumber(run.inputTokens)}</TableCell>
              <TableCell className="text-right">{formatNumber(run.outputTokens)}</TableCell>
              <TableCell className="text-right font-medium">{formatNumber(run.totalTokens)}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(run.costCents / 100)}</TableCell>
              <TableCell className="text-muted-foreground">
                {run.failureCategory ? <span className="text-red-600">{run.failureCategory}</span> : "-"}
              </TableCell>
              {onRunClick && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRunClick(run.runId);
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="sr-only">View in timeline</span>
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
