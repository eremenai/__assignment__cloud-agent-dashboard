/**
 * Data layer that switches between mock data and real DB based on environment.
 *
 * Set USE_REAL_DB=true to use real database queries.
 * Default is to use mock data for development.
 */

export * from "./org-data";
export * from "./sessions-data";
export * from "./users-data";
export * from "./global-data";
