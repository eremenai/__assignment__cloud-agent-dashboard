"use client";

/**
 * Sessions filters bar with search and dropdown filters.
 */

import { useState } from "react";
import { ChevronDown, Search, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SessionFilters as FiltersType } from "@/lib/types/api";
import type { UserOption } from "@/lib/data/users-data";
import { cn } from "@/lib/utils";

type FilterKey = "status" | "durationRange" | "costRange" | "hasHandoff" | "hasPostHandoffIteration";

interface SessionsFiltersProps {
  filters: Partial<FiltersType>;
  onFilterChange: (key: FilterKey, value: string) => void;
  onSearchChange: (value: string) => void;
  onUserIdsChange?: (userIds: string[]) => void;
  onClear: () => void;
  users?: UserOption[];
  showUserFilter?: boolean;
}

export function SessionsFilters({
  filters,
  onFilterChange,
  onSearchChange,
  onUserIdsChange,
  onClear,
  users = [],
  showUserFilter = false,
}: SessionsFiltersProps) {
  const [userFilterOpen, setUserFilterOpen] = useState(false);
  const selectedUserIds = filters.userIds || [];

  const hasFilters =
    filters.search ||
    (filters.status && filters.status !== "all") ||
    (filters.durationRange && filters.durationRange !== "any") ||
    (filters.costRange && filters.costRange !== "any") ||
    (filters.hasHandoff && filters.hasHandoff !== "any") ||
    (filters.hasPostHandoffIteration && filters.hasPostHandoffIteration !== "any") ||
    (selectedUserIds.length > 0);

  const handleUserToggle = (userId: string) => {
    if (!onUserIdsChange) return;
    const newUserIds = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];
    onUserIdsChange(newUserIds);
  };

  const handleSelectAllUsers = () => {
    if (!onUserIdsChange) return;
    if (selectedUserIds.length === users.length) {
      onUserIdsChange([]);
    } else {
      onUserIdsChange(users.map((u) => u.userId));
    }
  };

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

      {/* User Filter - only shown when permission allows */}
      {showUserFilter && users.length > 0 && (
        <Popover open={userFilterOpen} onOpenChange={setUserFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={userFilterOpen}
              className={cn(
                "w-[160px] justify-between",
                selectedUserIds.length > 0 && "border-primary"
              )}
            >
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="truncate">
                {selectedUserIds.length === 0
                  ? "All Users"
                  : selectedUserIds.length === 1
                    ? users.find((u) => u.userId === selectedUserIds[0])?.name || "1 user"
                    : `${selectedUserIds.length} users`}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <div className="max-h-[300px] overflow-auto">
              {/* Select All option */}
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 border-b px-3 py-2 hover:bg-muted/50"
                onClick={handleSelectAllUsers}
              >
                <Checkbox
                  checked={selectedUserIds.length === users.length && users.length > 0}
                  className="pointer-events-none"
                />
                <span className="font-medium text-sm">
                  {selectedUserIds.length === users.length ? "Deselect All" : "Select All"}
                </span>
              </button>

              {/* User list */}
              {users.map((user) => (
                <button
                  type="button"
                  key={user.userId}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/50"
                  onClick={() => handleUserToggle(user.userId)}
                >
                  <Checkbox
                    checked={selectedUserIds.includes(user.userId)}
                    className="pointer-events-none"
                  />
                  <div className="flex flex-col overflow-hidden text-left">
                    <span className="truncate text-sm">{user.name}</span>
                    {user.email && user.email !== user.name && (
                      <span className="truncate text-muted-foreground text-xs">{user.email}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

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
