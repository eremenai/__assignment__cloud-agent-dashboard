"use client";

/**
 * Timeline tab showing chronological event list.
 */

import { EmptyState } from "@/components/analytics";
import type { Event, LocalHandoffEvent, Run } from "@/lib/types/domain";

import { TimelineEvent } from "./timeline-event";

interface TimelineTabProps {
  events: Event[];
  runs: Run[];
  handoffs: LocalHandoffEvent[];
  highlightedRunId?: string | null;
  onHighlightComplete?: () => void;
}

export function TimelineTab({ events, runs, handoffs, highlightedRunId, onHighlightComplete }: TimelineTabProps) {
  if (events.length === 0) {
    return <EmptyState title="No events yet" description="Session started but no activity has been recorded." />;
  }

  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Find the event that matches the highlighted run (RUN_END event)
  const getIsHighlighted = (event: Event): boolean => {
    if (!highlightedRunId) return false;
    const payload = event.payload as { type?: string; runId?: string } | undefined;
    if ((payload?.type === "RUN_END" || payload?.type === "run_completed") && payload?.runId === highlightedRunId) {
      return true;
    }
    return false;
  };

  return (
    <div className="py-4">
      {sortedEvents.map((event, index) => (
        <TimelineEvent
          key={event.eventId}
          event={event}
          runs={runs}
          handoffs={handoffs}
          isHighlighted={getIsHighlighted(event)}
          onHighlightComplete={onHighlightComplete}
          isLast={index === sortedEvents.length - 1}
        />
      ))}
    </div>
  );
}
