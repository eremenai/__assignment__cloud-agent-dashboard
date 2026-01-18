"use client";

/**
 * Organization selector for support and super_admin users.
 * Allows switching between organizations to view their data.
 * Fetches organizations from mock-auth service.
 */

import { useEffect, useState } from "react";
import { Building2, ChevronDown, Globe, Loader2 } from "lucide-react";

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
import { canSwitchOrg, canViewGlobal } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

interface Org {
  orgId: string;
  name: string;
}

export function OrgSelector() {
  const { user, currentOrgId, setCurrentOrgId } = useAuth();
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch organizations from mock-auth service
  useEffect(() => {
    async function loadOrgs() {
      try {
        const orgs = await fetchMockAuthOrgs();
        setOrganizations(orgs);
      } catch (err) {
        console.warn("Failed to fetch organizations:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrgs();
  }, []);

  // Only show for support and super_admin
  if (!user || !canSwitchOrg(user.role)) {
    return null;
  }

  const currentOrg = currentOrgId ? organizations.find((o) => o.orgId === currentOrgId) : null;
  const canViewGlobalOverview = canViewGlobal(user.role);
  const isGlobalView = currentOrgId === null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : isGlobalView ? (
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
            <DropdownMenuLabel className="text-muted-foreground text-xs">Platform View</DropdownMenuLabel>
            <DropdownMenuItem
              className={cn("cursor-pointer gap-2", isGlobalView && "bg-accent")}
              onClick={() => setCurrentOrgId(null)}
            >
              <Globe className="size-4" />
              All Organizations
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-muted-foreground text-xs">Organizations</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.orgId}
            className={cn("cursor-pointer gap-2", currentOrgId === org.orgId && "bg-accent")}
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
