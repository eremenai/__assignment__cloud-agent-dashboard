"use client";

/**
 * Top sessions table showing the most significant sessions.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/analytics";
import type { SessionWithMetrics } from "@/lib/types/domain";
import { formatCurrency, formatDuration, formatRelativeTime, formatSessionId, formatPercent } from "@/lib/format";

interface TopSessionsTableProps {
	sessions: SessionWithMetrics[];
	className?: string;
}

export function TopSessionsTable({ sessions, className }: TopSessionsTableProps) {
	return (
		<Card className={className}>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>Top Sessions</CardTitle>
					<CardDescription>Sessions with highest cost or activity</CardDescription>
				</div>
				<Button variant="ghost" size="sm" asChild>
					<Link href="/sessions">
						View all <ChevronRight className="ml-1 h-4 w-4" />
					</Link>
				</Button>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Session</TableHead>
							<TableHead>Started</TableHead>
							<TableHead>Lifespan</TableHead>
							<TableHead className="text-right">Runs</TableHead>
							<TableHead className="text-right">Handoffs</TableHead>
							<TableHead className="text-right">Success</TableHead>
							<TableHead className="text-right">Cost</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sessions.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="text-center text-muted-foreground">
									No sessions in this period
								</TableCell>
							</TableRow>
						) : (
							sessions.map((session) => (
								<TableRow key={session.sessionId} className="cursor-pointer hover:bg-muted/50">
									<TableCell>
										<Link
											href={`/sessions/${session.sessionId}`}
											className="font-mono text-sm text-primary hover:underline"
										>
											{formatSessionId(session.sessionId)}
										</Link>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{formatRelativeTime(session.createdAt)}
									</TableCell>
									<TableCell>{formatDuration(session.lifespanMs)}</TableCell>
									<TableCell className="text-right">{session.runCount}</TableCell>
									<TableCell className="text-right">{session.localHandoffCount}</TableCell>
									<TableCell className="text-right">
										{session.runCount > 0 ? (
											<StatusBadge
												status={session.successRate >= 90 ? "SUCCEEDED" : session.successRate >= 50 ? "TIMEOUT" : "FAILED"}
												label={formatPercent(session.successRate)}
											/>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatCurrency(session.totalCostCents / 100)}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
