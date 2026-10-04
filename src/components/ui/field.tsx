import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("h-[33px] w-full rounded-sm border border-line bg-canvas px-3 text-body text-fg placeholder:text-fg-tertiary focus-visible:border-line-strong aria-[invalid=true]:border-git-deleted", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("min-h-[84px] w-full rounded-lg border border-line bg-canvas px-4 py-3 text-body leading-relaxed text-fg placeholder:text-fg-tertiary focus-visible:border-line-strong aria-[invalid=true]:border-git-deleted", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn("h-[33px] rounded-sm border border-line bg-canvas pl-3 pr-8 text-body text-fg focus-visible:border-line-strong", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-body font-medium text-fg", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse2 rounded bg-surface-2", className)} />;
}

export function Switch({ checked, onCheckedChange, label, id }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-line")}
    >
      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

export function Progress({ value, className, label, tone = "accent" }: { value: number; className?: string; label: string; tone?: "accent" | "ink" | "weak" | "strong" }) {
  const toneCls = { accent: "bg-accent", ink: "bg-ink", weak: "bg-weak", strong: "bg-strong" }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", toneCls)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex size-4 items-center justify-center rounded-xs bg-line font-sans text-panel font-normal leading-none text-fg-tertiary">{children}</kbd>;
}
