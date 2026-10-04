import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Tag — Figma: "Frame 43" (170:2022).
 * Hue variants are for user-created tags. positive / confusion / frustration are the sentiment tags.
 */
const tagVariants = cva("inline-flex items-center gap-1 rounded-sm font-medium leading-none", {
  variants: {
    variant: {
      neutral: "bg-subtle text-fg-secondary",
      brand: "bg-brand-subtle text-fg-brand",
      positive: "bg-positive-subtle text-positive",
      confusion: "bg-confusion-subtle text-confusion",
      frustration: "bg-frustration-subtle text-frustration",
      red: "bg-tag-red-subtle text-tag-red",
      rust: "bg-tag-rust-subtle text-tag-rust",
      amber: "bg-tag-amber-subtle text-tag-amber",
      yellow: "bg-tag-yellow-subtle text-tag-yellow",
      green: "bg-tag-green-subtle text-tag-green",
      emerald: "bg-tag-emerald-subtle text-tag-emerald",
      teal: "bg-tag-teal-subtle text-tag-teal",
      cyan: "bg-tag-cyan-subtle text-tag-cyan",
      blue: "bg-tag-blue-subtle text-tag-blue",
      indigo: "bg-tag-indigo-subtle text-tag-indigo",
      violet: "bg-tag-violet-subtle text-tag-violet",
      purple: "bg-tag-purple-subtle text-tag-purple",
      pink: "bg-tag-pink-subtle text-tag-pink",
      rose: "bg-tag-rose-subtle text-tag-rose",
    },
    size: {
      md: "px-2 py-1 text-small",
      lg: "h-[33px] px-4 text-body",
    },
  },
  defaultVariants: { variant: "neutral", size: "md" },
});

export interface TagProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {}

export function Tag({ className, variant, size, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant, size }), className)} {...props} />;
}
