/**
 * Trend indicator component showing direction and percentage change.
 */

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "neutral";

interface TrendIndicatorProps {
  /** The percentage change value (e.g., 12.5 for +12.5%) */
  value: number;
  /** Optional: override the auto-detected direction */
  direction?: TrendDirection;
  /** Whether "up" is positive (default true). Set false for metrics where up is bad (e.g., failure rate) */
  upIsGood?: boolean;
  /** Show the icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

function getDirection(value: number): TrendDirection {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "neutral";
}

export function TrendIndicator({ value, direction, upIsGood = true, showIcon = true, className }: TrendIndicatorProps) {
  const computedDirection = direction ?? getDirection(value);
  const absValue = Math.abs(value);

  // Determine if this is a positive or negative trend based on direction and upIsGood
  const isPositive = computedDirection === "neutral" ? null : (computedDirection === "up") === upIsGood;

  const colorClass =
    isPositive === null
      ? "text-muted-foreground"
      : isPositive
        ? "text-green-600 dark:text-green-500"
        : "text-red-600 dark:text-red-500";

  const Icon = computedDirection === "up" ? TrendingUp : computedDirection === "down" ? TrendingDown : Minus;

  const prefix = computedDirection === "up" ? "+" : computedDirection === "down" ? "-" : "";

  return (
    <span className={cn("inline-flex items-center gap-1 font-medium text-sm", colorClass, className)}>
      {showIcon && <Icon className="size-4" />}
      <span>
        {prefix}
        {absValue.toFixed(1)}%
      </span>
    </span>
  );
}
