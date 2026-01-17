/**
 * KPI Row component for displaying a row of KPI cards.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface KPIRowProps {
	/** KPI cards to display */
	children: ReactNode;
	/** Number of columns on different breakpoints */
	columns?: 2 | 3 | 4 | 5;
	/** Additional CSS classes */
	className?: string;
}

const columnClasses = {
	2: "grid-cols-1 @xl/main:grid-cols-2",
	3: "grid-cols-1 @xl/main:grid-cols-2 @3xl/main:grid-cols-3",
	4: "grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4",
	5: "grid-cols-1 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-5",
};

export function KPIRow({ children, columns = 4, className }: KPIRowProps) {
	return (
		<div
			className={cn(
				"grid gap-4",
				columnClasses[columns],
				// Apply the gradient background to all cards (following section-cards pattern)
				"*:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card",
				className,
			)}
		>
			{children}
		</div>
	);
}
