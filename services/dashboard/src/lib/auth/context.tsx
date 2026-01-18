"use client";

/**
 * Authentication context provider.
 * Manages user state, org context switching, and permissions.
 */

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { DEFAULT_DEV_USER, getDevUser } from "@/dev/dev-users";
import type { AuthContextValue, AuthUser, Permission } from "@/lib/types/auth";
import { canSwitchOrg, canViewAllOrgData, ROLE_PERMISSIONS } from "@/lib/types/auth";

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY_USER = "dev-auth-user-id";
const STORAGE_KEY_ORG = "dev-auth-org-id";

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
  /** Initial user for testing (bypasses localStorage) */
  initialUser?: AuthUser;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  // Initialize from localStorage on mount (dev mode)
  useEffect(() => {
    if (initialUser) return;

    const storedUserId = localStorage.getItem(STORAGE_KEY_USER);
    const storedOrgId = localStorage.getItem(STORAGE_KEY_ORG);

    let loadedUser: AuthUser;

    if (storedUserId) {
      const devUser = getDevUser(storedUserId);
      if (devUser) {
        loadedUser = devUser;
      } else {
        loadedUser = DEFAULT_DEV_USER;
      }
    } else {
      loadedUser = DEFAULT_DEV_USER;
    }

    setUser(loadedUser);

    // Set org context
    if (canSwitchOrg(loadedUser.role) && storedOrgId !== null) {
      // SUPPORT/SUPER_ADMIN can switch orgs
      setCurrentOrgIdState(storedOrgId === "null" ? null : storedOrgId);
    } else {
      // Regular users use their own org
      setCurrentOrgIdState(loadedUser.orgId);
    }

    setIsLoading(false);
  }, [initialUser]);

  // Switch user (dev mode only)
  const switchUser = useCallback((userId: string) => {
    const devUser = getDevUser(userId);
    if (!devUser) {
      console.warn(`Dev user not found: ${userId}`);
      return;
    }

    setUser(devUser);
    localStorage.setItem(STORAGE_KEY_USER, userId);

    // Reset org context based on new user's role
    if (canSwitchOrg(devUser.role)) {
      // Keep current org context if valid, otherwise reset
      // For SUPER_ADMIN with null org, keep global view
      if (devUser.orgId === null) {
        setCurrentOrgIdState(null);
        localStorage.setItem(STORAGE_KEY_ORG, "null");
      }
    } else {
      // Regular users use their org
      setCurrentOrgIdState(devUser.orgId);
      if (devUser.orgId) {
        localStorage.setItem(STORAGE_KEY_ORG, devUser.orgId);
      }
    }
  }, []);

  // Set current org context (for SUPPORT/SUPER_ADMIN)
  const setCurrentOrgId = useCallback(
    (orgId: string | null) => {
      if (!user) return;

      if (!canSwitchOrg(user.role)) {
        console.warn("User cannot switch org context");
        return;
      }

      setCurrentOrgIdState(orgId);
      localStorage.setItem(STORAGE_KEY_ORG, orgId ?? "null");
    },
    [user],
  );

  // Check if user has a permission
  const can = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      return ROLE_PERMISSIONS[user.role].includes(permission);
    },
    [user],
  );

  // Check if user can view a specific session
  const canViewSession = useCallback(
    (sessionCreatedByUserId: string): boolean => {
      if (!user) return false;

      // MEMBER can only view own sessions
      if (user.role === "MEMBER") {
        return sessionCreatedByUserId === user.userId;
      }

      // Others can view all org sessions
      return true;
    },
    [user],
  );

  // Check if user can view a specific user's details
  const canViewUser = useCallback(
    (targetUserId: string): boolean => {
      if (!user) return false;

      // MEMBER can only view own profile
      if (user.role === "MEMBER") {
        return targetUserId === user.userId;
      }

      // Others can view all org users
      return true;
    },
    [user],
  );

  const value: AuthContextValue = {
    user,
    isLoading,
    currentOrgId,
    setCurrentOrgId,
    can,
    canViewSession,
    canViewUser,
    switchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ============================================================================
// Utility Hook
// ============================================================================

/**
 * Hook to check if current user can view all org data or just their own.
 */
export function useCanViewAllOrgData(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return canViewAllOrgData(user.role);
}
