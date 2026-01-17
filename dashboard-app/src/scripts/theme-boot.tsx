/**
 * Boot script that reads theme mode from cookies.
 * Runs early in <head> to apply the correct data attributes before hydration,
 * preventing theme flicker.
 */
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";

export function ThemeBootScript() {
  const defaults = JSON.stringify({
    theme_mode: PREFERENCE_DEFAULTS.theme_mode,
    content_layout: PREFERENCE_DEFAULTS.content_layout,
  });

  const code = `
    (function () {
      try {
        var root = document.documentElement;
        var DEFAULTS = ${defaults};

        function readCookie(name) {
          var match = document.cookie.split("; ").find(function(c) {
            return c.startsWith(name + "=");
          });
          return match ? decodeURIComponent(match.split("=")[1]) : null;
        }

        var rawMode = readCookie("theme_mode") || DEFAULTS.theme_mode;
        var rawContentLayout = readCookie("content_layout") || DEFAULTS.content_layout;

        var isValidMode = rawMode === "dark" || rawMode === "light" || rawMode === "system";
        var mode = isValidMode ? rawMode : DEFAULTS.theme_mode;
        var resolvedMode =
          mode === "system" && window.matchMedia
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : mode;

        root.classList.toggle("dark", resolvedMode === "dark");
        root.setAttribute("data-theme-mode", mode);
        root.setAttribute("data-content-layout", rawContentLayout);
        root.style.colorScheme = resolvedMode === "dark" ? "dark" : "light";

      } catch (e) {
        console.warn("ThemeBootScript error:", e);
      }
    })();
  `;

  /* biome-ignore lint/security/noDangerouslySetInnerHtml: required for pre-hydration boot script */
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
