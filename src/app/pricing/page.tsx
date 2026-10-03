import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };

const TIERS = [
  {
    name: "Free",
    price: 0,
    period: "",
    blurb: "Score one idea and read a sample report.",
    points: ["1 idea", "De-risking report", "Sample evidence"],
    cta: "Start free",
    href: "/sign-up",
  },
  {
    name: "Pro",
    price: 29,
    period: "/month",
    blurb: "For founders comparing several ideas and running discovery.",
    points: ["Unlimited ideas", "Re-runs when you change the inputs", "Research planner and interview synthesis", "Adjustable scoring weights"],
    cta: "Choose Pro",
    href: "/sign-up",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6">
        <h1 className="text-3xl font-semibold md:text-4xl">Pricing</h1>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-ink-2">Placeholder tiers. There is no checkout. Creating an account opens the full demo, including unlimited ideas, so you can try the product.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {TIERS.map((t) => (
            <article key={t.name} className="flex flex-col rounded-lg border border-line p-6">
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <p className="tnum mt-3 text-4xl font-medium">
                {money(t.price)}
                {t.period ? <span className="text-base font-normal text-muted">{t.period}</span> : null}
              </p>
              <p className="mt-2 text-sm text-ink-2">{t.blurb}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {t.points.map((p) => (
                  <li key={p} className="flex gap-2 text-ink-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-strong" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              <Button asChild variant="primary" className="mt-6 w-full">
                <Link href={t.href}>{t.cta}</Link>
              </Button>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-2">
          Questions about the score? <Link href="/#faq" className="font-medium text-accent-strong hover:underline">Read the FAQ</Link>.
        </p>
      </div>
    </MarketingShell>
  );
}
