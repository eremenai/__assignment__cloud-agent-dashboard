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
    <div className="mt-2 space-y-1 rounded-md bg-muted/50 p-3 text-sm">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <span className="text-muted-foreground">Duration:</span> {formatDuration(run.executionMs)}
        </span>
        <span>
          <span className="text-muted-foreground">Cost:</span> {formatCurrency(run.costCents / 100)}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <span className="text-muted-foreground">Tokens:</span> {formatNumber(run.totalTokens)}
        </span>
        <span className="text-muted-foreground">
          ({formatNumber(run.inputTokens)} in / {formatNumber(run.outputTokens)} out)
        </span>
      </div>
      {run.failureCategory && (
        <div className="text-red-600">
          <span className="text-muted-foreground">Error:</span> {run.failureCategory}
        </div>
      )}
    </div>
  );
}

export function TimelineEvent({
  event,
  runs,
  handoffs,
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
    case "message_created":
      if (event.actorType === "user") {
        icon = <MessageSquare className="h-4 w-4" />;
        iconColor = "text-blue-500";
        title = "User message";
      } else {
        icon = <Bot className="h-4 w-4" />;
        iconColor = "text-purple-500";
        title = "Agent response";
      }
      details = payload && 'preview' in payload ? (
        <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">{payload.preview || (payload as { content?: string }).content}</p>
      ) : null;
      break;

    case "RUN_START":
    case "run_started": {
      const runStartPayload = payload as { runNumber?: number } | undefined;
      icon = <Play className="h-4 w-4" />;
      iconColor = "text-gray-400";
      title = `Run #${runStartPayload?.runNumber ?? "?"} started`;
      break;
    }

    case "RUN_END":
    case "run_completed": {
      const runEndPayload = payload as { runId?: string; runNumber?: number; status?: string } | undefined;
      const run = runs.find((r) => r.runId === runEndPayload?.runId);
      const status = runEndPayload?.status;
      eventId = `event-run-${runEndPayload?.runId}`;

      if (status === "SUCCEEDED" || status === "success") {
        icon = <CheckCircle className="h-4 w-4" />;
        iconColor = "text-green-500";
        title = `Run #${runEndPayload?.runNumber ?? "?"} completed (Success)`;
      } else if (status === "FAILED" || status === "fail") {
        icon = <XCircle className="h-4 w-4" />;
        iconColor = "text-red-500";
        title = `Run #${runEndPayload?.runNumber ?? "?"} failed`;
      } else if (status === "TIMEOUT" || status === "timeout") {
        icon = <Clock className="h-4 w-4" />;
        iconColor = "text-amber-500";
        title = `Run #${runEndPayload?.runNumber ?? "?"} timed out`;
      } else {
        icon = <XOctagon className="h-4 w-4" />;
        iconColor = "text-gray-500";
        title = `Run #${runEndPayload?.runNumber ?? "?"} canceled`;
      }

      if (run) {
        details = <RunEndDetails run={run} />;
      }
      break;
    }

    case "HANDOFF":
    case "local_handoff": {
      const handoffPayload = payload as { method?: string; handoffId?: string } | undefined;
      icon = <ArrowUpRight className="h-4 w-4" />;
      iconColor = "text-teal-500";
      title = `Local handoff (${handoffPayload?.method ?? "unknown"})`;
      eventId = `event-handoff-${handoffPayload?.handoffId}`;
      const handoff = handoffs.find((h) => h.handoffId === handoffPayload?.handoffId);
      if (handoff) {
        details = <p className="mt-1 text-muted-foreground text-sm">User: {handoff.userId}</p>;
      }
      break;
    }

    default:
      title = "Unknown event";
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
