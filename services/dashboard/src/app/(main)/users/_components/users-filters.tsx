"use client";

/**
 * Users filter bar with search functionality.
 */

import { useEffect, useRef, useState } from "react";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface UsersFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function UsersFilters({ search, onSearchChange }: UsersFiltersProps) {
  // Use local state for immediate input feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when external search changes
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounce the search callback
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounced callback
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative min-w-[200px] max-w-sm flex-1">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
