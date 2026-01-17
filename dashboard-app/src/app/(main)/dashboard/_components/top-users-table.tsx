"use client";

/**
 * Top users table showing users with highest activity/cost.
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserWithMetrics } from "@/lib/types/domain";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getInitials } from "@/lib/utils";

interface TopUsersTableProps {
	users: UserWithMetrics[];
	className?: string;
}

export function TopUsersTable({ users, className }: TopUsersTableProps) {
	return (
		<Card className={className}>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>Top Users</CardTitle>
					<CardDescription>Users with highest activity and cost</CardDescription>
				</div>
				<Button variant="ghost" size="sm" asChild>
					<Link href="/users">
						View all <ChevronRight className="ml-1 h-4 w-4" />
					</Link>
				</Button>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>User</TableHead>
							<TableHead className="text-right">Sessions</TableHead>
							<TableHead className="text-right">Runs</TableHead>
							<TableHead className="text-right">Runs/Sess</TableHead>
							<TableHead className="text-right">Handoff%</TableHead>
							<TableHead className="text-right">Success%</TableHead>
							<TableHead className="text-right">Cost</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="text-center text-muted-foreground">
									No users in this period
								</TableCell>
							</TableRow>
						) : (
							users.map((user) => (
								<TableRow key={user.userId} className="cursor-pointer hover:bg-muted/50">
									<TableCell>
										<Link
											href={`/users/${user.userId}`}
											className="flex items-center gap-2 hover:underline"
										>
											<Avatar className="h-8 w-8">
												<AvatarImage src={user.avatarUrl} alt={user.name} />
												<AvatarFallback className="text-xs">
													{getInitials(user.name)}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-col">
												<span className="font-medium">{user.name}</span>
												<span className="text-xs text-muted-foreground">
													{user.email}
												</span>
											</div>
										</Link>
									</TableCell>
									<TableCell className="text-right">{user.sessionCount}</TableCell>
									<TableCell className="text-right">{user.runCount}</TableCell>
									<TableCell className="text-right">
										{user.avgRunsPerSession.toFixed(1)}
									</TableCell>
									<TableCell className="text-right">
										{formatPercent(user.localHandoffRate)}
									</TableCell>
									<TableCell className="text-right">
										{formatPercent(user.successRate)}
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatCurrency(user.totalCostCents / 100)}
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
