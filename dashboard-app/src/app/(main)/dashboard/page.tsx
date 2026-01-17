"use client";

/**
 * Org Overview Dashboard - Primary landing page.
 * Shows adoption, reliability, cost, and friction metrics.
 */

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { EmptyState } from "@/components/analytics";
import { getOrgMetrics, getOrgTrends, getSessionsList, getUsersList, getOrgFailures } from "@/dev/mock-api";
import type { OrgMetricsResponse, OrgTrendsResponse, SessionsListResponse, UsersListResponse } from "@/lib/types/api";
import type { FailureCategoryCount } from "@/lib/types/domain";

import { PlatformKPIsSection } from "./_components/platform-kpis";
import { FrictionKPIsSection } from "./_components/friction-kpis";
import { UsageTrendsChart } from "./_components/usage-trends-chart";
import { CostTrendsChart } from "./_components/cost-trends-chart";
import { FrictionTrendsChart } from "./_components/friction-trends-chart";
import { ReliabilitySection } from "./_components/reliability-section";
import { TopSessionsTable } from "./_components/top-sessions-table";
import { TopUsersTable } from "./_components/top-users-table";

export default function OrgOverviewPage() {
	const { user, currentOrgId, can } = useAuth();
	const { from, to } = useTimeRangeParams();

	const [isLoading, setIsLoading] = useState(true);
	const [metrics, setMetrics] = useState<OrgMetricsResponse | null>(null);
	const [trends, setTrends] = useState<OrgTrendsResponse | null>(null);
	const [sessions, setSessions] = useState<SessionsListResponse | null>(null);
	const [users, setUsers] = useState<UsersListResponse | null>(null);
	const [failures, setFailures] = useState<{
		categories: FailureCategoryCount[];
		totalFailures: number;
	} | null>(null);

	// Determine which org to show
	const orgId = currentOrgId ?? user?.orgId;

	useEffect(() => {
		if (!orgId) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);

		// Simulate API delay
		const timer = setTimeout(() => {
			const timeRange = { from, to };

			// Fetch all data
			const metricsData = getOrgMetrics(orgId, timeRange);
			const trendsData = getOrgTrends(orgId, timeRange);
			const sessionsData = getSessionsList(
				orgId,
				{ from, to },
				{ page: 1, pageSize: 10 },
				{ sortBy: "totalCostCents", sortOrder: "desc" },
			);
			const usersData = getUsersList(
				orgId,
				{ from, to },
				{ page: 1, pageSize: 10 },
				{ sortBy: "totalCostCents", sortOrder: "desc" },
			);
			const failuresData = getOrgFailures(orgId, timeRange);

			setMetrics(metricsData);
			setTrends(trendsData);
			setSessions(sessionsData);
			setUsers(usersData);
			setFailures(failuresData);
			setIsLoading(false);
		}, 300);

		return () => clearTimeout(timer);
	}, [orgId, from, to]);

	// Show empty state if no org context
	if (!orgId && !isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<EmptyState
					title="Select an Organization"
					description="Choose an organization from the dropdown to view its dashboard."
				/>
			</div>
		);
	}

	return (
		<div className="@container/main space-y-6">
			{/* Page Header */}
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
				<p className="text-muted-foreground">
					Platform health and adoption metrics
				</p>
			</div>

			{/* Platform KPIs */}
			<section>
				<h2 className="mb-3 text-sm font-medium text-muted-foreground">Platform</h2>
				<PlatformKPIsSection data={metrics?.platform ?? null} isLoading={isLoading} />
			</section>

			{/* Friction KPIs */}
			<section>
				<h2 className="mb-3 text-sm font-medium text-muted-foreground">Session Friction</h2>
				<FrictionKPIsSection data={metrics?.friction ?? null} isLoading={isLoading} />
			</section>

			{/* Charts Row */}
			<section className="grid gap-4 @3xl/main:grid-cols-2">
				{trends && (
					<>
						<UsageTrendsChart
							usageData={trends.usage}
							sessionsData={trends.sessions}
						/>
						<CostTrendsChart costData={trends.cost} />
					</>
				)}
			</section>

			{/* Friction & Reliability Row */}
			<section className="grid gap-4 @3xl/main:grid-cols-2">
				{trends && failures && (
					<>
						<FrictionTrendsChart frictionData={trends.friction} />
						<ReliabilitySection
							reliabilityData={trends.reliability}
							failures={failures}
						/>
					</>
				)}
			</section>

			{/* Tables */}
			{sessions && <TopSessionsTable sessions={sessions.data.slice(0, 10)} />}
			{users && can("view_users_list") && <TopUsersTable users={users.data.slice(0, 10)} />}
		</div>
	);
}
