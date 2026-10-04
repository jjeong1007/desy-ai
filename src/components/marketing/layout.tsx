"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

/** Page gutter from the marketing site: 1440px frame, 100px side padding, 1240px content. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-6 lg:px-[100px]", className)}>{children}</div>;
}

/** True once the element has scrolled into view. */
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") return setInView(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [inView, threshold]);
  return [ref, inView] as const;
}

/** Fades content up as it enters the viewport. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("motion-safe:transition-[opacity,translate] motion-safe:duration-700", inView ? "translate-y-0 opacity-100" : "motion-safe:translate-y-6 motion-safe:opacity-0", className)}
    >
      {children}
    </div>
  );
}

/** Eyebrow + headline + lead, matching the marketing section headers. */
export function SectionHeader({ eyebrow, title, lead, align = "center", className, as: Title = "h2" }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; align?: "center" | "left"; className?: string; as?: "h1" | "h2" }) {
  return (
    <Reveal className={cn("flex flex-col gap-6", align === "center" ? "mx-auto max-w-[602px] items-center text-center" : "max-w-[667px] items-start", className)}>
      {eyebrow && (
        <Tag variant="brand" size="lg">
          {eyebrow}
        </Tag>
      )}
      <Title className="m-0 text-page-title font-medium text-fg md:text-display-sm">{title}</Title>
      {lead && <p className="m-0 text-heading font-medium text-fg-secondary">{lead}</p>}
    </Reveal>
  );
}

/** Two-column feature row: product visual + copy. */
export function FeatureRow({ visual, title, body, points, action, reverse }: { visual: ReactNode; title: ReactNode; body: ReactNode; points?: string[]; action?: ReactNode; reverse?: boolean }) {
  return (
    <div className={cn("grid items-center gap-10", reverse ? "lg:grid-cols-[662fr_539fr]" : "lg:grid-cols-[539fr_662fr]")}>
      <Reveal className={cn("min-w-0", reverse && "lg:order-2")}>{visual}</Reveal>
      <Reveal delay={120} className={cn("flex flex-col gap-6", reverse && "lg:order-1")}>
        <h3 className="m-0 text-page-title font-medium text-fg md:text-display-sm">{title}</h3>
        <p className="m-0 max-w-[602px] text-heading font-medium text-fg-secondary">{body}</p>
        {points && (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-body font-medium text-fg-secondary">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-fg-brand">
                  <Check className="size-3.5" aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>
        )}
        {action && <div className="pt-6">{action}</div>}
      </Reveal>
    </div>
  );
}

/** Padded stage with the feature inset as its own window. */
export function DemoFrame({ className, windowClassName, children, label, background }: { className?: string; windowClassName?: string; children: ReactNode; label: string; background?: string }) {
  return (
    <figure aria-label={label} className={cn("relative m-0 overflow-hidden rounded-xl bg-subtle p-3 sm:p-6 lg:p-10", className)}>
      {background && <img src={background} alt="" className="pointer-events-none absolute inset-0 size-full max-w-none rounded-xl object-cover" />}
      <div className={cn("relative h-full overflow-hidden rounded-lg border border-line bg-muted shadow-card", windowClassName)}>{children}</div>
    </figure>
  );
}
