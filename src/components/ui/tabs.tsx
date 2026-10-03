"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Figma-style tinted pill tabs with roving keyboard focus. */
export function PillTabs<T extends string>({ tabs, value, onChange, label, className, idBase }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string; className?: string; idBase: string }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = tabs.length - 1;
    if (n >= 0) {
      e.preventDefault();
      refs.current[n]?.focus();
      onChange(tabs[n].id);
    }
  };
  return (
    <div role="tablist" aria-label={label} className={cn("flex items-center gap-1 overflow-x-auto scrollbar-thin", className)}>
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`${idBase}-tab-${t.id}`}
            aria-selected={active}
            aria-controls={`${idBase}-panel-${t.id}`}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.id)}
            className={cn("flex shrink-0 items-center gap-1.5 rounded px-3 py-2 text-sm font-medium transition-colors", active ? "bg-accent-tint text-accent" : "text-ink-2 hover:bg-surface hover:text-ink")}
          >
            {t.label}
            {t.count != null ? <span className={cn("tnum text-xs", active ? "text-accent/80" : "text-muted")}>{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label, size = "md" }: { options: { id: T; label: string; icon?: React.ReactNode }[]; value: T; onChange: (v: T) => void; label: string; size?: "sm" | "md" }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn("flex items-center gap-1.5 rounded-sm font-medium transition-colors [&_svg]:size-3.5", size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-[13px]", value === o.id ? "bg-canvas text-ink" : "text-ink-2 hover:text-ink")}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
