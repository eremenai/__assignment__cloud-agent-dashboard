/**
 * Basic test to verify testing infrastructure works.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
	createUser,
	createSession,
	createRun,
	createAuthUser,
	resetIdCounter,
} from "./factories";

describe("Test Infrastructure", () => {
	beforeEach(() => {
		resetIdCounter();
	});

	it("should be able to run tests", () => {
		expect(true).toBe(true);
	});

	it("should have jest-dom matchers available", () => {
		const div = document.createElement("div");
		div.textContent = "Hello";
		document.body.appendChild(div);
		expect(div).toBeInTheDocument();
		document.body.removeChild(div);
	});
});

describe("Test Factories", () => {
	beforeEach(() => {
		resetIdCounter();
	});

	it("should create a user with defaults", () => {
		const user = createUser();
		expect(user.userId).toMatch(/^user-test-\d+$/);
		expect(user.role).toBe("MEMBER");
		expect(user.orgId).toBe("org-test");
	});

	it("should create a user with overrides", () => {
		const user = createUser({
			name: "Custom Name",
			role: "ORG_ADMIN",
			orgId: "org-custom",
		});
		expect(user.name).toBe("Custom Name");
		expect(user.role).toBe("ORG_ADMIN");
		expect(user.orgId).toBe("org-custom");
	});

	it("should create an auth user", () => {
		const authUser = createAuthUser({ role: "SUPER_ADMIN", orgId: null });
		expect(authUser.role).toBe("SUPER_ADMIN");
		expect(authUser.orgId).toBeNull();
	});

	it("should create a session with computed timestamps", () => {
		const session = createSession();
		expect(session.sessionId).toMatch(/^sess-test-\d+$/);
		expect(session.lastMessageAt.getTime()).toBeGreaterThan(
			session.firstMessageAt.getTime(),
		);
	});

	it("should create a run with computed completedAt", () => {
		const run = createRun({ executionMs: 120000 });
		const expectedCompletion =
			run.startedAt.getTime() + run.executionMs;
		expect(run.completedAt.getTime()).toBe(expectedCompletion);
	});
});
