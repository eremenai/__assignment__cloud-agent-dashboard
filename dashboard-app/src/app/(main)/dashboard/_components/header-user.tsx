"use client";

/**
 * Header user dropdown - shows current org and provides logout.
 */

import { Building2, ChevronDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getOrganization } from "@/dev/mock-data/organizations";
import { useAuth } from "@/lib/auth";
import { getInitials } from "@/lib/utils";

export function HeaderUser() {
  const { user, currentOrgId } = useAuth();

  if (!user) {
    return null;
  }

  // Get organization name for display
  const orgId = currentOrgId ?? user.orgId;
  const organization = orgId ? getOrganization(orgId) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="size-7">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="hidden flex-col items-start text-sm leading-tight md:flex">
            <span className="font-medium">{user.name}</span>
            <span className="text-muted-foreground text-xs">{user.role.replace("_", " ")}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        {organization && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Building2 className="h-3.5 w-3.5" />
                <span>{organization.name}</span>
              </div>
            </DropdownMenuLabel>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
