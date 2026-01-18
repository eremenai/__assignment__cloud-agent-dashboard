"use client";

/**
 * Header user dropdown - shows current user info and provides logout.
 * Organization name is fetched from mock-auth service.
 */

import { useEffect, useState } from "react";
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
import { useAuth } from "@/lib/auth";
import { fetchMockAuthOrgs } from "@/lib/auth/mock-auth-client";
import { getRoleLabel } from "@/lib/types/auth";
import { getInitials } from "@/lib/utils";

export function HeaderUser() {
  const { user, currentOrgId } = useAuth();
  const [orgName, setOrgName] = useState<string | null>(null);

  // Fetch organization name from mock-auth service
  useEffect(() => {
    const orgId = currentOrgId ?? user?.orgId;
    if (!orgId) {
      setOrgName(null);
      return;
    }

    async function loadOrgName() {
      try {
        const orgs = await fetchMockAuthOrgs();
        const org = orgs.find((o) => o.orgId === orgId);
        setOrgName(org?.name ?? null);
      } catch (err) {
        console.warn("Failed to fetch organization:", err);
      }
    }

    loadOrgName();
  }, [currentOrgId, user?.orgId]);

  if (!user) {
    return null;
  }

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
            <span className="text-muted-foreground text-xs">{getRoleLabel(user.role)}</span>
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
        {orgName && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Building2 className="h-3.5 w-3.5" />
                <span>{orgName}</span>
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
