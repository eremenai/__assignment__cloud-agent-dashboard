/**
 * Status badge component for run status display.
 */

import { cva, type VariantProps } from "class-variance-authority";

import type { RunStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    status: {
      SUCCEEDED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      TIMEOUT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      CANCELED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
    },
  },
  defaultVariants: {
    status: "SUCCEEDED",
  },
});

const statusLabels: Record<RunStatus, string> = {
  SUCCEEDED: "Success",
  FAILED: "Failed",
  TIMEOUT: "Timeout",
  CANCELED: "Canceled",
};

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  /** The run status */
  status: RunStatus;
  /** Optional custom label */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return <span className={cn(statusBadgeVariants({ status }), className)}>{label ?? statusLabels[status]}</span>;
}

/**
 * Get the appropriate status color for charts or other visualizations.
 */
export function getStatusColor(status: RunStatus): string {
  const colors: Record<RunStatus, string> = {
    SUCCEEDED: "hsl(142, 76%, 36%)", // green-600
    FAILED: "hsl(0, 84%, 60%)", // red-500
    TIMEOUT: "hsl(45, 93%, 47%)", // amber-500
    CANCELED: "hsl(220, 9%, 46%)", // gray-500
  };
  return colors[status];
}
