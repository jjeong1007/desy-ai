import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("h-9 w-full rounded border border-line bg-canvas px-4 text-sm text-ink placeholder:text-muted focus-visible:border-accent aria-[invalid=true]:border-weak", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("min-h-[84px] w-full rounded-lg border border-line bg-canvas px-4 py-2 text-sm leading-relaxed text-ink placeholder:text-muted focus-visible:border-accent aria-[invalid=true]:border-weak", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn("h-9 rounded border border-line bg-canvas pl-2.5 pr-8 text-sm text-ink focus-visible:border-accent", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-ink", className)} {...props} />;
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
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-accent-strong" : "bg-line-strong")}
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
  return <kbd className="inline-flex size-4 items-center justify-center rounded-sm bg-line text-[11px] font-normal leading-none text-muted">{children}</kbd>;
}
