"use client";

/**
 * Global Overview Page - Cross-org view for SUPER_ADMIN users.
 */

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/analytics";
import { useAuth } from "@/lib/auth";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { getGlobalMetrics, getGlobalOrgs } from "@/dev/mock-api";
import type { GlobalKPIs, OrgWithMetrics } from "@/lib/types/domain";

import { GlobalKPIsSection } from "./_components/global-kpis";
import { OrgRankingsTable } from "./_components/org-rankings-table";
import { OrgHealthTable } from "./_components/org-health-table";

interface GlobalData {
	kpis: GlobalKPIs;
	orgs: OrgWithMetrics[];
}

export default function GlobalOverviewPage() {
	const { can } = useAuth();
	const { from, to } = useTimeRangeParams();

	const [isLoading, setIsLoading] = useState(true);
	const [data, setData] = useState<GlobalData | null>(null);

	// Permission check
	const canViewGlobal = can("view_global_overview");

	useEffect(() => {
		if (!canViewGlobal) return;

		setIsLoading(true);

		const timer = setTimeout(() => {
			const metrics = getGlobalMetrics({ from, to });
			const orgs = getGlobalOrgs(
				{ page: 1, pageSize: 100 },
				{ sortBy: "runCount", sortOrder: "desc" }
			);
			setData({
				kpis: metrics.kpis,
				orgs: orgs.data,
			});
			setIsLoading(false);
		}, 200);

		return () => clearTimeout(timer);
	}, [from, to, canViewGlobal]);

	// Access denied for non-SUPER_ADMIN
	if (!canViewGlobal) {
		return (
			<div className="flex h-full items-center justify-center">
				<EmptyState
					title="Access denied"
					description="Only Super Administrators can access the global overview."
					actionLabel="Back to Dashboard"
					onAction={() => (window.location.href = "/dashboard")}
				/>
			</div>
		);
	}

	// Loading state
	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-muted-foreground">Loading global overview...</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold">Global Overview</h1>
				<p className="text-muted-foreground">
					Platform-wide metrics across all organizations.
				</p>
			</div>

			{/* Global KPIs */}
			<GlobalKPIsSection kpis={data.kpis} />

			{/* Organization Tables */}
			<div className="grid gap-6 xl:grid-cols-2">
				<OrgRankingsTable orgs={data.orgs} />
				<OrgHealthTable orgs={data.orgs} />
			</div>
		</div>
	);
}
