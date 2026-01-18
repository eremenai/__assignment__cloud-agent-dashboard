/**
 * Empty state component for displaying when no data is available.
 */

import type { ReactNode } from "react";

import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Custom icon (defaults to Inbox) */
  icon?: ReactNode;
  /** Action button text */
  actionLabel?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function EmptyState({ title, description, icon, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        {icon ?? <Inbox className="size-6 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 font-semibold text-lg">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-muted-foreground text-sm">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4" variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
