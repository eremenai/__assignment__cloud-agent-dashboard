"use client";

/**
 * Client-side wrapper for dashboard layout.
 * Provides AuthProvider and client-side header components.
 */

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { OrgSelector, TimeRangeSelector } from "@/components/layout";
import { DevAuthSwitcher } from "@/components/auth/dev-auth-switcher";
import { ThemeSwitcher } from "./sidebar/theme-switcher";
import { Separator } from "@/components/ui/separator";

interface DashboardLayoutClientProps {
	children: ReactNode;
}

export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
	return <AuthProvider>{children}</AuthProvider>;
}

/**
 * Header controls section with org selector, time range, and user switcher.
 */
export function HeaderControls() {
	return (
		<div className="flex items-center gap-2">
			<OrgSelector />
			<TimeRangeSelector />
			<Separator orientation="vertical" className="mx-1 h-6" />
			<ThemeSwitcher />
			<DevAuthSwitcher />
		</div>
	);
}
