import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Canvas panel parts — Figma "Layers panel" (201:4943), "Configuration panel" (201:5139),
 * "Branch panel component" (210:1528).
 * Figma uses a warm-gray palette here, so these parts use the panel-* and scm-* tokens.
 */

/** Tabs — underline tabs from the Layers panel (201:4956). */
export function Tabs<T extends string>({ items, value, onChange, actions }: { items: { value: T; label: string }[]; value: T; onChange: (v: T) => void; actions?: ReactNode }) {
  return (
    <div className="flex h-[42px] items-center gap-4 border-b border-panel-line px-3">
      <div role="tablist" className="flex h-full gap-4">
        {items.map((it) => {
          const on = it.value === value;
          return (
            <button
              key={it.value}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(it.value)}
              className={cn("-mb-px h-full border-b-2 text-small transition-colors", on ? "border-brand font-semibold text-panel-fg" : "border-transparent text-panel-fg-tertiary hover:text-panel-fg-secondary")}
            >
              {it.label}
            </button>
          );
        })}
      </div>
      {actions && <div className="ml-auto flex gap-0.5">{actions}</div>}
    </div>
  );
}

/** LayerRow — Figma "Layer row" (201:4997). 16px indent per depth level. */
export interface LayerRowProps {
  name: string;
  icon: ReactNode;
  depth?: number;
  expanded?: boolean;
  hasChildren?: boolean;
  selected?: boolean;
  trailing?: ReactNode;
  onClick?: () => void;
  onToggle?: () => void;
}

export function LayerRow({ name, icon, depth = 0, expanded, hasChildren, selected, trailing, onClick, onToggle }: LayerRowProps) {
  return (
    <div
      role="treeitem"
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      onClick={onClick}
      style={{ paddingLeft: 8 + depth * 16 }}
      className={cn(
        "group flex h-7 cursor-default items-center gap-1 rounded-sm pr-2 text-small",
        selected ? "bg-brand-subtle font-medium text-fg-brand" : "text-panel-fg hover:bg-muted",
      )}
    >
      <button
        type="button"
        aria-label={expanded ? "Collapse" : "Expand"}
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        className={cn("inline-flex size-3 items-center justify-center text-panel-fg-tertiary", !hasChildren && "invisible")}
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
      </button>
      <span className="inline-flex text-panel-fg-secondary [&_svg]:size-3">{icon}</span>
      <span className="flex-1 truncate">{name}</span>
      {trailing && <span className="text-panel-fg-tertiary opacity-0 group-hover:opacity-100 [&_svg]:size-3">{trailing}</span>}
    </div>
  );
}

/** PropertyInput — Figma "Property controls" (201:5178), e.g. X 728 px. */
export function PropertyInput({ prefix, suffix, value, onChange, label }: { prefix?: string; suffix?: string; value: string | number; onChange?: (v: string) => void; label: string }) {
  return (
    <label className="flex h-[30px] min-w-0 flex-1 items-center gap-1.5 rounded-sm border border-panel-line bg-panel-field px-2 focus-within:border-panel-fg-secondary">
      {prefix && <span className="text-panel text-panel-fg-tertiary">{prefix}</span>}
      <input aria-label={label} value={value} onChange={(e) => onChange?.(e.target.value)} className="w-full min-w-0 bg-transparent text-small text-panel-fg outline-none" />
      {suffix && <span className="text-panel text-panel-fg-tertiary">{suffix}</span>}
    </label>
  );
}

/** ChangedFileRow — Figma "Changed file" (210:1582). */
const statusColor = { M: "text-git-modified", A: "text-git-added", D: "text-git-deleted", R: "text-git-renamed" } as const;
/** File-type label colors from the Figma Branch panel: TS/TSX blue, JSON amber, others muted. */
const extColor = (ext?: string) => (ext === "TS" || ext === "TSX" ? "text-git-renamed" : ext === "JSON" ? "text-git-modified" : "text-scm-fg-tertiary");

export function ChangedFileRow({ name, path, status, actions }: { name: string; path?: string; status: keyof typeof statusColor; actions?: ReactNode }) {
  const ext = name.split(".").pop()?.toUpperCase();
  return (
    <div className="group flex h-8 items-center gap-1.5 pr-2 pl-3 hover:bg-muted">
      <span className={cn("w-6 text-[9px] font-semibold", extColor(ext))}>{ext}</span>
      <span className="truncate text-panel font-medium text-scm-fg">{name}</span>
      {path && <span className="truncate text-caption text-scm-fg-tertiary">{path}</span>}
      <span className="flex-1" />
      {actions && <span className="flex opacity-0 group-hover:opacity-100">{actions}</span>}
      <span className={cn("font-mono text-caption font-medium", statusColor[status])}>{status}</span>
    </div>
  );
}
