/**
 * Shared types for projectors.
 */

import type { getDb } from "@repo/shared/db/client";

/**
 * Database transaction type used by projectors.
 */
export type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
