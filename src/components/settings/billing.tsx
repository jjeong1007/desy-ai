"use client";
import { Check, CreditCard, Receipt } from "lucide-react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/app/app-shell";
import { PLANS } from "@/components/marketing/pricing-block";
import { SettingsHeader, SettingsSection } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { cn, money } from "@/lib/utils";
import { useDesy } from "@/store/desy";

/** Every account gets Pro in the demo; there is no checkout. */
const CURRENT_PLAN = "Pro";

const noCheckout = () => toast.message("Billing isn't connected in this demo, so nothing was changed or charged.");

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-subtle text-fg-secondary [&_svg]:size-4">{icon}</span>
        <div className="flex flex-col gap-0.5">
          <span className="text-body font-medium text-fg">{title}</span>
          <span className="text-small text-fg-secondary">{body}</span>
        </div>
      </div>
      {action}
    </div>
  );
}

export function BillingSettings() {
  const hydrated = useDesy((s) => s.hydrated);
  const ideas = useDesy((s) => s.ideas);
  const chats = useDesy((s) => s.chats);
  if (!hydrated) return <PageSkeleton />;

  const current = PLANS.find((p) => p.name === CURRENT_PLAN)!;
  const usage = [
    { label: "Ideas scored", value: ideas.filter((i) => i.status === "complete").length },
    { label: "Analysis runs", value: ideas.reduce((n, i) => n + i.history.filter((h) => h.kind === "run").length, 0) },
    { label: "Research plans", value: ideas.filter((i) => i.plan).length },
    { label: "Chats", value: chats.length },
  ];

  return (
    <div>
      <SettingsHeader title="Plans & billing" description="Your plan, what you've used, and how you pay." />

      <SettingsSection id="plan" title="Current plan">
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-canvas p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="text-heading font-semibold text-fg">{current.name}</span>
                <Tag variant="brand">Demo access</Tag>
              </span>
              <span className="text-small text-fg-secondary">{current.blurb}</span>
            </div>
            <span className="flex items-baseline gap-1">
              <span className="tnum text-page-title font-semibold text-fg">{money(0)}</span>
              <span className="text-small text-fg-tertiary">today</span>
            </span>
          </div>
          <p className="m-0 text-small text-fg-secondary">Every demo account gets Pro features at no charge. Listed price after launch: {money(current.price)}{current.period}.</p>
        </div>
      </SettingsSection>

      <SettingsSection id="usage" title="Usage" description="Totals for this workspace. Pro has no limits on any of these.">
        <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {usage.map((u) => (
            <div key={u.label} className="flex flex-col gap-1 rounded-lg border border-line p-4">
              <dt className="text-small text-fg-secondary">{u.label}</dt>
              <dd className="tnum m-0 text-heading font-semibold text-fg">{u.value}</dd>
              <span className="text-caption text-fg-tertiary">Unlimited</span>
            </div>
          ))}
        </dl>
      </SettingsSection>

      <SettingsSection id="plans" title="Plans">
        <div className="grid gap-3 sm:grid-cols-2">
          {PLANS.map((p) => {
            const isCurrent = p.name === CURRENT_PLAN;
            return (
              <div key={p.name} className={cn("flex flex-col gap-4 rounded-lg border p-5", isCurrent ? "border-brand" : "border-line")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-title font-semibold text-fg">{p.name}</span>
                  {isCurrent ? <Tag variant="brand">Current plan</Tag> : null}
                </div>
                <span className="flex items-baseline gap-1">
                  <span className="tnum text-heading font-semibold text-fg">{money(p.price)}</span>
                  {p.period ? <span className="text-small text-fg-tertiary">{p.period}</span> : null}
                </span>
                <ul className="m-0 flex flex-1 list-none flex-col gap-2 p-0">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-small text-fg-secondary">
                      <Check className="size-3.5 shrink-0 text-fg-brand" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant={isCurrent ? "subtle" : "outline"} disabled={isCurrent} onClick={noCheckout}>
                  {isCurrent ? "Your plan" : `Switch to ${p.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection id="payment" title="Payment method">
        <EmptyState icon={<CreditCard />} title="No payment method" body="You won't need one during the demo." action={<Button onClick={noCheckout}>Add payment method</Button>} />
      </SettingsSection>

      <SettingsSection id="invoices" title="Billing history">
        <EmptyState icon={<Receipt />} title="No invoices yet" body="You haven't been charged. Invoices will appear here once billing launches." />
      </SettingsSection>
    </div>
  );
}
