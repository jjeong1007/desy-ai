"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface NavMenuItem {
  icon: ReactNode;
  title: string;
  description?: string;
  href?: string;
}

/** Header dropdown used by the marketing nav. */
export function NavMenu({ label, items, footer, className }: { label: string; items: NavMenuItem[]; footer?: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex h-[33px] items-center gap-1 rounded-sm text-body font-medium text-fg transition-colors hover:text-fg-secondary"
      >
        {label}
        <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      <div id={id} hidden={!open} className="absolute top-full left-0 z-20 pt-2">
        <div className="flex w-[360px] flex-col gap-0.5 rounded-lg border border-line bg-canvas p-2 shadow-popover">
          {items.map((it) => {
            const cls = "flex items-start gap-3 rounded-sm p-2 no-underline transition-colors hover:bg-subtle";
            const body = (
              <>
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-subtle text-fg-secondary [&_svg]:size-4">{it.icon}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-body font-medium text-fg">{it.title}</span>
                  {it.description && <span className="text-small text-fg-tertiary">{it.description}</span>}
                </span>
              </>
            );
            return it.href?.startsWith("/") ? (
              <Link key={it.title} href={it.href} onClick={() => setOpen(false)} className={cls}>
                {body}
              </Link>
            ) : (
              <a key={it.title} href={it.href ?? "#"} onClick={() => setOpen(false)} className={cls}>
                {body}
              </a>
            );
          })}
          {footer && <div className="mt-1 border-t border-line px-2 pt-2 pb-1">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export interface AccordionItem {
  question: string;
  answer: ReactNode;
}

/** FAQ accordion from the marketing site. */
export function Accordion({ items, defaultOpen = 0, className }: { items: AccordionItem[]; defaultOpen?: number | null; className?: string }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const base = useId();
  return (
    <div className={cn("flex flex-col border-t border-line", className)}>
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.question} className="border-b border-line">
            <h3 className="m-0">
              <button
                type="button"
                id={`${base}-q${i}`}
                aria-expanded={on}
                aria-controls={`${base}-a${i}`}
                onClick={() => setOpen(on ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-6 text-left text-title font-medium text-fg transition-colors hover:text-fg-secondary"
              >
                {it.question}
                <Plus aria-hidden className={cn("size-4 shrink-0 text-fg-secondary transition-transform", on && "rotate-45")} />
              </button>
            </h3>
            <div
              id={`${base}-a${i}`}
              role="region"
              aria-labelledby={`${base}-q${i}`}
              className={cn("grid transition-[grid-template-rows] duration-300", on ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
            >
              <div className="overflow-hidden" inert={!on}>
                <div className="pb-6 text-body text-fg-secondary">{it.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
