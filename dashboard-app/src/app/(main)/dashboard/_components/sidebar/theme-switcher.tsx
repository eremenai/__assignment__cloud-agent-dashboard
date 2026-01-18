"use client";

import { useEffect, useState } from "react";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const THEME_CYCLE = ["light", "dark", "system"] as const;

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme as (typeof THEME_CYCLE)[number]);
    const nextTheme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];
    setTheme(nextTheme);
  };

  // Render a placeholder with the same dimensions during SSR to prevent layout shift
  if (!mounted) {
    return (
      <Button size="icon" aria-label="Cycle theme mode" disabled>
        <Sun className="opacity-0" />
      </Button>
    );
  }

  // Use resolvedTheme for dark/light, but check theme for "system"
  const icon = theme === "system" ? <Monitor /> : resolvedTheme === "dark" ? <Moon /> : <Sun />;

  return (
    <Button size="icon" onClick={cycleTheme} aria-label="Cycle theme mode">
      {icon}
    </Button>
  );
}
