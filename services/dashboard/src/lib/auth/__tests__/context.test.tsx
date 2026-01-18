/**
 * Tests for AuthContext and useAuth hook.
 */

import type { ReactNode } from "react";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthUser } from "@/test/factories";

import { AuthProvider, useAuth } from "../context";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("AuthContext", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  function wrapperWithUser(user: ReturnType<typeof createAuthUser> | null) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <AuthProvider initialUser={user}>{children}</AuthProvider>;
    };
  }

  it("should throw error when useAuth is used outside provider", () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");

    spy.mockRestore();
  });

  it("should have null user when initialUser is null", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperWithUser(null),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should use initialUser when provided", () => {
    const testUser = createAuthUser({
      userId: "test-user",
      name: "Test User",
      role: "admin",
      orgId: "org-test",
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperWithUser(testUser),
    });

    expect(result.current.user).toEqual(testUser);
    expect(result.current.isLoading).toBe(false);
  });

  describe("permissions", () => {
    it("should check member permissions correctly", () => {
      const user = createAuthUser({ role: "member" });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      expect(result.current.can("view_own_sessions")).toBe(true);
      expect(result.current.can("view_org_sessions")).toBe(false);
      expect(result.current.can("export_data")).toBe(false);
      expect(result.current.can("switch_org_context")).toBe(false);
      expect(result.current.can("view_global_overview")).toBe(false);
    });

    it("should check manager permissions correctly", () => {
      const user = createAuthUser({ role: "manager" });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      expect(result.current.can("view_own_sessions")).toBe(true);
      expect(result.current.can("view_org_sessions")).toBe(true);
      expect(result.current.can("export_data")).toBe(true);
      expect(result.current.can("switch_org_context")).toBe(false);
    });

    it("should check support permissions correctly", () => {
      const user = createAuthUser({ role: "support", orgId: null });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      expect(result.current.can("switch_org_context")).toBe(true);
      expect(result.current.can("view_global_overview")).toBe(false);
    });

    it("should check super_admin permissions correctly", () => {
      const user = createAuthUser({ role: "super_admin", orgId: null });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      expect(result.current.can("switch_org_context")).toBe(true);
      expect(result.current.can("view_global_overview")).toBe(true);
    });
  });

  describe("canViewSession", () => {
    it("should allow member to view only own sessions", () => {
      const user = createAuthUser({ userId: "user-1", role: "member" });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      expect(result.current.canViewSession("user-1")).toBe(true);
      expect(result.current.canViewSession("user-2")).toBe(false);
    });

    it("should allow manager to view all sessions", () => {
      const user = createAuthUser({ userId: "user-1", role: "manager" });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      expect(result.current.canViewSession("user-1")).toBe(true);
      expect(result.current.canViewSession("user-2")).toBe(true);
    });
  });

  describe("canViewUser", () => {
    it("should allow member to view only own profile", () => {
      const user = createAuthUser({ userId: "user-1", role: "member" });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      expect(result.current.canViewUser("user-1")).toBe(true);
      expect(result.current.canViewUser("user-2")).toBe(false);
    });

    it("should allow admin to view all users", () => {
      const user = createAuthUser({ userId: "user-1", role: "admin" });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      expect(result.current.canViewUser("user-1")).toBe(true);
      expect(result.current.canViewUser("user-2")).toBe(true);
    });
  });

  describe("org context switching", () => {
    it("should not allow member to switch org", () => {
      const user = createAuthUser({ role: "member", orgId: "org-1" });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      const initialOrgId = result.current.currentOrgId;

      act(() => {
        result.current.setCurrentOrgId("org-2");
      });

      // Should remain unchanged
      expect(result.current.currentOrgId).toBe(initialOrgId);
    });

    it("should allow super_admin to switch org", () => {
      const user = createAuthUser({ role: "super_admin", orgId: null });
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapperWithUser(user),
      });

      act(() => {
        result.current.setCurrentOrgId("org-acme");
      });

      expect(result.current.currentOrgId).toBe("org-acme");

      act(() => {
        result.current.setCurrentOrgId(null);
      });

      expect(result.current.currentOrgId).toBeNull();
    });
  });
});
