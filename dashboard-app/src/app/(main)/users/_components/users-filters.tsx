"use client";

/**
 * Users filter bar with search functionality.
 */

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface UsersFiltersProps {
	search: string;
	onSearchChange: (value: string) => void;
}

export function UsersFilters({ search, onSearchChange }: UsersFiltersProps) {
	return (
		<div className="flex flex-wrap items-center gap-4">
			{/* Search */}
			<div className="relative flex-1 min-w-[200px] max-w-sm">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search users..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
				/>
			</div>
		</div>
	);
}
