/**
 * Test utilities and render helpers.
 */

import type { ReactElement, ReactNode } from "react";

import { type RenderOptions, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Re-export everything from testing-library
export * from "@testing-library/react";
export { userEvent };

/**
 * Providers wrapper for tests.
 * Add providers here as needed (AuthProvider, ThemeProvider, etc.)
 */
interface ProvidersProps {
  children: ReactNode;
}

function Providers({ children }: ProvidersProps) {
  // TODO: Add AuthProvider when implemented
  return <>{children}</>;
}

/**
 * Custom render function that wraps components with providers.
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Providers, ...options });
}

// Override render export
export { customRender as render };

/**
 * Create a user event instance for interaction testing.
 */
export function setupUser() {
  return userEvent.setup();
}

/**
 * Wait for a condition to be true.
 * Useful for async operations.
 */
export async function waitForCondition(condition: () => boolean, timeout = 5000, interval = 50): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
