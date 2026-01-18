"use client";

/**
 * Organization health table showing friction metrics.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/format";
import type { OrgWithMetrics } from "@/lib/types/domain";

interface OrgHealthTableProps {
  orgs: OrgWithMetrics[];
}

export function OrgHealthTable({ orgs }: OrgHealthTableProps) {
  // Sort by handoff rate (highest first as indicator of potential friction)
  const sortedOrgs = [...orgs].sort((a, b) => (b.localHandoffRate ?? b.handoffRate ?? 0) - (a.localHandoffRate ?? a.handoffRate ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Friction Indicators</CardTitle>
        <CardDescription>Organizations by handoff rate (higher may indicate friction)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Organization</TableHead>
              <TableHead className="w-[100px] text-right">Sessions</TableHead>
              <TableHead className="w-[100px] text-right">Runs/Session</TableHead>
              <TableHead className="w-[100px] text-right">Handoff Rate</TableHead>
              <TableHead className="w-[100px] text-right">Success Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrgs.map((org) => (
              <TableRow key={org.orgId}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell className="text-right">{formatNumber(org.sessionCount)}</TableCell>
                <TableCell className="text-right">{org.avgRunsPerSession.toFixed(1)}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      (org.localHandoffRate ?? org.handoffRate ?? 0) >= 50
                        ? "font-medium text-red-600"
                        : (org.localHandoffRate ?? org.handoffRate ?? 0) >= 30
                          ? "text-amber-600"
                          : "text-green-600"
                    }
                  >
                    {formatPercent(org.localHandoffRate ?? org.handoffRate ?? 0)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      org.successRate >= 90
                        ? "text-green-600"
                        : org.successRate >= 70
                          ? "text-amber-600"
                          : "text-red-600"
                    }
                  >
                    {formatPercent(org.successRate)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
