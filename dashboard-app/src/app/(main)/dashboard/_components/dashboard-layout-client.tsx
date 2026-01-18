"use client";

/**
 * Client-side wrapper for dashboard layout.
 * Provides AuthProvider, BreadcrumbsProvider, and client-side header components.
 */

import type { ReactNode } from "react";

import { BreadcrumbsProvider, TimeRangeSelector } from "@/components/layout";
import { AuthProvider } from "@/lib/auth";

import { HeaderUser } from "./header-user";
import { ThemeSwitcher } from "./sidebar/theme-switcher";

interface DashboardLayoutClientProps {
  children: ReactNode;
}

export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
  return (
    <AuthProvider>
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
      <TimeRangeSelector />
      <ThemeSwitcher />
      <HeaderUser />
    </div>
  );
}
