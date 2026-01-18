"use client";

/**
 * Global Overview Page - Cross-org view for SUPER_ADMIN users.
 *
 * Data fetching is handled by GlobalContent component.
 */

import { EmptyState } from "@/components/analytics";
import { useAuth } from "@/lib/auth";

import { GlobalContent } from "./_components/global-content";

export default function GlobalOverviewPage() {
  const { can } = useAuth();

  // Permission check
  const canViewGlobal = can("view_global_overview");

  // Access denied for non-SUPER_ADMIN
  if (!canViewGlobal) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Access denied"
          description="Only Super Administrators can access the global overview."
          actionLabel="Back to Dashboard"
          onAction={() => {
            window.location.href = "/dashboard";
          }}
        />
      </div>
    );
  }

  return (
    <div className="@container/main space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Global Overview</h1>
        <p className="text-muted-foreground">Platform-wide metrics across all organizations.</p>
      </div>

      {/* Content with data fetching */}
      <GlobalContent />
    </div>
  );
}
