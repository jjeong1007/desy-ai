"use client";
import { Check } from "lucide-react";
import Link from "next/link";
import { Container, Reveal, SectionHeader } from "@/components/marketing/layout";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { money } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const PLANS = [
  {
    name: "Free",
    price: 0,
    period: "",
    blurb: "Score one idea and read a sample report.",
    features: ["1 idea", "De-risking report", "Sample evidence"],
    cta: "Start free",
    href: "/sign-up",
  },
  {
    name: "Pro",
    price: 29,
    period: "/month",
    blurb: "For founders comparing several ideas and running discovery.",
    features: ["Unlimited ideas", "Re-runs when you change the inputs", "Research planner and interview synthesis"],
    cta: "Choose Pro",
    href: "/sign-up",
    popular: true,
  },
];

export function PricingBlock({ heading = "section" }: { heading?: "section" | "page" }) {
  return (
    <section id="pricing" className="scroll-mt-24 py-12 md:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeader
          as={heading === "page" ? "h1" : "h2"}
          eyebrow="Pricing"
          title="Start free. Scale when the idea holds up."
          lead="Placeholder tiers. There is no checkout. Creating an account opens the full demo, including unlimited ideas."
        />
        <div className="mx-auto grid w-full max-w-[860px] gap-4 md:grid-cols-2">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 100}>
              <div className={cn("flex h-full flex-col gap-6 rounded-lg border border-line bg-canvas p-6", p.popular && "shadow-card")}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="m-0 text-heading font-medium text-fg">{p.name}</h3>
                    {p.popular && <Tag variant="brand">Most popular</Tag>}
                  </div>
                  <p className="m-0 text-body text-fg-secondary">{p.blurb}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-page-title font-semibold text-fg">{money(p.price)}</span>
                  {p.period && <span className="text-body text-fg-tertiary">{p.period}</span>}
                </div>
                <ul className="m-0 flex flex-1 list-none flex-col gap-3 p-0">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-body text-fg-secondary">
                      <Check className="size-4 shrink-0 text-fg-brand" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" variant={p.popular ? "primary" : "outline"}>
                  <Link href={p.href}>{p.cta}</Link>
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
