"use client";

import { useMemo } from "react";

import Link from "next/link";

import { Activity } from "lucide-react";

import { DevAuthSwitcher } from "@/components/auth/dev-auth-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { useAuth } from "@/lib/auth";
import { filterNavItems, sidebarItems } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  const filteredItems = useMemo(() => {
    if (!user) return [];
    return filterNavItems(sidebarItems, user.role);
  }, [user]);

  return (
    <Sidebar {...props} variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href="/dashboard">
                <Activity />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredItems} />
      </SidebarContent>
      <SidebarFooter>
        <DevAuthSwitcher variant="sidebar" />
      </SidebarFooter>
    </Sidebar>
  );
}
