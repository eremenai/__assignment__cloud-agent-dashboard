"use client";

/**
 * Top users table showing users with highest activity/cost.
 */

import { useMemo, useState } from "react";

import Link from "next/link";

import { ChevronRight, HelpCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { UserWithMetrics } from "@/lib/types/domain";
import { getInitials } from "@/lib/utils";

interface TopUsersTableProps {
  users: UserWithMetrics[];
  className?: string;
}

type SortOption = "cost" | "runs" | "sessions" | "handoff";

export function TopUsersTable({ users, className }: TopUsersTableProps) {
  const [sortBy, setSortBy] = useState<SortOption>("cost");

  const sortedUsers = useMemo(() => {
    const sorted = [...users];
    switch (sortBy) {
      case "cost":
        sorted.sort((a, b) => b.totalCostCents - a.totalCostCents);
        break;
      case "runs":
        sorted.sort((a, b) => b.runCount - a.runCount);
        break;
      case "sessions":
        sorted.sort((a, b) => b.sessionCount - a.sessionCount);
        break;
      case "handoff":
        sorted.sort((a, b) => (b.localHandoffRate ?? b.handoffRate ?? 0) - (a.localHandoffRate ?? a.handoffRate ?? 0));
        break;
    }
    return sorted.slice(0, 10);
  }, [users, sortBy]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Top Users</CardTitle>
          <CardDescription>Users with highest activity and cost</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">By Cost</SelectItem>
              <SelectItem value="runs">By Runs</SelectItem>
              <SelectItem value="sessions">By Sessions</SelectItem>
              <SelectItem value="handoff">By Handoff%</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/users">
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Runs</TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1">
                        Runs/Sess
                        <HelpCircle className="size-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        Average number of runs per session. Lower values indicate less iteration needed.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1">
                        Handoff%
                        <HelpCircle className="size-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        Percentage of sessions with local handoff (teleport, CLI, or patch download)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1">
                        Success%
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
            {sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No users in this period
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => (
                <TableRow key={user.userId} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/users/${user.userId}`} className="flex items-center gap-2 hover:underline">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name ?? user.displayName ?? ""} />
                        <AvatarFallback className="text-xs">{getInitials(user.name ?? user.displayName ?? "")}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-muted-foreground text-xs">{user.email}</span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{user.sessionCount}</TableCell>
                  <TableCell className="text-right">{user.runCount}</TableCell>
                  <TableCell className="text-right">{user.avgRunsPerSession.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{formatPercent(user.localHandoffRate ?? user.handoffRate ?? 0)}</TableCell>
                  <TableCell className="text-right">{formatPercent(user.successRate)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatNumber(user.totalTokens)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(user.totalCostCents / 100)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
