"use client";

/**
 * Visual timeline bar showing session activity at a glance.
 * Displays runs, handoffs, and idle periods as colored segments.
 * Clicking on a segment scrolls to the corresponding event in the timeline.
 */

import { useCallback, useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDuration, formatNumber, formatTime } from "@/lib/format";
import type { LocalHandoffEvent, Run } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface SessionTimelineBarProps {
  sessionStart: Date;
  sessionEnd: Date;
  runs: Run[];
  handoffs: LocalHandoffEvent[];
  onRunClick?: (runId: string) => void;
  onHandoffClick?: (handoffId: string) => void;
}

interface TimelineSegment {
  id: string;
  type: "run" | "handoff" | "idle";
  startMs: number;
  endMs: number;
  status?: "SUCCEEDED" | "FAILED" | "TIMEOUT" | "CANCELED";
  label: string;
  details: React.ReactNode;
  clickTarget?: string;
}

const statusColors = {
  SUCCEEDED: "bg-gradient-to-b from-green-400 to-green-500 border-green-600",
  FAILED: "bg-gradient-to-b from-red-400 to-red-500 border-red-600",
  TIMEOUT: "bg-gradient-to-b from-amber-400 to-amber-500 border-amber-600",
  CANCELED: "bg-gradient-to-b from-gray-300 to-gray-400 border-gray-500",
};

const statusLabels = {
  SUCCEEDED: "Success",
  FAILED: "Failed",
  TIMEOUT: "Timeout",
  CANCELED: "Canceled",
};

export function SessionTimelineBar({
  sessionStart,
  sessionEnd,
  runs,
  handoffs,
  onRunClick,
  onHandoffClick,
}: SessionTimelineBarProps) {
  const segments = useMemo(() => {
    const sessionStartMs = sessionStart.getTime();
    const sessionEndMs = sessionEnd.getTime();
    const totalDurationMs = sessionEndMs - sessionStartMs;

    if (totalDurationMs <= 0) return [];

    // Create segments from runs and handoffs
    const allSegments: TimelineSegment[] = [];

    // Add run segments
    runs.forEach((run, index) => {
      const runStartMs = run.startedAt.getTime() - sessionStartMs;
      const runEndMs = run.completedAt.getTime() - sessionStartMs;
      allSegments.push({
        id: run.runId,
        type: "run",
        startMs: runStartMs,
        endMs: runEndMs,
        status: run.status,
        label: `Run #${index + 1}`,
        details: (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-medium text-xs",
                  run.status === "SUCCEEDED" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                  run.status === "FAILED" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                  run.status === "TIMEOUT" && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                  run.status === "CANCELED" && "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
                )}
              >
                {statusLabels[run.status]}
              </span>
            </div>
            <div className="space-y-0.5 text-xs">
              <p>
                <span className="text-muted-foreground">Duration:</span> {formatDuration(run.executionMs)}
              </p>
              <p>
                <span className="text-muted-foreground">Cost:</span> {formatCurrency(run.costCents / 100)}
              </p>
              <p>
                <span className="text-muted-foreground">Tokens:</span> {formatNumber(run.totalTokens)} (
                {formatNumber(run.inputTokens)} in / {formatNumber(run.outputTokens)} out)
              </p>
              {run.failureCategory && (
                <p className="text-red-600">
                  <span className="text-muted-foreground">Error:</span> {run.failureCategory}
                </p>
              )}
            </div>
            <p className="mt-2 text-muted-foreground text-xs">Click to scroll to event</p>
          </div>
        ),
        clickTarget: `event-run-${run.runId}`,
      });
    });

    // Add handoff segments (as thin markers)
    handoffs.forEach((handoff, index) => {
      const handoffMs = handoff.timestamp.getTime() - sessionStartMs;
      allSegments.push({
        id: handoff.handoffId,
        type: "handoff",
        startMs: handoffMs,
        endMs: handoffMs + totalDurationMs * 0.01, // 1% width for visibility
        label: `Handoff #${index + 1}`,
        details: (
          <div className="space-y-1">
            <p className="text-xs">
              <span className="text-muted-foreground">Method:</span> {handoff.method}
            </p>
            <p className="mt-2 text-muted-foreground text-xs">Click to scroll to event</p>
          </div>
        ),
        clickTarget: `event-handoff-${handoff.handoffId}`,
      });
    });

    // Sort by start time
    allSegments.sort((a, b) => a.startMs - b.startMs);

    // Fill gaps with idle segments
    const withIdle: TimelineSegment[] = [];
    let lastEndMs = 0;

    allSegments.forEach((segment) => {
      if (segment.startMs > lastEndMs) {
        // Add idle segment
        withIdle.push({
          id: `idle-${lastEndMs}`,
          type: "idle",
          startMs: lastEndMs,
          endMs: segment.startMs,
          label: "Idle",
          details: <p className="text-muted-foreground text-xs">{formatDuration(segment.startMs - lastEndMs)}</p>,
        });
      }
      withIdle.push(segment);
      lastEndMs = Math.max(lastEndMs, segment.endMs);
    });

    // Add trailing idle if needed
    if (lastEndMs < totalDurationMs) {
      withIdle.push({
        id: `idle-${lastEndMs}`,
        type: "idle",
        startMs: lastEndMs,
        endMs: totalDurationMs,
        label: "Idle",
        details: <p className="text-muted-foreground text-xs">{formatDuration(totalDurationMs - lastEndMs)}</p>,
      });
    }

    // Calculate percentages
    return withIdle.map((segment) => ({
      ...segment,
      startPercent: (segment.startMs / totalDurationMs) * 100,
      widthPercent: ((segment.endMs - segment.startMs) / totalDurationMs) * 100,
    }));
  }, [sessionStart, sessionEnd, runs, handoffs]);

  const handleSegmentClick = useCallback(
    (segment: TimelineSegment & { startPercent: number; widthPercent: number }) => {
      if (!segment.clickTarget) return;

      // Try to find and scroll to the element
      const element = document.getElementById(segment.clickTarget);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Highlight the element briefly
        element.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
        }, 2000);
      }

      // Also call the callback if provided
      if (segment.type === "run" && onRunClick) {
        onRunClick(segment.id);
      } else if (segment.type === "handoff" && onHandoffClick) {
        onHandoffClick(segment.id);
      }
    },
    [onRunClick, onHandoffClick],
  );

  if (segments.length === 0) {
    return null;
  }

  const totalDuration = sessionEnd.getTime() - sessionStart.getTime();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header with time labels */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground text-sm">Session Timeline</span>
            <span className="text-muted-foreground text-xs">({formatDuration(totalDuration)})</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-xs">
            <span>{formatTime(sessionStart)}</span>
            <span className="text-muted-foreground/50">→</span>
            <span>{formatTime(sessionEnd)}</span>
          </div>
        </div>

        {/* Timeline bar */}
        <div className="px-4 py-3">
          <TooltipProvider>
            <div className="relative h-10 overflow-hidden rounded-lg border border-border/50 bg-muted/50">
              {segments.map((segment, _index) => (
                <Tooltip key={segment.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute top-0 h-full transition-all hover:shadow-sm hover:brightness-110",
                        segment.clickTarget && "cursor-pointer",
                        segment.type === "run" && segment.status && statusColors[segment.status],
                        segment.type === "handoff" && "border-teal-600 bg-gradient-to-b from-teal-400 to-teal-500",
                        segment.type === "idle" && "bg-muted-foreground/5",
                        segment.type !== "idle" && "border-r",
                      )}
                      style={{
                        left: `${segment.startPercent}%`,
                        width: `${Math.max(segment.widthPercent, 0.5)}%`,
                      }}
                      onClick={() => handleSegmentClick(segment)}
                    >
                      {/* Run number indicator for larger segments */}
                      {segment.type === "run" && segment.widthPercent > 8 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-semibold text-[10px] text-white/90 drop-shadow-sm">
                            {segment.label.replace("Run ", "")}
                          </span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="text-sm">
                      <p className="mb-1 font-medium">{segment.label}</p>
                      {segment.details}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {/* Compact Legend */}
          <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-green-500" />
              <span>Success</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-red-500" />
              <span>Failed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-amber-500" />
              <span>Timeout</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-teal-500" />
              <span>Handoff</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-muted-foreground/20" />
              <span>Idle</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
