"use client";

/**
 * User header with avatar, name, and basic info.
 */

import { RoleBadge } from "@/components/analytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/format";
import type { UserWithMetrics } from "@/lib/types/domain";
import { getInitials } from "@/lib/utils";

interface UserHeaderProps {
  user: UserWithMetrics;
}

export function UserHeader({ user }: UserHeaderProps) {
  return (
    <div className="flex items-start gap-6">
      {/* Avatar */}
      <Avatar className="h-20 w-20">
        <AvatarImage src={user.avatarUrl} alt={user.name ?? user.displayName ?? ""} />
        <AvatarFallback className="text-2xl">{getInitials(user.name ?? user.displayName ?? "")}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-2xl">{user.name ?? user.displayName ?? user.email}</h1>
          <RoleBadge role={user.role} />
        </div>
        <p className="mt-1 text-muted-foreground">{user.email}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-muted-foreground text-sm">
          <span>Last active: {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : "Unknown"}</span>
          <span>Member since: {user.createdAt?.toLocaleDateString() ?? "Unknown"}</span>
        </div>
      </div>
    </div>
  );
}
