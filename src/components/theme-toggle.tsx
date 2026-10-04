"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { saveSettings } from "@/services/account";
import { useDesy } from "@/store/desy";
import type { Settings } from "@/types";

function isDark(theme: Settings["theme"]) {
  return theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function applyTheme(theme: Settings["theme"]) {
  document.documentElement.classList.toggle("dark", isDark(theme));
}

/** Switches the whole site between light and dark. The choice is stored with the other settings. */
export function ThemeToggle() {
  const theme = useDesy((s) => s.settings?.theme ?? "system");
  const hydrated = useDesy((s) => s.hydrated);
  const setSettings = useDesy((s) => s.setSettings);
  const [dark, setDark] = useState(false);

  useLayoutEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const next = isDark(theme);
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }, [theme, hydrated]);

  const toggle = async () => {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    applyTheme(next);
    setSettings(await saveSettings({ theme: next }));
  };

  return (
    <IconButton label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggle} disabled={!hydrated}>
      {dark ? <Sun /> : <Moon />}
    </IconButton>
  );
}
