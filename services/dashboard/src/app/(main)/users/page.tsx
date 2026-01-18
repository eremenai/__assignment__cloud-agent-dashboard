"use client";

/**
 * Users List Page - View and compare users within the organization.
 *
 * Data fetching is handled by UsersContent component.
 */

import { EmptyState } from "@/components/analytics";
import { useAuth } from "@/lib/auth";

import { UsersContent } from "./_components/users-content";

export default function UsersPage() {
  const { can } = useAuth();

  // Permission check
  const canViewUsers = can("view_users_list");

  // Access denied for non-managers
  if (!canViewUsers) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="Access denied"
          description="You don't have permission to view users."
          actionLabel="Back to Dashboard"
          onAction={() => {
            window.location.href = "/dashboard";
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Users</h1>
        <p className="text-muted-foreground">Compare user metrics and activity across your organization.</p>
      </div>

      {/* Content with data fetching */}
      <UsersContent />
    </div>
  );
}
