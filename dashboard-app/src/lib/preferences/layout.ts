// Sidebar Variant - fixed to inset
export const SIDEBAR_VARIANT = "inset" as const;
export type SidebarVariant = typeof SIDEBAR_VARIANT;

// Sidebar Collapsible - fixed to icon
export const SIDEBAR_COLLAPSIBLE = "icon" as const;
export type SidebarCollapsible = typeof SIDEBAR_COLLAPSIBLE;

// Content Layout
export const CONTENT_LAYOUT_OPTIONS = [
  { label: "Centered", value: "centered" },
  { label: "Full Width", value: "full-width" },
] as const;
export const CONTENT_LAYOUT_VALUES = CONTENT_LAYOUT_OPTIONS.map((v) => v.value);
export type ContentLayout = (typeof CONTENT_LAYOUT_VALUES)[number];

// Navbar Style - fixed to sticky
export const NAVBAR_STYLE = "sticky" as const;
export type NavbarStyle = typeof NAVBAR_STYLE;
