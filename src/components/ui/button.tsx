import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

// Figma Product v0: Geist Medium 14, px 12 py 8. Primary is #df5732 at 6px.
// Quiet actions are #525252 with no fill.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent/90",
        secondary: "border border-line bg-canvas text-ink-2 hover:bg-surface",
        ghost: "rounded text-ink-2 hover:bg-surface hover:text-ink",
        subtle: "bg-surface text-ink hover:bg-surface-2",
        danger: "bg-weak text-white hover:bg-weak/90 dark:text-canvas",
        link: "text-accent underline-offset-4 hover:underline px-0",
      },
      size: { sm: "h-8 px-3 text-sm", md: "h-9 px-3 text-sm", lg: "h-10 px-3 text-sm", icon: "size-8" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, type, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...(asChild ? {} : { type: type ?? "button" })} {...props} />;
});
Button.displayName = "Button";
export { buttonVariants };
