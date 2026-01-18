"use client";

/**
 * Authentication context provider.
 * Manages user state from JWT claims, org context switching, and permissions.
 *
 * Initial user is parsed from JWT on the server and passed as a prop.
 * In development mode, DevAuthSwitcher handles user switching via mock-auth-client,
 * and this provider polls for cookie changes to detect user switches.
 */

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

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
// JWT Parsing (client-side, for dev mode user switching)
// ============================================================================

/**
 * Parse JWT token from cookie on the client.
 * Used only for dev mode user switching detection.
 */
function parseJwtFromCookie(): AuthUser | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";").map((c) => c.trim());
  const authCookie = cookies.find((c) => c.startsWith("auth_token="));

  if (!authCookie) return null;

  const token = authCookie.split("=")[1];
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

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
  /** Initial user parsed from JWT on the server */
  initialUser: AuthUser | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);
  const [isLoading] = useState(false);
  const lastUserIdRef = useRef<string | null>(initialUser?.userId ?? null);

  // Initialize org context from localStorage on mount
  useEffect(() => {
    if (!user) return;

    if (canSwitchOrg(user.role)) {
      const storedOrgId = localStorage.getItem(STORAGE_KEY_ORG);
      setCurrentOrgIdState(storedOrgId === "null" ? null : storedOrgId);
    } else {
      setCurrentOrgIdState(user.orgId);
    }
  }, [user]);

  // Poll for cookie changes in dev mode (for DevAuthSwitcher)
  useEffect(() => {
    const handleCookieChange = () => {
      const jwtUser = parseJwtFromCookie();
      if (jwtUser && jwtUser.userId !== lastUserIdRef.current) {
        lastUserIdRef.current = jwtUser.userId;
        setUser(jwtUser);
        if (!canSwitchOrg(jwtUser.role)) {
          setCurrentOrgIdState(jwtUser.orgId);
        }
      }
    };

    const interval = setInterval(handleCookieChange, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set current org context (for support/super_admin)
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
    const jwtUser = parseJwtFromCookie();
    if (jwtUser) {
      lastUserIdRef.current = jwtUser.userId;
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

      // member can only view own sessions
      if (user.role === "member") {
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

      // member can only view own profile
      if (user.role === "member") {
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
