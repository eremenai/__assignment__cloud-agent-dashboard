/**
 * KPI Card component for displaying key performance indicators.
 * Based on the section-cards.tsx visual pattern.
 */

import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { TrendIndicator, type TrendDirection } from "./trend-indicator";

export interface KPICardProps {
	/** Card title/label */
	title: string;
	/** Main value to display */
	value: string | number;
	/** Optional trend percentage */
	trend?: number;
	/** Override trend direction */
	trendDirection?: TrendDirection;
	/** Whether up is good for this metric (default true) */
	upIsGood?: boolean;
	/** Optional description/context shown below the value */
	description?: string;
	/** Optional footer text (e.g., "vs last period") */
	footer?: string;
	/** Loading state */
	isLoading?: boolean;
	/** Optional additional CSS classes */
	className?: string;
}

export function KPICard({
	title,
	value,
	trend,
	trendDirection,
	upIsGood = true,
	description,
	footer,
	isLoading = false,
	className,
}: KPICardProps) {
	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardDescription>
						<Skeleton className="h-4 w-24" />
					</CardDescription>
					<CardTitle>
						<Skeleton className="h-8 w-32" />
					</CardTitle>
					{trend !== undefined && (
						<CardAction>
							<Skeleton className="h-6 w-16" />
						</CardAction>
					)}
				</CardHeader>
				{(description || footer) && (
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						{description && <Skeleton className="h-4 w-40" />}
						{footer && <Skeleton className="h-4 w-32" />}
					</CardFooter>
				)}
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardDescription>{title}</CardDescription>
				<CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
					{value}
				</CardTitle>
				{trend !== undefined && (
					<CardAction>
						<Badge variant="outline">
							<TrendIndicator
								value={trend}
								direction={trendDirection}
								upIsGood={upIsGood}
								showIcon={true}
							/>
						</Badge>
					</CardAction>
				)}
			</CardHeader>
			{(description || footer) && (
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					{description && (
						<div className="line-clamp-1 font-medium">{description}</div>
					)}
					{footer && (
						<div className="text-muted-foreground">{footer}</div>
					)}
				</CardFooter>
			)}
		</Card>
	);
}
