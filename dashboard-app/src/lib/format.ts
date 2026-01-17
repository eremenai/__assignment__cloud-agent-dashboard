/**
 * Formatting utilities for displaying values in the dashboard.
 */

/**
 * Format a number with locale-specific separators.
 */
export function formatNumber(value: number): string {
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(1)}M`;
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(1)}K`;
	}
	return value.toLocaleString();
}

/**
 * Format a currency value in USD.
 */
export function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(value);
}

/**
 * Format a duration in milliseconds to human-readable format.
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	}
	if (ms < 60_000) {
		return `${(ms / 1000).toFixed(1)}s`;
	}
	if (ms < 3_600_000) {
		const minutes = Math.floor(ms / 60_000);
		const seconds = Math.floor((ms % 60_000) / 1000);
		return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
	}
	const hours = Math.floor(ms / 3_600_000);
	const minutes = Math.floor((ms % 3_600_000) / 60_000);
	return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Format a date as relative time (e.g., "2h ago").
 */
export function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);

	if (diffSec < 60) {
		return "just now";
	}
	if (diffMin < 60) {
		return `${diffMin}m ago`;
	}
	if (diffHour < 24) {
		return `${diffHour}h ago`;
	}
	if (diffDay < 7) {
		return `${diffDay}d ago`;
	}
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number, decimals = 1): string {
	return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date for display in tables/charts.
 */
export function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Format a date for chart axis display.
 */
export function formatChartDate(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str: string, length: number): string {
	if (str.length <= length) return str;
	return `${str.slice(0, length)}...`;
}

/**
 * Format a session ID for display (truncated).
 */
export function formatSessionId(id: string): string {
	return `#${id.slice(0, 8)}`;
}
