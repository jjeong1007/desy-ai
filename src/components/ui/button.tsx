import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

// Desy design system Button (Figma 99:20, 99:23). secondary/ghost/subtle/danger/link
// are aliases so existing screens keep their roles while using these styles.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-32 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "rounded-md bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-active",
        outline: "rounded-sm border border-line bg-canvas text-fg-secondary hover:bg-subtle active:bg-subtle",
        quiet: "rounded-sm text-fg-secondary hover:bg-subtle active:bg-subtle",
        secondary: "rounded-sm border border-line bg-canvas text-fg-secondary hover:bg-subtle active:bg-subtle",
        ghost: "rounded-sm text-fg-secondary hover:bg-subtle active:bg-subtle",
        subtle: "rounded-sm bg-subtle text-fg hover:bg-line",
        danger: "rounded-md bg-frustration text-on-brand hover:bg-frustration/90",
        link: "rounded-sm px-0 text-fg-brand underline-offset-4 hover:underline",
      },
      size: {
        lg: "h-[41px] px-4 text-body",
        md: "h-[33px] px-3 text-body",
        sm: "h-[25px] px-2 text-small",
        icon: "size-8 rounded-sm",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
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
