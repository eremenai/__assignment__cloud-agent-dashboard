"use client";

/**
 * Breadcrumbs context for providing dynamic metadata to breadcrumbs.
 */

import { createContext, type ReactNode, useContext, useState } from "react";

interface BreadcrumbsMetadata {
  /** User name for user detail pages */
  userName?: string;
  /** User ID for preserving context when navigating */
  fromUserId?: string;
  /** User name for preserving context */
  fromUserName?: string;
}

interface BreadcrumbsContextValue {
  metadata: BreadcrumbsMetadata;
  setMetadata: (metadata: Partial<BreadcrumbsMetadata>) => void;
  clearMetadata: () => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextValue | null>(null);

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadataState] = useState<BreadcrumbsMetadata>({});

  const setMetadata = (newMetadata: Partial<BreadcrumbsMetadata>) => {
    setMetadataState((prev) => ({ ...prev, ...newMetadata }));
  };

  const clearMetadata = () => {
    setMetadataState({});
  };

  return (
    <BreadcrumbsContext.Provider value={{ metadata, setMetadata, clearMetadata }}>
      {children}
    </BreadcrumbsContext.Provider>
  );
}

export function useBreadcrumbs() {
  const context = useContext(BreadcrumbsContext);
  if (!context) {
    throw new Error("useBreadcrumbs must be used within a BreadcrumbsProvider");
  }
  return context;
}

export function useBreadcrumbsOptional() {
  return useContext(BreadcrumbsContext);
}
