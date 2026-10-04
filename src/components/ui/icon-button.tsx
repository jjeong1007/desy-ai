import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * IconButton — Figma: submit arrow (91:539), close "x" (201:4755), panel actions (201:4964).
 * Always pass `label`: it becomes the accessible name.
 */
const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-sm text-fg-secondary transition-colors disabled:pointer-events-none disabled:opacity-32",
  {
    variants: {
      variant: {
        filled: "border border-line bg-subtle hover:bg-line",
        outline: "border border-line bg-canvas hover:bg-subtle",
        ghost: "hover:bg-subtle",
      },
      size: {
        sm: "size-6 [&_svg]:size-3.5",
        md: "size-7 [&_svg]:size-3.5",
        lg: "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">, VariantProps<typeof iconButtonVariants> {
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ className, variant, size, label, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} aria-label={label} title={label} className={cn(iconButtonVariants({ variant, size }), className)} {...props} />
));
IconButton.displayName = "IconButton";
