/**
 * Simplified preferences - most values are fixed, only theme mode is configurable.
 */

import { DEFAULT_FONT, type FontKey } from "@/lib/fonts/registry";

import {
  CONTENT_LAYOUT_VALUES,
  type ContentLayout,
  NAVBAR_STYLE,
  type NavbarStyle,
  SIDEBAR_COLLAPSIBLE,
  SIDEBAR_VARIANT,
  type SidebarCollapsible,
  type SidebarVariant,
} from "./layout";
import { THEME_PRESET, type ThemeMode, type ThemePreset } from "./theme";

export type PreferencePersistence = "none" | "client-cookie" | "server-cookie" | "localStorage";

/**
 * Simplified preference values - most are fixed.
 */
export type PreferenceValueMap = {
  theme_mode: ThemeMode;
  theme_preset: ThemePreset;
  font: FontKey;
  content_layout: ContentLayout;
  navbar_style: NavbarStyle;
  sidebar_variant: SidebarVariant;
  sidebar_collapsible: SidebarCollapsible;
};

export type PreferenceKey = keyof PreferenceValueMap;

/**
 * Default preference values - most are fixed constants.
 */
export const PREFERENCE_DEFAULTS: PreferenceValueMap = {
  theme_mode: "system",
  theme_preset: THEME_PRESET,
  font: DEFAULT_FONT,
  content_layout: CONTENT_LAYOUT_VALUES[0], // centered
  navbar_style: NAVBAR_STYLE, // always sticky
  sidebar_variant: SIDEBAR_VARIANT, // always inset
  sidebar_collapsible: SIDEBAR_COLLAPSIBLE, // always icon
};

/**
 * Only theme_mode needs persistence - rest are fixed.
 */
export const PREFERENCE_PERSISTENCE: Record<PreferenceKey, PreferencePersistence> = {
  theme_mode: "client-cookie",
  theme_preset: "none",
  font: "none",
  content_layout: "client-cookie",
  navbar_style: "none",
  sidebar_variant: "none",
  sidebar_collapsible: "none",
};
