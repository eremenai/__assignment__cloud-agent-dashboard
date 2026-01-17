"use client";

/**
 * Organization rankings table.
 */

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OrgWithMetrics } from "@/lib/types/domain";
import { formatNumber, formatCurrency, formatPercent } from "@/lib/format";

interface OrgRankingsTableProps {
	orgs: OrgWithMetrics[];
}

function TrendBadge({ trend }: { trend: "improving" | "declining" | "stable" }) {
	if (trend === "improving") {
		return <Badge variant="outline" className="text-green-600 border-green-600">Improving</Badge>;
	}
	if (trend === "declining") {
		return <Badge variant="outline" className="text-red-600 border-red-600">Declining</Badge>;
	}
	return <Badge variant="outline" className="text-gray-600 border-gray-600">Stable</Badge>;
}

export function OrgRankingsTable({ orgs }: OrgRankingsTableProps) {
	// Sort by total runs (highest first)
	const sortedOrgs = [...orgs].sort((a, b) => b.runCount - a.runCount);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Organization Rankings</CardTitle>
				<CardDescription>By total runs in period</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[40px]">#</TableHead>
							<TableHead className="w-[200px]">Organization</TableHead>
							<TableHead className="w-[80px] text-right">Users</TableHead>
							<TableHead className="w-[100px] text-right">Sessions</TableHead>
							<TableHead className="w-[100px] text-right">Runs</TableHead>
							<TableHead className="w-[100px] text-right">Success %</TableHead>
							<TableHead className="w-[100px] text-right">Cost</TableHead>
							<TableHead className="w-[100px]">Trend</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedOrgs.map((org, index) => (
							<TableRow key={org.orgId}>
								<TableCell className="font-mono text-muted-foreground">
									{index + 1}
								</TableCell>
								<TableCell className="font-medium">{org.name}</TableCell>
								<TableCell className="text-right">
									{formatNumber(org.activeUserCount)}
								</TableCell>
								<TableCell className="text-right">
									{formatNumber(org.sessionCount)}
								</TableCell>
								<TableCell className="text-right font-medium">
									{formatNumber(org.runCount)}
								</TableCell>
								<TableCell className="text-right">
									<span
										className={
											org.successRate >= 90
												? "text-green-600"
												: org.successRate >= 70
													? "text-amber-600"
													: "text-red-600"
										}
									>
										{formatPercent(org.successRate)}
									</span>
								</TableCell>
								<TableCell className="text-right">
									{formatCurrency(org.totalCostCents / 100)}
								</TableCell>
								<TableCell>
									<TrendBadge trend={org.trend} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
