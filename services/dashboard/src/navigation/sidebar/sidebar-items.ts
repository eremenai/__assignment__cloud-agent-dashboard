import { Globe, LayoutDashboard, type LucideIcon, MessageSquare, Users } from "lucide-react";

import type { UserRole } from "@/lib/types/domain";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  /** Roles that can see this item. If undefined, visible to all. */
  visibleTo?: UserRole[];
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
  /** Roles that can see this group. If undefined, visible to all. */
  visibleTo?: UserRole[];
}

/**
 * Agent Analytics Dashboard navigation items.
 */
export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Analytics",
    items: [
      {
        title: "Overview",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Sessions",
        url: "/sessions",
        icon: MessageSquare,
      },
      {
        title: "Users",
        url: "/users",
        icon: Users,
      },
    ],
  },
  {
    id: 2,
    label: "Platform",
    visibleTo: ["SUPER_ADMIN"],
    items: [
      {
        title: "Global Overview",
        url: "/global",
        icon: Globe,
        visibleTo: ["SUPER_ADMIN"],
      },
    ],
  },
];

/**
 * Filter navigation items based on user role.
 */
export function filterNavItems(items: NavGroup[], userRole: UserRole): NavGroup[] {
  return items
    .filter((group) => {
      if (!group.visibleTo) return true;
      return group.visibleTo.includes(userRole);
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.visibleTo) return true;
        return item.visibleTo.includes(userRole);
      }),
    }))
    .filter((group) => group.items.length > 0);
}
