/**
 * Shared types for projectors.
 */

import type { getDb } from "@repo/shared/db/client";

/**
 * Database transaction type used by projectors.
 */
export type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Ensure a value is a Date object.
 * Handles strings from database drivers that may return ISO date strings.
 */
export function ensureDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

/**
 * Convert a Date to ISO string for SQL template literals.
 * When using Drizzle's sql template, Date objects are converted
 * using .toString() which produces locale-aware output.
 * This ensures consistent ISO format.
 */
export function toIsoString(value: Date | string): string {
  return ensureDate(value).toISOString();
}
