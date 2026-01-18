"use client";

/**
 * Client-side wrapper for dashboard layout.
 * Provides AuthProvider, BreadcrumbsProvider, and client-side header components.
 */

import type { ReactNode } from "react";

import { BreadcrumbsProvider, OrgSelector, TimeRangeSelector } from "@/components/layout";
import { AuthProvider } from "@/lib/auth";
import type { AuthUser } from "@/lib/types/auth";

import { HeaderUser } from "./header-user";
import { ThemeSwitcher } from "./sidebar/theme-switcher";

interface DashboardLayoutClientProps {
  children: ReactNode;
  /** User parsed from JWT on the server */
  initialUser: AuthUser | null;
}

export function DashboardLayoutClient({ children, initialUser }: DashboardLayoutClientProps) {
  return (
    <AuthProvider initialUser={initialUser}>
      <BreadcrumbsProvider>{children}</BreadcrumbsProvider>
    </AuthProvider>
  );
}

/**
 * Header controls section with time range, theme, and user dropdown.
 */
export function HeaderControls() {
  return (
    <div className="flex items-center gap-2">
      <OrgSelector />
      <TimeRangeSelector />
      <ThemeSwitcher />
      <HeaderUser />
    </div>
  );
}
