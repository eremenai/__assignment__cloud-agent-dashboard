"use client";

/**
 * Recent sessions table for a specific user.
 */

import Link from "next/link";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { StatusBadge, EmptyState } from "@/components/analytics";
import type { SessionWithMetrics } from "@/lib/types/domain";
import { formatCurrency, formatDuration, formatDate, formatSessionId } from "@/lib/format";

interface UserSessionsTableProps {
	sessions: SessionWithMetrics[];
}

export function UserSessionsTable({ sessions }: UserSessionsTableProps) {
	if (sessions.length === 0) {
		return (
			<EmptyState
				title="No sessions"
				description="This user hasn't created any sessions in the selected time range."
			/>
		);
	}

	return (
		<div className="rounded-lg border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[140px]">Session</TableHead>
						<TableHead className="w-[140px]">Date</TableHead>
						<TableHead className="w-[80px]">Runs</TableHead>
						<TableHead className="w-[100px]">Status</TableHead>
						<TableHead className="w-[100px]">Duration</TableHead>
						<TableHead className="w-[80px] text-right">Cost</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sessions.slice(0, 10).map((session) => {
						const hasFailures = session.failedRunCount > 0;
						return (
							<TableRow key={session.sessionId}>
								<TableCell>
									<Link
										href={`/sessions/${session.sessionId}`}
										className="font-mono text-sm hover:underline"
									>
										{formatSessionId(session.sessionId)}
									</Link>
								</TableCell>
								<TableCell className="text-muted-foreground">
									{formatDate(session.createdAt)}
								</TableCell>
								<TableCell>{session.runCount}</TableCell>
								<TableCell>
									{hasFailures ? (
										<StatusBadge status="FAILED" />
									) : (
										<StatusBadge status="SUCCEEDED" />
									)}
								</TableCell>
								<TableCell>{formatDuration(session.lifespanMs)}</TableCell>
								<TableCell className="text-right font-medium">
									{formatCurrency(session.totalCostCents / 100)}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
