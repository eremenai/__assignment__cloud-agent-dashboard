"use client";

/**
 * Organization selector for SUPPORT and SUPER_ADMIN users.
 * Allows switching between organizations to view their data.
 */

import { Building2, ChevronDown, Globe } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getAllOrganizations } from "@/dev/mock-data";
import { cn } from "@/lib/utils";
import { canSwitchOrg, canViewGlobal } from "@/lib/types/auth";

export function OrgSelector() {
	const { user, currentOrgId, setCurrentOrgId } = useAuth();

	// Only show for SUPPORT and SUPER_ADMIN
	if (!user || !canSwitchOrg(user.role)) {
		return null;
	}

	const organizations = getAllOrganizations();
	const currentOrg = currentOrgId
		? organizations.find((o) => o.orgId === currentOrgId)
		: null;

	const canViewGlobalOverview = canViewGlobal(user.role);
	const isGlobalView = currentOrgId === null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="gap-2">
					{isGlobalView ? (
						<>
							<Globe className="size-4" />
							<span>All Organizations</span>
						</>
					) : (
						<>
							<Building2 className="size-4" />
							<span>{currentOrg?.name ?? "Select Org"}</span>
						</>
					)}
					<ChevronDown className="size-4 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				{canViewGlobalOverview && (
					<>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Platform View
						</DropdownMenuLabel>
						<DropdownMenuItem
							className={cn(
								"cursor-pointer gap-2",
								isGlobalView && "bg-accent",
							)}
							onClick={() => setCurrentOrgId(null)}
						>
							<Globe className="size-4" />
							All Organizations
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuLabel className="text-xs text-muted-foreground">
					Organizations
				</DropdownMenuLabel>
				{organizations.map((org) => (
					<DropdownMenuItem
						key={org.orgId}
						className={cn(
							"cursor-pointer gap-2",
							currentOrgId === org.orgId && "bg-accent",
						)}
						onClick={() => setCurrentOrgId(org.orgId)}
					>
						<Building2 className="size-4" />
						{org.name}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
