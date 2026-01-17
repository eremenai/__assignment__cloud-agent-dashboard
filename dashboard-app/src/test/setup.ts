/**
 * Vitest test setup file.
 * Runs before each test file.
 */

import "@testing-library/jest-dom/vitest";

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	}),
});

// Mock ResizeObserver
class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
	root = null;
	rootMargin = "";
	thresholds = [];
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}

window.IntersectionObserver =
	IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Suppress console errors during tests (optional, can be removed)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });
// afterAll(() => {
//   console.error = originalError;
// });
