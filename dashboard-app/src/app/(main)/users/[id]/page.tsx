"use client";

/**
 * User Detail Page - Deep-dive view into a single user.
 */

import { use, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/analytics";
import { useAuth } from "@/lib/auth";
import { useTimeRangeParams } from "@/components/layout/time-range-selector";
import { getUserDetail, getUserSessions } from "@/dev/mock-api";
import type { UserDetailResponse, SessionWithMetrics } from "@/lib/types";

import { UserHeader } from "./_components/user-header";
import { UserKPIs } from "./_components/user-kpis";
import { UserActivityChart } from "./_components/user-activity-chart";
import { UserCostChart } from "./_components/user-cost-chart";
import { UserFrictionChart } from "./_components/user-friction-chart";
import { UserSessionsTable } from "./_components/user-sessions-table";

interface UserDetailPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
	const resolvedParams = use(params);
	const { user: authUser, canViewUser } = useAuth();
	const { from, to } = useTimeRangeParams();

	const [isLoading, setIsLoading] = useState(true);
	const [data, setData] = useState<UserDetailResponse | null>(null);
	const [sessions, setSessions] = useState<SessionWithMetrics[]>([]);

	useEffect(() => {
		setIsLoading(true);

		const timer = setTimeout(() => {
			const userDetail = getUserDetail(resolvedParams.id, { from, to });
			const userSessions = getUserSessions(resolvedParams.id, { from, to });
			setData(userDetail);
			setSessions(userSessions);
			setIsLoading(false);
		}, 200);

		return () => clearTimeout(timer);
	}, [resolvedParams.id, from, to]);

	// Loading state
	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-muted-foreground">Loading user...</p>
			</div>
		);
	}

	// User not found
	if (!data) {
		return (
			<div className="flex h-full items-center justify-center">
				<EmptyState
					title="User not found"
					description="The user you're looking for doesn't exist or you don't have access to it."
					actionLabel="Back to Users"
					onAction={() => (window.location.href = "/users")}
				/>
			</div>
		);
	}

	// Permission check - MEMBER can only view themselves
	if (!canViewUser(resolvedParams.id)) {
		return (
			<div className="flex h-full items-center justify-center">
				<EmptyState
					title="Access denied"
					description="You don't have permission to view this user."
					actionLabel="Back to Dashboard"
					onAction={() => (window.location.href = "/dashboard")}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* User Header */}
			<UserHeader user={data.user} />

			{/* KPIs */}
			<UserKPIs user={data.user} />

			{/* Charts */}
			<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
				<UserActivityChart data={data.trends.activity} />
				<UserCostChart data={data.trends.cost} />
				<UserFrictionChart data={data.trends.friction} />
			</div>

			{/* Recent Sessions */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Sessions</CardTitle>
				</CardHeader>
				<CardContent>
					<UserSessionsTable sessions={sessions} />
				</CardContent>
			</Card>
		</div>
	);
}
