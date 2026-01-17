"use client";

/**
 * User header with avatar, name, and basic info.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/analytics";
import type { UserWithMetrics } from "@/lib/types/domain";
import { getInitials } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";

interface UserHeaderProps {
	user: UserWithMetrics;
}

export function UserHeader({ user }: UserHeaderProps) {
	return (
		<div className="flex items-start gap-6">
			{/* Avatar */}
			<Avatar className="h-20 w-20">
				<AvatarImage src={user.avatarUrl} alt={user.name} />
				<AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
			</Avatar>

			{/* Info */}
			<div className="flex-1">
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold">{user.name}</h1>
					<RoleBadge role={user.role} />
				</div>
				<p className="mt-1 text-muted-foreground">{user.email}</p>
				<div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
					<span>
						Last active: {formatRelativeTime(user.lastActiveAt)}
					</span>
					<span>
						Member since: {user.createdAt.toLocaleDateString()}
					</span>
				</div>
			</div>
		</div>
	);
}
