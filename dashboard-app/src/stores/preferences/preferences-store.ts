import { createStore } from "zustand/vanilla";

import { DEFAULT_FONT, type FontKey } from "@/lib/fonts/registry";
import {
  type ContentLayout,
  NAVBAR_STYLE,
  type NavbarStyle,
  SIDEBAR_COLLAPSIBLE,
  SIDEBAR_VARIANT,
  type SidebarCollapsible,
  type SidebarVariant,
} from "@/lib/preferences/layout";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { type ResolvedThemeMode, THEME_PRESET, type ThemeMode, type ThemePreset } from "@/lib/preferences/theme";

export type PreferencesState = {
  // Configurable
  themeMode: ThemeMode;
  resolvedThemeMode: ResolvedThemeMode;
  contentLayout: ContentLayout;

  // Fixed values (kept for compatibility but not changeable via UI)
  themePreset: ThemePreset;
  font: FontKey;
  navbarStyle: NavbarStyle;
  sidebarVariant: SidebarVariant;
  sidebarCollapsible: SidebarCollapsible;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setResolvedThemeMode: (mode: ResolvedThemeMode) => void;
  setContentLayout: (layout: ContentLayout) => void;

  isSynced: boolean;
  setIsSynced: (val: boolean) => void;
};

export const createPreferencesStore = (init?: Partial<PreferencesState>) =>
  createStore<PreferencesState>()((set) => ({
    // Configurable
    themeMode: init?.themeMode ?? PREFERENCE_DEFAULTS.theme_mode,
    resolvedThemeMode: init?.resolvedThemeMode ?? "light",
    contentLayout: init?.contentLayout ?? PREFERENCE_DEFAULTS.content_layout,

    // Fixed values
    themePreset: THEME_PRESET,
    font: DEFAULT_FONT,
    navbarStyle: NAVBAR_STYLE,
    sidebarVariant: SIDEBAR_VARIANT,
    sidebarCollapsible: SIDEBAR_COLLAPSIBLE,

    // Actions
    setThemeMode: (mode) => set({ themeMode: mode }),
    setResolvedThemeMode: (mode) => set({ resolvedThemeMode: mode }),
    setContentLayout: (layout) => set({ contentLayout: layout }),

    isSynced: init?.isSynced ?? false,
    setIsSynced: (val) => set({ isSynced: val }),
  }));
