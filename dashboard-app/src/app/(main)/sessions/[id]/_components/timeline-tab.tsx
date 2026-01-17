"use client";

/**
 * Timeline tab showing chronological event list.
 */

import type { Event, Run, LocalHandoffEvent } from "@/lib/types/domain";
import { EmptyState } from "@/components/analytics";
import { TimelineEvent } from "./timeline-event";

interface TimelineTabProps {
	events: Event[];
	runs: Run[];
	handoffs: LocalHandoffEvent[];
}

export function TimelineTab({ events, runs, handoffs }: TimelineTabProps) {
	if (events.length === 0) {
		return (
			<EmptyState
				title="No events yet"
				description="Session started but no activity has been recorded."
			/>
		);
	}

	// Sort events by timestamp
	const sortedEvents = [...events].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
	);

	return (
		<div className="py-4">
			{sortedEvents.map((event) => (
				<TimelineEvent
					key={event.eventId}
					event={event}
					runs={runs}
					handoffs={handoffs}
				/>
			))}
		</div>
	);
}
