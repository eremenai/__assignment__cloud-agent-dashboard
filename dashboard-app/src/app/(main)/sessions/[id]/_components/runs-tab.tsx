"use client";

/**
 * Runs tab showing detailed run information.
 */

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { StatusBadge, EmptyState } from "@/components/analytics";
import type { Run } from "@/lib/types/domain";
import { formatCurrency, formatDuration, formatDate, formatNumber } from "@/lib/format";

interface RunsTabProps {
	runs: Run[];
}

export function RunsTab({ runs }: RunsTabProps) {
	if (runs.length === 0) {
		return (
			<EmptyState
				title="No runs"
				description="No runs have been executed in this session."
			/>
		);
	}

	// Sort runs by start time
	const sortedRuns = [...runs].sort(
		(a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
	);

	return (
		<div className="rounded-lg border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[60px]">Run</TableHead>
						<TableHead className="w-[100px]">Status</TableHead>
						<TableHead className="w-[140px]">Started</TableHead>
						<TableHead className="w-[90px]">Duration</TableHead>
						<TableHead className="w-[90px] text-right">Input Tokens</TableHead>
						<TableHead className="w-[90px] text-right">Output Tokens</TableHead>
						<TableHead className="w-[90px] text-right">Total Tokens</TableHead>
						<TableHead className="w-[80px] text-right">Cost</TableHead>
						<TableHead className="w-[120px]">Error</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sortedRuns.map((run, index) => (
						<TableRow key={run.runId}>
							<TableCell className="font-mono">#{index + 1}</TableCell>
							<TableCell>
								<StatusBadge status={run.status} />
							</TableCell>
							<TableCell className="text-muted-foreground">
								{formatDate(run.startedAt)}
							</TableCell>
							<TableCell>{formatDuration(run.executionMs)}</TableCell>
							<TableCell className="text-right">
								{formatNumber(run.inputTokens)}
							</TableCell>
							<TableCell className="text-right">
								{formatNumber(run.outputTokens)}
							</TableCell>
							<TableCell className="text-right font-medium">
								{formatNumber(run.totalTokens)}
							</TableCell>
							<TableCell className="text-right font-medium">
								{formatCurrency(run.costCents / 100)}
							</TableCell>
							<TableCell className="text-muted-foreground">
								{run.failureCategory ? (
									<span className="text-red-600">{run.failureCategory}</span>
								) : (
									"-"
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
