/**
 * Development utilities and mock data.
 *
 * This module contains everything needed for development mode:
 * - Mock data (organizations, users, sessions, runs, events)
 * - Mock API functions that compute metrics
 * - Data generation utilities
 *
 * Note: Dev users are now fetched from mock-auth service, not hardcoded.
 */

// Data generation utilities
export * from "./generator";
// Mock API functions
export * from "./mock-api";
// Mock data
export * from "./mock-data";
