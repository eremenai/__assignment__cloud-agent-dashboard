"use client";

/**
 * Authentication context provider.
 * Manages user state from JWT claims, org context switching, and permissions.
 *
 * In development mode:
 * - User data comes from JWT cookie set by mock-auth service
 * - DevAuthSwitcher component handles user switching via mock-auth-client
 */

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import type { AuthContextValue, AuthUser, Permission } from "@/lib/types/auth";
import { canSwitchOrg, canViewAllOrgData, ROLE_PERMISSIONS } from "@/lib/types/auth";

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY_ORG = "dev-auth-org-id";

// ============================================================================
// JWT Parsing
// ============================================================================

/**
 * Parse JWT token from cookie.
 * This is a simple base64 decode - actual verification happens on the server.
 */
function parseJwtFromCookie(): AuthUser | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";").map((c) => c.trim());
  const authCookie = cookies.find((c) => c.startsWith("auth_token="));

  if (!authCookie) return null;

  const token = authCookie.split("=")[1];
  if (!token) return null;

  try {
    // JWT is base64url encoded, split by "."
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode payload (second part)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

    return {
      userId: payload.sub,
      email: payload.email || "",
      name: payload.name || payload.email || payload.sub,
      orgId: payload.org_id || null,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
  /** Initial user for testing (bypasses JWT parsing) */
  initialUser?: AuthUser;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  // Initialize authentication from JWT on mount
  useEffect(() => {
    if (initialUser) return;

    function initFromJwt() {
      const jwtUser = parseJwtFromCookie();

      if (jwtUser) {
        setUser(jwtUser);

        // Restore org context for platform users
        if (canSwitchOrg(jwtUser.role)) {
          const storedOrgId = localStorage.getItem(STORAGE_KEY_ORG);
          setCurrentOrgIdState(storedOrgId === "null" ? null : storedOrgId);
        } else {
          setCurrentOrgIdState(jwtUser.orgId);
        }
      }

      setIsLoading(false);
    }

    initFromJwt();

    // Re-parse JWT when cookie changes (user switched via DevAuthSwitcher)
    const handleCookieChange = () => {
      const jwtUser = parseJwtFromCookie();
      if (jwtUser) {
        setUser(jwtUser);
        if (!canSwitchOrg(jwtUser.role)) {
          setCurrentOrgIdState(jwtUser.orgId);
        }
      }
    };

    // Poll for cookie changes (there's no native cookie change event)
    const interval = setInterval(handleCookieChange, 1000);

    return () => clearInterval(interval);
  }, [initialUser]);

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

  // Switch user - this should be called after mock-auth login completes
  // The actual user data will come from the new JWT cookie
  const switchUser = useCallback(() => {
    // Re-parse JWT after cookie is set by mock-auth
    const jwtUser = parseJwtFromCookie();
    if (jwtUser) {
      setUser(jwtUser);
      if (canSwitchOrg(jwtUser.role)) {
        if (jwtUser.orgId === null) {
          setCurrentOrgIdState(null);
          localStorage.setItem(STORAGE_KEY_ORG, "null");
        }
      } else {
        setCurrentOrgIdState(jwtUser.orgId);
        if (jwtUser.orgId) {
          localStorage.setItem(STORAGE_KEY_ORG, jwtUser.orgId);
        }
      }
    }
  }, []);

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
