"use client";

/**
 * Artifacts tab showing files changed and handoff history.
 */

import { ArrowUpRight, FileCode } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { LocalHandoffEvent } from "@/lib/types/domain";

interface ArtifactsTabProps {
  artifacts: {
    totalFilesChanged: number;
    totalLinesAdded: number;
    totalLinesDeleted: number;
    files: Array<{
      path: string;
      linesAdded: number;
      linesDeleted: number;
    }>;
  };
  handoffs: LocalHandoffEvent[];
}

export function ArtifactsTab({ artifacts, handoffs }: ArtifactsTabProps) {
  return (
    <div className="space-y-6">
      {/* Files Changed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Files Changed
          </CardTitle>
          <CardDescription>
            {artifacts.totalFilesChanged} files | +{artifacts.totalLinesAdded} | -{artifacts.totalLinesDeleted} lines
          </CardDescription>
        </CardHeader>
        <CardContent>
          {artifacts.files.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">Artifact tracking coming soon.</p>
              <p className="mt-1 text-muted-foreground/60 text-xs">File changes will be tracked in a future release.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {artifacts.files.map((file) => (
                <div key={file.path} className="flex items-center justify-between border-b py-1 text-sm last:border-0">
                  <code className="text-muted-foreground">{file.path}</code>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">+{file.linesAdded}</span>
                    <span className="text-red-600">-{file.linesDeleted}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Handoff History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Local Handoff History
          </CardTitle>
          <CardDescription>
            {handoffs.length} handoff{handoffs.length !== 1 ? "s" : ""} in this session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {handoffs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No local handoffs for this session.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {handoffs.map((handoff, idx) => (
                  <TableRow key={handoff.eventId ?? `handoff-${idx}`}>
                    <TableCell className="font-mono">{idx + 1}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(handoff.timestamp)}</TableCell>
                    <TableCell>{handoff.userId}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">{handoff.method}</code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
