/**
 * Database connection factory for Drizzle ORM.
 * Provides a singleton connection pool.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// Connection pool singleton
let _client: postgres.Sql | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get the database connection URL from environment.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return url;
}

/**
 * Create or return existing database client.
 * Uses a singleton pattern to reuse connections.
 */
export function getDb() {
  if (!_db) {
    const url = getDatabaseUrl();
    _client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

/**
 * Close the database connection pool.
 * Call this on graceful shutdown.
 */
export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

/**
 * Create a new database client for a specific connection.
 * Use this for isolated connections (e.g., in tests).
 */
export function createDb(url?: string) {
  const connectionUrl = url ?? getDatabaseUrl();
  const client = postgres(connectionUrl, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(client, { schema });
  return { db, client };
}

// Re-export schema for convenience
export { schema };
