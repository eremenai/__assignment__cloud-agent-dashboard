"use client";

/**
 * DevAuthSwitcher - User switching dropdown for development mode.
 * Allows quick switching between different test users to test role-based features.
 *
 * This component directly uses mock-auth-client to:
 * 1. Fetch available users from mock-auth service
 * 2. Switch users via mock-auth login endpoint
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ChevronDown, ChevronsUpDown, Globe, Loader2, Shield, User } from "lucide-react";

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
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import {
  fetchMockAuthUsers,
  isMockAuthAvailable,
  loginAsMockUser,
} from "@/lib/auth/mock-auth-client";
import type { AuthUser } from "@/lib/types/auth";
import { getRoleBadgeVariant, getRoleLabel } from "@/lib/types/auth";
import { cn, getInitials } from "@/lib/utils";

interface DevAuthSwitcherProps {
  variant?: "default" | "sidebar";
}

export function DevAuthSwitcher({ variant = "default" }: DevAuthSwitcherProps) {
  const { user, switchUser } = useAuth();
  const sidebarContext = useSidebar();
  const sidebar = variant === "sidebar" ? sidebarContext : null;
  const pathname = usePathname();
  const router = useRouter();

  const [availableUsers, setAvailableUsers] = useState<AuthUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [mockAuthAvailable, setMockAuthAvailable] = useState(false);

  // Fetch available users from mock-auth service on mount
  useEffect(() => {
    async function loadUsers() {
      const isAvailable = await isMockAuthAvailable();
      setMockAuthAvailable(isAvailable);

      if (isAvailable) {
        try {
          const users = await fetchMockAuthUsers();
          setAvailableUsers(users);
        } catch (err) {
          console.warn("Failed to fetch users from mock-auth:", err);
        }
      }

      setIsLoadingUsers(false);
    }

    loadUsers();
  }, []);

  if (!user) return null;

  // Check if on a detail page that would become invalid after org switch
  const isOnDetailPage = pathname.match(/^\/(sessions|users)\/[^/]+$/);

  const handleUserSwitch = async (userId: string) => {
    if (!mockAuthAvailable || isSwitching) return;

    setIsSwitching(true);
    try {
      await loginAsMockUser(userId);
      // Notify auth context to re-parse JWT
      switchUser();
      // Redirect to overview if on a detail page (session/user detail won't exist in new org)
      if (isOnDetailPage) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to switch user:", err);
    } finally {
      setIsSwitching(false);
    }
  };

  // Group users by type for better organization
  const orgUsers = availableUsers.filter((u) => u.orgId !== null);
  const platformUsers = availableUsers.filter((u) => u.orgId === null);

  // Show loading state if users haven't loaded yet
  if (isLoadingUsers) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading users...</span>
      </div>
    );
  }

  // Show message if mock-auth is not available
  if (!mockAuthAvailable) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Shield className="size-4" />
        <span>Mock auth unavailable</span>
      </div>
    );
  }

  const dropdownContent = (
    <DropdownMenuContent
      className="w-72"
      side={variant === "sidebar" && sidebar && !sidebar.isMobile ? "right" : "bottom"}
      align="end"
      sideOffset={4}
    >
      <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground text-xs">
        <User className="size-3" />
        Organization Users
      </DropdownMenuLabel>
      {orgUsers.map((devUser) => (
        <DropdownMenuItem
          key={devUser.userId}
          className={cn(
            "cursor-pointer",
            devUser.userId === user.userId && "border-l-2 border-l-primary bg-accent/50",
            isSwitching && "opacity-50 pointer-events-none",
          )}
          onClick={() => handleUserSwitch(devUser.userId)}
        >
          <div className="flex w-full items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{getInitials(devUser.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{devUser.name}</span>
                <Badge variant={getRoleBadgeVariant(devUser.role)} className="px-1.5 py-0 text-[10px]">
                  {getRoleLabel(devUser.role)}
                </Badge>
              </div>
              <span className="text-muted-foreground text-xs">{devUser.email}</span>
            </div>
          </div>
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator />

      <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground text-xs">
        <Globe className="size-3" />
        Platform Users
      </DropdownMenuLabel>
      {platformUsers.map((devUser) => (
        <DropdownMenuItem
          key={devUser.userId}
          className={cn(
            "cursor-pointer",
            devUser.userId === user.userId && "border-l-2 border-l-primary bg-accent/50",
            isSwitching && "opacity-50 pointer-events-none",
          )}
          onClick={() => handleUserSwitch(devUser.userId)}
        >
          <div className="flex w-full items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{getInitials(devUser.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{devUser.name}</span>
                <Badge variant={getRoleBadgeVariant(devUser.role)} className="px-1.5 py-0 text-[10px]">
                  {getRoleLabel(devUser.role)}
                </Badge>
              </div>
              <span className="text-muted-foreground text-xs">{devUser.email}</span>
            </div>
          </div>
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator />

      <div className="px-2 py-1.5">
        <p className="text-[10px] text-muted-foreground">
          <Shield className="mr-1 mb-0.5 inline-block size-3" />
          Dev mode user switcher
        </p>
      </div>
    </DropdownMenuContent>
  );

  // Sidebar variant
  if (variant === "sidebar") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                disabled={isSwitching}
              >
                {isSwitching ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            {dropdownContent}
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          disabled={isSwitching}
        >
          {isSwitching ? (
            <Loader2 className="size-7 animate-spin" />
          ) : (
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex flex-col items-start">
            <span className="font-medium">{user.name}</span>
            <span className="text-muted-foreground text-xs">{getRoleLabel(user.role)}</span>
          </div>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      {dropdownContent}
    </DropdownMenu>
  );
}
