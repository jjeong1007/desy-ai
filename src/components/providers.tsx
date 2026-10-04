"use client";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/overlay";
import { applyTheme } from "@/components/theme-toggle";
import { useDesy } from "@/store/desy";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useDesy((s) => s.hydrate);
  const theme = useDesy((s) => s.settings?.theme);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyTheme("system");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [theme]);
  return (
    <TooltipProvider>
      {children}
      <Toaster position="bottom-right" toastOptions={{ className: "!rounded-lg !border !border-line !bg-canvas !text-ink !shadow-pop !font-sans" }} />
    </TooltipProvider>
  );
}

/** Inline script that sets the theme class before first paint. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('desy:theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
