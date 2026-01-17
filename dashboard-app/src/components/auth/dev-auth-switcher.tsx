"use client";

/**
 * DevAuthSwitcher - User switching dropdown for development mode.
 * Allows quick switching between different test users to test role-based features.
 */

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { DEV_USERS } from "@/dev/dev-users";
import { getRoleLabel, getRoleBadgeVariant } from "@/lib/types/auth";
import { ChevronDown, User, Shield, Globe } from "lucide-react";

export function DevAuthSwitcher() {
	const { user, switchUser } = useAuth();

	if (!user) return null;

	// Group users by type for better organization
	const orgUsers = DEV_USERS.filter((u) => u.orgId !== null);
	const platformUsers = DEV_USERS.filter((u) => u.orgId === null);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<Avatar className="size-7">
						<AvatarFallback className="text-xs">
							{getInitials(user.name)}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col items-start">
						<span className="font-medium">{user.name}</span>
						<span className="text-xs text-muted-foreground">
							{getRoleLabel(user.role)}
						</span>
					</div>
					<ChevronDown className="size-4 text-muted-foreground" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-72"
				side="bottom"
				align="end"
				sideOffset={4}
			>
				<DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
					<User className="size-3" />
					Organization Users
				</DropdownMenuLabel>
				{orgUsers.map((devUser) => (
					<DropdownMenuItem
						key={devUser.userId}
						className={cn(
							"cursor-pointer",
							devUser.userId === user.userId &&
								"border-l-2 border-l-primary bg-accent/50",
						)}
						onClick={() => switchUser(devUser.userId)}
					>
						<div className="flex w-full items-center gap-3">
							<Avatar className="size-8">
								<AvatarFallback className="text-xs">
									{getInitials(devUser.name)}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-1 flex-col">
								<div className="flex items-center gap-2">
									<span className="font-medium">{devUser.name}</span>
									<Badge variant={getRoleBadgeVariant(devUser.role)} className="text-[10px] px-1.5 py-0">
										{getRoleLabel(devUser.role)}
									</Badge>
								</div>
								<span className="text-xs text-muted-foreground">
									{devUser.description}
								</span>
							</div>
						</div>
					</DropdownMenuItem>
				))}

				<DropdownMenuSeparator />

				<DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
					<Globe className="size-3" />
					Platform Users
				</DropdownMenuLabel>
				{platformUsers.map((devUser) => (
					<DropdownMenuItem
						key={devUser.userId}
						className={cn(
							"cursor-pointer",
							devUser.userId === user.userId &&
								"border-l-2 border-l-primary bg-accent/50",
						)}
						onClick={() => switchUser(devUser.userId)}
					>
						<div className="flex w-full items-center gap-3">
							<Avatar className="size-8">
								<AvatarFallback className="text-xs">
									{getInitials(devUser.name)}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-1 flex-col">
								<div className="flex items-center gap-2">
									<span className="font-medium">{devUser.name}</span>
									<Badge variant={getRoleBadgeVariant(devUser.role)} className="text-[10px] px-1.5 py-0">
										{getRoleLabel(devUser.role)}
									</Badge>
								</div>
								<span className="text-xs text-muted-foreground">
									{devUser.description}
								</span>
							</div>
						</div>
					</DropdownMenuItem>
				))}

				<DropdownMenuSeparator />

				<div className="px-2 py-1.5">
					<p className="text-[10px] text-muted-foreground">
						<Shield className="mb-0.5 mr-1 inline-block size-3" />
						Dev mode user switcher. Switch users to test different roles and permissions.
					</p>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
