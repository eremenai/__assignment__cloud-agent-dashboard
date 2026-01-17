"use client";

/**
 * Time range selector for filtering dashboard data.
 * Supports preset ranges (7d, 30d, 90d) and custom date selection.
 */

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, subDays } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

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
	const [customRange, setCustomRange] = useState<DateRange | undefined>();

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
		return (
			TIME_RANGE_OPTIONS.find((o) => o.value === currentPreset)?.label ??
			"Last 7 days"
		);
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
		<div className="flex items-center gap-2">
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
							className={cn(
								"cursor-pointer",
								currentPreset === option.value && "bg-accent",
							)}
							onClick={() => handlePresetSelect(option)}
						>
							{option.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Custom date picker popover */}
			<Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
				<PopoverTrigger asChild>
					<span className="hidden" />
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="end">
					<Calendar
						mode="range"
						defaultMonth={customRange?.from}
						selected={customRange}
						onSelect={setCustomRange}
						numberOfMonths={2}
					/>
					<div className="flex items-center justify-end gap-2 border-t p-3">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowCustomPicker(false)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleCustomRangeSelect}
							disabled={!customRange?.from || !customRange?.to}
						>
							Apply
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
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
