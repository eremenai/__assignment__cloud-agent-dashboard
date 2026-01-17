"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const THEME_CYCLE = ["light", "dark", "system"] as const;

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme as (typeof THEME_CYCLE)[number]);
    const nextTheme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];
    setTheme(nextTheme);
  };

  // Use resolvedTheme for dark/light, but check theme for "system"
  const icon = theme === "system" ? <Monitor /> : resolvedTheme === "dark" ? <Moon /> : <Sun />;

  return (
    <Button size="icon" onClick={cycleTheme} aria-label="Cycle theme mode">
      {icon}
    </Button>
  );
}
