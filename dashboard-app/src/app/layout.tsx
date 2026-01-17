import type { ReactNode } from "react";

import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { APP_CONFIG } from "@/config/app-config";
import { fontVars } from "@/lib/fonts/registry";
import { SIDEBAR_COLLAPSIBLE, SIDEBAR_VARIANT } from "@/lib/preferences/layout";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { THEME_PRESET } from "@/lib/preferences/theme";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_mode, content_layout } = PREFERENCE_DEFAULTS;
  return (
    <html
      lang="en"
      data-theme-mode={theme_mode}
      data-theme-preset={THEME_PRESET}
      data-content-layout={content_layout}
      data-navbar-style="sticky"
      data-sidebar-variant={SIDEBAR_VARIANT}
      data-sidebar-collapsible={SIDEBAR_COLLAPSIBLE}
      suppressHydrationWarning
    >
      <head>
        {/* Applies theme and layout preferences on load to avoid flicker and unnecessary server rerenders. */}
        <ThemeBootScript />
      </head>
      <body className={`${fontVars} min-h-screen antialiased`}>
        <PreferencesStoreProvider themeMode={theme_mode} contentLayout={content_layout}>
          {children}
          <Toaster />
        </PreferencesStoreProvider>
      </body>
    </html>
  );
}
