/**
 * KPI Card component for displaying key performance indicators.
 * Based on the section-cards.tsx visual pattern.
 */

import { HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { type TrendDirection, TrendIndicator } from "./trend-indicator";

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
  /** Optional footer text (e.g., "vs last period") - DEPRECATED: use trendPreviousValue instead */
  footer?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Optional additional CSS classes */
  className?: string;
  /** Tooltip text shown on hover of help icon */
  tooltip?: string;
  /** Previous period value for trend popup */
  trendPreviousValue?: string;
  /** Previous period date range for trend popup */
  trendPreviousPeriod?: string;
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
  tooltip,
  trendPreviousValue,
  trendPreviousPeriod,
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
        <CardDescription className="flex items-center gap-1">
          {title}
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3.5 cursor-help text-muted-foreground/60 hover:text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardDescription>
        <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">{value}</CardTitle>
        {trend !== undefined && (
          <CardAction>
            {trendPreviousValue || trendPreviousPeriod ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="cursor-help">
                      <TrendIndicator value={trend} direction={trendDirection} upIsGood={upIsGood} showIcon={true} />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="space-y-0.5">
                      {trendPreviousValue && (
                        <p>
                          Previous: <span className="font-medium">{trendPreviousValue}</span>
                        </p>
                      )}
                      {trendPreviousPeriod && <p className="text-muted-foreground">{trendPreviousPeriod}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Badge variant="outline">
                <TrendIndicator value={trend} direction={trendDirection} upIsGood={upIsGood} showIcon={true} />
              </Badge>
            )}
          </CardAction>
        )}
      </CardHeader>
      {(description || footer) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {description && <div className="line-clamp-1 font-medium">{description}</div>}
          {footer && <div className="text-muted-foreground">{footer}</div>}
        </CardFooter>
      )}
    </Card>
  );
}
