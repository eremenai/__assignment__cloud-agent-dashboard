"use client";

/**
 * Time range selector for filtering dashboard data.
 * Supports preset ranges (7d, 30d, 90d) and custom date selection.
 */

import { useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { format, subDays } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type TimeRangePreset = "7d" | "30d" | "90d" | "custom";

interface TimeRangeOption {
  label: string;
  value: TimeRangePreset;
  days?: number;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "Custom range", value: "custom" },
];

export function TimeRangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current range from URL params or default to 7d
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    // Initialize with current range from URL if available
    if (fromParam && toParam) {
      return { from: new Date(fromParam), to: new Date(toParam) };
    }
    return undefined;
  });

  // Handle custom range selection with reset on third click
  const handleCustomRangeChange = (range: DateRange | undefined) => {
    if (!range) {
      setCustomRange(undefined);
      return;
    }

    // Check if we have a complete range (from and to are different dates)
    const hasCompleteRange =
      customRange?.from && customRange?.to && customRange.from.getTime() !== customRange.to.getTime();

    // If we already have a complete range and user clicks again,
    // determine the clicked date and start a new range
    if (hasCompleteRange) {
      // When user clicks after having a complete range, react-day-picker
      // may extend the range. We need to find the newly clicked date.
      // The clicked date is either range.from or range.to that's different
      // from our existing customRange dates.
      let clickedDate: Date | undefined;

      if (range.to && range.to.getTime() !== customRange.to?.getTime()) {
        // The to date changed, so user clicked on what became the new to
        clickedDate = range.to;
      } else if (range.from && range.from.getTime() !== customRange.from?.getTime()) {
        // The from date changed
        clickedDate = range.from;
      } else if (range.from) {
        // Fallback to the from date
        clickedDate = range.from;
      }

      if (clickedDate) {
        setCustomRange({ from: clickedDate, to: undefined });
      }
    } else {
      // Normal behavior - let the picker handle from/to
      setCustomRange(range);
    }
  };

  // Determine current preset
  const getCurrentPreset = (): TimeRangePreset => {
    if (!fromParam || !toParam) return "7d";

    const from = new Date(fromParam);
    const to = new Date(toParam);
    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    if (days === 7) return "7d";
    if (days === 30) return "30d";
    if (days === 90) return "90d";
    return "custom";
  };

  const currentPreset = getCurrentPreset();

  // Get display label
  const getDisplayLabel = (): string => {
    if (currentPreset === "custom" && fromParam && toParam) {
      return `${format(new Date(fromParam), "MMM d")} - ${format(new Date(toParam), "MMM d")}`;
    }
    return TIME_RANGE_OPTIONS.find((o) => o.value === currentPreset)?.label ?? "Last 7 days";
  };

  // Update URL params
  const updateTimeRange = (from: Date, to: Date) => {
    const params = new URLSearchParams(searchParams);
    params.set("from", format(from, "yyyy-MM-dd"));
    params.set("to", format(to, "yyyy-MM-dd"));
    router.push(`${pathname}?${params.toString()}`);
  };

  // Handle preset selection
  const handlePresetSelect = (option: TimeRangeOption) => {
    if (option.value === "custom") {
      // Reset selection state when opening dialog
      setCustomRange(undefined);
      setShowCustomPicker(true);
      return;
    }

    if (option.days) {
      const to = new Date();
      const from = subDays(to, option.days);
      updateTimeRange(from, to);
    }
  };

  // Handle custom range selection
  const handleCustomRangeSelect = () => {
    if (customRange?.from && customRange?.to) {
      updateTimeRange(customRange.from, customRange.to);
      setShowCustomPicker(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <CalendarIcon className="size-4" />
            <span>{getDisplayLabel()}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {TIME_RANGE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className={cn("cursor-pointer", currentPreset === option.value && "bg-accent")}
              onClick={() => handlePresetSelect(option)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom date picker dialog */}
      <Dialog open={showCustomPicker} onOpenChange={setShowCustomPicker}>
        <DialogContent className="sm:max-w-fit">
          <DialogHeader>
            <DialogTitle>Select date range</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="range"
            defaultMonth={subDays(new Date(), 30)}
            selected={customRange}
            onSelect={handleCustomRangeChange}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomPicker(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomRangeSelect} disabled={!customRange?.from || !customRange?.to}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Hook to get current time range from URL params.
 * Returns default 7-day range if not specified.
 */
export function useTimeRange(): { from: Date; to: Date } {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : subDays(to, 7);

  return { from, to };
}

/**
 * Get time range params object for API calls.
 */
export function useTimeRangeParams(): { from: string; to: string } {
  const { from, to } = useTimeRange();
  return {
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
  };
}

/**
 * Hook to generate a URL that preserves the current time range params.
 */
export function useTimeRangeLink() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  return (basePath: string) => {
    if (fromParam && toParam) {
      return `${basePath}?from=${fromParam}&to=${toParam}`;
    }
    return basePath;
  };
}
