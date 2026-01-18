"use client";

/**
 * Top sessions table showing the most significant sessions.
 */

import { useMemo, useState } from "react";

import Link from "next/link";

import { ChevronRight, HelpCircle } from "lucide-react";

import { StatusBadge } from "@/components/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  formatCurrency,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatSessionId,
} from "@/lib/format";
import type { SessionWithMetrics } from "@/lib/types/domain";

interface TopSessionsTableProps {
  sessions: SessionWithMetrics[];
  className?: string;
}

type SortOption = "cost" | "runs" | "lifespan" | "failures";

export function TopSessionsTable({ sessions, className }: TopSessionsTableProps) {
  const [sortBy, setSortBy] = useState<SortOption>("cost");

  const sortedSessions = useMemo(() => {
    const sorted = [...sessions];
    switch (sortBy) {
      case "cost":
        sorted.sort((a, b) => b.totalCostCents - a.totalCostCents);
        break;
      case "runs":
        sorted.sort((a, b) => b.runCount - a.runCount);
        break;
      case "lifespan":
        sorted.sort((a, b) => b.lifespanMs - a.lifespanMs);
        break;
      case "failures":
        sorted.sort((a, b) => (b.failedRunCount ?? b.failedRuns ?? 0) - (a.failedRunCount ?? a.failedRuns ?? 0));
        break;
    }
    return sorted.slice(0, 10);
  }, [sessions, sortBy]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Top Sessions</CardTitle>
          <CardDescription>Sessions with highest cost or activity</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">By Cost</SelectItem>
              <SelectItem value="runs">By Runs</SelectItem>
              <SelectItem value="lifespan">By Lifespan</SelectItem>
              <SelectItem value="failures">By Failures</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sessions">
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1">
                        Lifespan
                        <HelpCircle className="size-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">Time between first prompt and last message in the session</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1">
                        Runs
                        <HelpCircle className="size-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">Number of agent runs in the session</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1">
                        Handoffs
                        <HelpCircle className="size-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">Local handoffs (teleport, CLI, or patch download)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1">
                        Success
                        <HelpCircle className="size-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">Percentage of runs that completed successfully</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1">
                        Tokens
                        <HelpCircle className="size-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">Total tokens (input + output) consumed</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No sessions in this period
                </TableCell>
              </TableRow>
            ) : (
              sortedSessions.map((session) => (
                <TableRow key={session.sessionId} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link
                      href={`/sessions/${session.sessionId}`}
                      className="font-mono text-primary text-sm hover:underline"
                    >
                      {formatSessionId(session.sessionId)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatRelativeTime(session.createdAt)}</TableCell>
                  <TableCell>{formatDuration(session.lifespanMs)}</TableCell>
                  <TableCell className="text-right">{session.runCount}</TableCell>
                  <TableCell className="text-right">{session.localHandoffCount ?? session.handoffCount ?? 0}</TableCell>
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
                  <TableCell className="text-right text-muted-foreground">
                    {formatNumber(session.totalTokens)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(session.totalCostCents / 100)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
