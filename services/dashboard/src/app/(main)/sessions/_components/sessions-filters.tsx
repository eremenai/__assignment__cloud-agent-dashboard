"use client";

/**
 * Sessions filters bar with search and dropdown filters.
 */

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SessionFilters as FiltersType } from "@/lib/types/api";

type FilterKey = "status" | "durationRange" | "costRange" | "hasHandoff" | "hasPostHandoffIteration";

interface SessionsFiltersProps {
  filters: Partial<FiltersType>;
  onFilterChange: (key: FilterKey, value: string) => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}

export function SessionsFilters({ filters, onFilterChange, onSearchChange, onClear }: SessionsFiltersProps) {
  const hasFilters =
    filters.search ||
    (filters.status && filters.status !== "all") ||
    (filters.durationRange && filters.durationRange !== "any") ||
    (filters.costRange && filters.costRange !== "any") ||
    (filters.hasHandoff && filters.hasHandoff !== "any") ||
    (filters.hasPostHandoffIteration && filters.hasPostHandoffIteration !== "any");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
      {/* Search */}
      <div className="relative min-w-[200px] max-w-[300px] flex-1">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search session ID..."
          value={filters.search || ""}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status Filter */}
      <Select value={filters.status || "all"} onValueChange={(value) => onFilterChange("status", value)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="has_failures">Has Failures</SelectItem>
          <SelectItem value="all_succeeded">All Succeeded</SelectItem>
        </SelectContent>
      </Select>

      {/* Duration Filter */}
      <Select value={filters.durationRange || "any"} onValueChange={(value) => onFilterChange("durationRange", value)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Duration" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any Duration</SelectItem>
          <SelectItem value="<5m">&lt;5 min</SelectItem>
          <SelectItem value="5m-30m">5-30 min</SelectItem>
          <SelectItem value="30m-1h">30 min - 1h</SelectItem>
          <SelectItem value=">1h">&gt;1 hour</SelectItem>
        </SelectContent>
      </Select>

      {/* Cost Filter */}
      <Select value={filters.costRange || "any"} onValueChange={(value) => onFilterChange("costRange", value)}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Cost" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any Cost</SelectItem>
          <SelectItem value="<10">&lt;$10</SelectItem>
          <SelectItem value="10-50">$10-50</SelectItem>
          <SelectItem value="50-100">$50-100</SelectItem>
          <SelectItem value=">100">&gt;$100</SelectItem>
        </SelectContent>
      </Select>

      {/* Handoff Filter */}
      <Select value={filters.hasHandoff || "any"} onValueChange={(value) => onFilterChange("hasHandoff", value)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Handoff" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any Handoff</SelectItem>
          <SelectItem value="yes">Has Handoff</SelectItem>
          <SelectItem value="no">No Handoff</SelectItem>
        </SelectContent>
      </Select>

      {/* Post-Handoff Filter */}
      <Select
        value={filters.hasPostHandoffIteration || "any"}
        onValueChange={(value) => onFilterChange("hasPostHandoffIteration", value)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Post-Handoff" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any Post-Handoff</SelectItem>
          <SelectItem value="yes">Has Iteration</SelectItem>
          <SelectItem value="no">No Iteration</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Button */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
