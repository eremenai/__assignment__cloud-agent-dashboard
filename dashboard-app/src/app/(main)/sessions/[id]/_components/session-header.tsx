"use client";

/**
 * Session header component with session info and KPIs.
 */

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { KPICard, KPIRow, StatusBadge } from "@/components/analytics";
import type { SessionWithMetrics } from "@/lib/types/domain";
import { formatCurrency, formatDuration, formatDate, formatPercent, formatSessionId } from "@/lib/format";
import { getInitials } from "@/lib/utils";

interface SessionHeaderProps {
	session: SessionWithMetrics;
}

export function SessionHeader({ session }: SessionHeaderProps) {
	return (
		<div className="space-y-6">
			{/* Back link and title */}
			<div className="flex items-start gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/sessions">
						<ArrowLeft className="h-4 w-4" />
						<span className="sr-only">Back to sessions</span>
					</Link>
				</Button>
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-semibold tracking-tight font-mono">
							Session {formatSessionId(session.sessionId)}
						</h1>
						<StatusBadge
							status={
								session.successRate === 100
									? "SUCCEEDED"
									: session.successRate >= 50
										? "TIMEOUT"
										: "FAILED"
							}
							label={
								session.successRate === 100
									? "All Success"
									: `${formatPercent(session.successRate)} Success`
							}
						/>
					</div>
					<div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
						<span>Started {formatDate(session.createdAt)}</span>
						<span className="flex items-center gap-2">
							<span>Created by</span>
							<Avatar className="h-5 w-5">
								<AvatarFallback className="text-[10px]">
									{getInitials(session.createdByUser.name)}
								</AvatarFallback>
							</Avatar>
							<span className="font-medium text-foreground">
								{session.createdByUser.name}
							</span>
						</span>
					</div>
				</div>
			</div>

			{/* KPI Cards */}
			<KPIRow columns={5}>
				<KPICard
					title="Lifespan"
					value={formatDuration(session.lifespanMs)}
					className="@container/card"
				/>
				<KPICard
					title="Active Time"
					value={formatDuration(session.activeTimeMs)}
					className="@container/card"
				/>
				<KPICard
					title="Runs"
					value={session.runCount.toString()}
					className="@container/card"
				/>
				<KPICard
					title="Handoffs"
					value={session.localHandoffCount.toString()}
					className="@container/card"
				/>
				<KPICard
					title="Total Cost"
					value={formatCurrency(session.totalCostCents / 100)}
					className="@container/card"
				/>
			</KPIRow>
		</div>
	);
}
