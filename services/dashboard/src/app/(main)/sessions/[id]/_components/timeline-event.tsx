"use client";

/**
 * Timeline event component for displaying individual events.
 */

import { useEffect, useRef, useState } from "react";

import { ArrowUpRight, Bot, CheckCircle, Clock, MessageSquare, Play, XCircle, XOctagon } from "lucide-react";

import { formatCurrency, formatDuration, formatNumber } from "@/lib/format";
import type { Event, LocalHandoffEvent, Run } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface TimelineEventProps {
  event: Event;
  runs: Run[];
  handoffs: LocalHandoffEvent[];
  isHighlighted?: boolean;
  onHighlightComplete?: () => void;
  isLast?: boolean;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function RunEndDetails({ run }: { run: Run }) {
  return (
    <div className="mt-2 space-y-2 rounded-md bg-muted/50 p-3 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <div>
          <span className="text-muted-foreground text-xs">Duration</span>
          <p className="font-medium">{formatDuration(run.executionMs)}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Cost</span>
          <p className="font-medium">{formatCurrency(run.costCents / 100)}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Input Tokens</span>
          <p className="font-medium">{formatNumber(run.inputTokens)}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Output Tokens</span>
          <p className="font-medium">{formatNumber(run.outputTokens)}</p>
        </div>
      </div>
      {run.failureCategory && (
        <div className="rounded border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950">
          <span className="font-medium text-red-700 dark:text-red-400">Error: </span>
          <span className="text-red-600 dark:text-red-300">{run.failureCategory}</span>
          {run.errorType && (
            <span className="ml-2 text-red-500 text-xs">({run.errorType})</span>
          )}
        </div>
      )}
    </div>
  );
}

function MessageDetails({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="mt-2 max-h-32 overflow-hidden rounded-md bg-muted/50 p-3">
      <p className="line-clamp-4 whitespace-pre-wrap text-sm">{content}</p>
    </div>
  );
}

function RunEndDetailsFromPayload({
  durationMs,
  costCents,
  totalTokens,
  failureCategory,
}: {
  durationMs: number;
  costCents: number;
  totalTokens: number;
  failureCategory?: string;
}) {
  return (
    <div className="mt-2 space-y-2 rounded-md bg-muted/50 p-3 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        <div>
          <span className="text-muted-foreground text-xs">Duration</span>
          <p className="font-medium">{formatDuration(durationMs)}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Cost</span>
          <p className="font-medium">{formatCurrency(costCents / 100)}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Total Tokens</span>
          <p className="font-medium">{formatNumber(totalTokens)}</p>
        </div>
      </div>
      {failureCategory && (
        <div className="rounded border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950">
          <span className="font-medium text-red-700 dark:text-red-400">Error: </span>
          <span className="text-red-600 dark:text-red-300">{failureCategory}</span>
        </div>
      )}
    </div>
  );
}

export function TimelineEvent({
  event,
  runs,
  handoffs: _handoffs,
  isHighlighted,
  onHighlightComplete,
  isLast,
}: TimelineEventProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showHighlight, setShowHighlight] = useState(false);
  const timestamp = new Date(event.timestamp);

  // Handle highlight animation
  useEffect(() => {
    if (isHighlighted && ref.current) {
      // Scroll into view
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      // Show highlight
      setShowHighlight(true);
      // Fade out after a delay
      const timer = setTimeout(() => {
        setShowHighlight(false);
        onHighlightComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, onHighlightComplete]);

  // Determine event type and content
  let icon: React.ReactNode;
  let title: string;
  let details: React.ReactNode = null;
  let iconColor = "text-gray-400";
  let eventId: string | undefined;

  const payload = event.payload;
  const eventType = event.type ?? payload?.type;

  switch (eventType) {
    case "MESSAGE":
    case "message_created": {
      const msgPayload = payload as { content?: string; preview?: string } | undefined;
      const content = msgPayload?.preview || msgPayload?.content || "";
      eventId = `event-${event.eventId}`;
      if (event.actorType === "user") {
        icon = <MessageSquare className="h-4 w-4" />;
        iconColor = "text-blue-500";
        title = "User message";
      } else {
        icon = <Bot className="h-4 w-4" />;
        iconColor = "text-purple-500";
        title = "Agent response";
      }
      if (content) {
        details = <MessageDetails content={content} />;
      }
      break;
    }

    case "RUN_START":
    case "run_started": {
      const runStartPayload = payload as { runNumber?: number; runId?: string } | undefined;
      icon = <Play className="h-4 w-4" />;
      iconColor = "text-blue-400";
      title = `Run #${runStartPayload?.runNumber ?? "?"} started`;
      eventId = `event-run-start-${runStartPayload?.runId}`;
      break;
    }

    case "RUN_END":
    case "run_completed": {
      const runEndPayload = payload as {
        runId?: string;
        runNumber?: number;
        status?: string;
        durationMs?: number;
        costCents?: number;
        totalTokens?: number;
        failureCategory?: string;
      } | undefined;
      const run = runs.find((r) => r.runId === runEndPayload?.runId);
      const status = run?.status ?? runEndPayload?.status;
      eventId = `event-run-${runEndPayload?.runId}`;

      if (status === "SUCCEEDED" || status === "success") {
        icon = <CheckCircle className="h-4 w-4" />;
        iconColor = "text-green-500";
        title = `Run #${runEndPayload?.runNumber ?? "?"} completed successfully`;
      } else if (status === "FAILED" || status === "fail") {
        icon = <XCircle className="h-4 w-4" />;
        iconColor = "text-red-500";
        title = `Run #${runEndPayload?.runNumber ?? "?"} failed`;
      } else if (status === "TIMEOUT" || status === "timeout") {
        icon = <Clock className="h-4 w-4" />;
        iconColor = "text-amber-500";
        title = `Run #${runEndPayload?.runNumber ?? "?"} timed out`;
      } else if (status === "cancelled") {
        icon = <XOctagon className="h-4 w-4" />;
        iconColor = "text-gray-500";
        title = `Run #${runEndPayload?.runNumber ?? "?"} cancelled`;
      } else {
        icon = <XOctagon className="h-4 w-4" />;
        iconColor = "text-gray-500";
        title = `Run #${runEndPayload?.runNumber ?? "?"} ended`;
      }

      // Show run details from either run object or payload
      if (run) {
        details = <RunEndDetails run={run} />;
      } else if (runEndPayload?.durationMs !== undefined || runEndPayload?.costCents !== undefined) {
        // Create a partial run object from payload data
        details = (
          <RunEndDetailsFromPayload
            durationMs={runEndPayload.durationMs ?? 0}
            costCents={runEndPayload.costCents ?? 0}
            totalTokens={runEndPayload.totalTokens ?? 0}
            failureCategory={runEndPayload.failureCategory}
          />
        );
      }
      break;
    }

    case "HANDOFF":
    case "local_handoff": {
      const handoffPayload = payload as { method?: string; handoffId?: string; userId?: string } | undefined;
      icon = <ArrowUpRight className="h-4 w-4" />;
      iconColor = "text-teal-500";
      const method = handoffPayload?.method ?? "unknown";
      title = `Local handoff via ${method}`;
      eventId = `event-handoff-${handoffPayload?.handoffId}`;

      details = (
        <div className="mt-2 rounded-md bg-teal-50 p-2 text-sm dark:bg-teal-950">
          <span className="text-teal-700 dark:text-teal-300">
            User transferred work locally using <span className="font-medium">{method}</span>
          </span>
        </div>
      );
      break;
    }

    default:
      icon = <MessageSquare className="h-4 w-4" />;
      iconColor = "text-gray-400";
      title = `Event: ${eventType || "unknown"}`;
  }

  return (
    <div
      ref={ref}
      id={eventId}
      className={cn(
        "-mx-2 flex gap-4 rounded-lg px-2 transition-all duration-500",
        isLast ? "pb-0" : "pb-6",
        showHighlight && "bg-primary/10",
      )}
    >
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={cn("rounded-full border bg-background p-1.5", iconColor)}>{icon}</div>
        {!isLast && <div className="mt-2 w-px flex-1 bg-border" />}
      </div>

      {/* Event content */}
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">{formatTime(timestamp)}</span>
          <span className="font-medium">{title}</span>
        </div>
        {details}
      </div>
    </div>
  );
}
