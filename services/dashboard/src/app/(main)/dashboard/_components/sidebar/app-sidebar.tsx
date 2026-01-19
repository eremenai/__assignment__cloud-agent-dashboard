"use client";

import { Suspense, useMemo } from "react";

import Link from "next/link";

import { Activity, Globe, LayoutDashboard, type LucideIcon, MessageSquare, Users } from "lucide-react";

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
import type { UserRole } from "@/lib/types/domain";

import { NavMain } from "./nav-main";

// ============================================================================
// Navigation Types
// ============================================================================

interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  visibleTo?: UserRole[];
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
  visibleTo?: UserRole[];
}

// ============================================================================
// Navigation Items
// ============================================================================

const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Analytics",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
      { title: "Sessions", url: "/sessions", icon: MessageSquare },
      { title: "Users", url: "/users", icon: Users },
    ],
  },
  {
    id: 2,
    label: "Platform",
    visibleTo: ["super_admin"],
    items: [
      { title: "Global Overview", url: "/global", icon: Globe, visibleTo: ["super_admin"] },
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  const filteredItems = useMemo(() => {
    if (!user) return [];
    return sidebarItems
      .filter((group) => !group.visibleTo || group.visibleTo.includes(user.role))
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.visibleTo || item.visibleTo.includes(user.role)),
      }))
      .filter((group) => group.items.length > 0);
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
        <Suspense fallback={null}>
          <NavMain items={filteredItems} />
        </Suspense>
      </SidebarContent>
      <SidebarFooter>
        {process.env.NODE_ENV !== "production" && <DevAuthSwitcher />}
      </SidebarFooter>
    </Sidebar>
  );
}
