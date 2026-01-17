"use client";

/**
 * Users table with metrics and pagination.
 */

import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { RoleBadge, EmptyState } from "@/components/analytics";
import type { UserWithMetrics } from "@/lib/types/domain";
import type { PaginationMeta, SortParams } from "@/lib/types/api";
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "@/lib/format";

interface UsersTableProps {
	users: UserWithMetrics[];
	pagination: PaginationMeta;
	sort: SortParams;
	onPageChange: (page: number) => void;
	onSortChange: (sortBy: string) => void;
}

export function UsersTable({
	users,
	pagination,
	sort,
	onPageChange,
	onSortChange,
}: UsersTableProps) {
	if (users.length === 0) {
		return (
			<EmptyState
				title="No users found"
				description="No users match your current filters."
			/>
		);
	}

	const SortableHeader = ({
		column,
		children,
	}: {
		column: string;
		children: React.ReactNode;
	}) => (
		<TableHead
			className="cursor-pointer hover:text-foreground"
			onClick={() => onSortChange(column)}
		>
			<div className="flex items-center gap-1">
				{children}
				<ArrowUpDown
					className={`h-3 w-3 ${sort.sortBy === column ? "opacity-100" : "opacity-30"}`}
				/>
			</div>
		</TableHead>
	);

	return (
		<div className="space-y-4">
			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[200px]">User</TableHead>
							<TableHead className="w-[100px]">Role</TableHead>
							<SortableHeader column="sessionCount">Sessions</SortableHeader>
							<SortableHeader column="runCount">Runs</SortableHeader>
							<SortableHeader column="avgRunsPerSession">
								Runs/Session
							</SortableHeader>
							<SortableHeader column="successRate">Success %</SortableHeader>
							<SortableHeader column="localHandoffRate">
								Handoff %
							</SortableHeader>
							<SortableHeader column="avgActiveTimeMs">Avg Active</SortableHeader>
							<SortableHeader column="totalCostCents">Cost</SortableHeader>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((user) => (
							<TableRow key={user.userId}>
								<TableCell>
									<Link
										href={`/users/${user.userId}`}
										className="flex flex-col hover:underline"
									>
										<span className="font-medium">{user.name}</span>
										<span className="text-xs text-muted-foreground">
											{user.email}
										</span>
									</Link>
								</TableCell>
								<TableCell>
									<RoleBadge role={user.role} />
								</TableCell>
								<TableCell>{formatNumber(user.sessionCount)}</TableCell>
								<TableCell>{formatNumber(user.runCount)}</TableCell>
								<TableCell>{user.avgRunsPerSession.toFixed(1)}</TableCell>
								<TableCell>
									<span
										className={
											user.successRate >= 90
												? "text-green-600"
												: user.successRate >= 70
													? "text-amber-600"
													: "text-red-600"
										}
									>
										{formatPercent(user.successRate)}
									</span>
								</TableCell>
								<TableCell>{formatPercent(user.localHandoffRate)}</TableCell>
								<TableCell>{formatDuration(user.avgActiveTimeMs)}</TableCell>
								<TableCell className="font-medium">
									{formatCurrency(user.totalCostCents / 100)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
					{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of{" "}
					{pagination.totalItems} users
				</p>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(pagination.page - 1)}
						disabled={!pagination.hasPrevPage}
					>
						<ChevronLeft className="h-4 w-4" />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(pagination.page + 1)}
						disabled={!pagination.hasNextPage}
					>
						Next
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
