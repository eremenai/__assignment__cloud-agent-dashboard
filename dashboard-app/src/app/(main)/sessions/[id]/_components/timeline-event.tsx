"use client";

/**
 * Timeline event component for displaying individual events.
 */

import { Play, CheckCircle, XCircle, Clock, XOctagon, MessageSquare, Bot, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Event, Run, LocalHandoffEvent } from "@/lib/types/domain";
import { formatDuration, formatCurrency } from "@/lib/format";

interface TimelineEventProps {
	event: Event;
	runs: Run[];
	handoffs: LocalHandoffEvent[];
}

function formatTime(date: Date): string {
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
}

function RunEndDetails({ run }: { run: Run }) {
	return (
		<div className="mt-1 text-sm text-muted-foreground">
			<span>Duration: {formatDuration(run.executionMs)}</span>
			<span className="mx-2">|</span>
			<span>Cost: {formatCurrency(run.costCents / 100)}</span>
			<span className="mx-2">|</span>
			<span>{run.totalTokens.toLocaleString()} tokens</span>
			{run.failureCategory && (
				<>
					<span className="mx-2">|</span>
					<span className="text-red-600">Error: {run.failureCategory}</span>
				</>
			)}
		</div>
	);
}

export function TimelineEvent({ event, runs, handoffs }: TimelineEventProps) {
	const timestamp = new Date(event.timestamp);

	// Determine event type and content
	let icon: React.ReactNode;
	let title: string;
	let details: React.ReactNode = null;
	let iconColor = "text-gray-400";

	const payload = event.payload;

	switch (payload.type) {
		case "MESSAGE":
			if (event.actorType === "USER") {
				icon = <MessageSquare className="h-4 w-4" />;
				iconColor = "text-blue-500";
				title = "User message";
			} else {
				icon = <Bot className="h-4 w-4" />;
				iconColor = "text-purple-500";
				title = "Agent response";
			}
			details = (
				<p className="mt-1 text-sm text-muted-foreground line-clamp-2">
					{payload.preview || payload.content}
				</p>
			);
			break;

		case "RUN_START":
			icon = <Play className="h-4 w-4" />;
			iconColor = "text-gray-400";
			title = `Run #${payload.runNumber} started`;
			break;

		case "RUN_END": {
			const run = runs.find((r) => r.runId === payload.runId);
			const status = payload.status;

			if (status === "SUCCEEDED") {
				icon = <CheckCircle className="h-4 w-4" />;
				iconColor = "text-green-500";
				title = `Run #${payload.runNumber} completed (Success)`;
			} else if (status === "FAILED") {
				icon = <XCircle className="h-4 w-4" />;
				iconColor = "text-red-500";
				title = `Run #${payload.runNumber} failed`;
			} else if (status === "TIMEOUT") {
				icon = <Clock className="h-4 w-4" />;
				iconColor = "text-amber-500";
				title = `Run #${payload.runNumber} timed out`;
			} else {
				icon = <XOctagon className="h-4 w-4" />;
				iconColor = "text-gray-500";
				title = `Run #${payload.runNumber} canceled`;
			}

			if (run) {
				details = <RunEndDetails run={run} />;
			}
			break;
		}

		case "HANDOFF": {
			icon = <ArrowUpRight className="h-4 w-4" />;
			iconColor = "text-teal-500";
			title = `Local handoff (${payload.method})`;
			const handoff = handoffs.find((h) => h.handoffId === payload.handoffId);
			if (handoff) {
				details = (
					<p className="mt-1 text-sm text-muted-foreground">
						User: {handoff.userId}
					</p>
				);
			}
			break;
		}
	}

	return (
		<div className="flex gap-4 pb-6 last:pb-0">
			{/* Timeline connector */}
			<div className="flex flex-col items-center">
				<div className={cn("rounded-full p-1.5 bg-background border", iconColor)}>
					{icon}
				</div>
				<div className="flex-1 w-px bg-border mt-2" />
			</div>

			{/* Event content */}
			<div className="flex-1 pb-2">
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						{formatTime(timestamp)}
					</span>
					<span className="font-medium">{title}</span>
				</div>
				{details}
			</div>
		</div>
	);
}
