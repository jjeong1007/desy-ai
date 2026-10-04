import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Checkbox — replaces the empty square used on highlight cards (Figma 201:4455). */
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, label, ...props }, ref) => (
  <label className={cn("inline-flex cursor-pointer items-center gap-2 text-small text-fg-secondary", className)}>
    <span className="relative inline-flex size-3.5">
      <input
        ref={ref}
        type="checkbox"
        aria-label={label ? undefined : props["aria-label"] ?? "Select"}
        className="peer size-3.5 cursor-pointer appearance-none rounded-[3px] border-[1.5px] border-line-strong bg-canvas checked:border-brand checked:bg-brand disabled:opacity-32"
        {...props}
      />
      <Check strokeWidth={3} className="pointer-events-none absolute inset-0 m-auto size-2.5 text-on-brand opacity-0 peer-checked:opacity-100" />
    </span>
    {label}
  </label>
));
Checkbox.displayName = "Checkbox";
