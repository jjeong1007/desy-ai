"use client";
import { ArrowUpRight, FlaskConical, Plus, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FILTER_IDS, FILTER_SHORT } from "@/config/criteria";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { keyAssumptions, topNextSteps } from "@/lib/insights";
import { cn, money } from "@/lib/utils";
import { createFromAlternative, updateIntake } from "@/services/ideas";
import { useDesy } from "@/store/desy";
import type { Idea, Report } from "@/types";
import { FrameworkTag } from "./framework-tag";
import { AnswerPill, CriterionDots, LowConfidence, NeedsEvidence } from "./markers";
import { EvidenceLinks } from "./sections";

// ------------------------------------------------------------------ Path to MRR

export function PathToMrr({ idea, report }: { idea: Idea; report: Report }) {
  const upsert = useDesy((s) => s.upsertIdea);
  const p = report.pathToMrr;
  const [price, setPrice] = useState(String(idea.intake.price));
  const [goal, setGoal] = useState(String(idea.intake.mrrGoal));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ price: idea.intake.price, goal: idea.intake.mrrGoal, score: report.score.overall, band: report.score.band });
  const latest = useRef(report);
  latest.current = report;

  useEffect(() => {
    setPrice(String(idea.intake.price));
    setGoal(String(idea.intake.mrrGoal));
  }, [idea.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (nextPrice: number, nextGoal: number) => {
    if (!(nextPrice > 0) || !(nextGoal > 0)) return;
    // Optimistic: the whole report recalculates immediately; persistence is debounced.
    upsert({ ...idea, intake: { ...idea.intake, price: nextPrice, mrrGoal: nextGoal } });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const s = start.current;
      const r = latest.current;
      const saved = await updateIntake(idea.id, { price: nextPrice, mrrGoal: nextGoal }, { kind: "pathToMrr", summary: `Path to MRR: $${s.price}/mo → $${nextPrice}/mo, goal $${s.goal.toLocaleString()} → $${nextGoal.toLocaleString()}`, scoreBefore: s.score, scoreAfter: r.score.overall, bandBefore: s.band, bandAfter: r.score.band });
      start.current = { price: nextPrice, goal: nextGoal, score: r.score.overall, band: r.score.band };
      upsert(saved);
    }, 700);
  };

  const sizable = report.filters.find((f) => f.id === "customer")!.criteria.find((c) => c.id === "cust.sizable")!;
  const money_ = report.pillars.find((x) => x.id === "worthIt")!.questions.find((q) => q.id === "worth.money")!;
  const ratio = p.ratio ?? 0;
  const needPct = p.obtainable ? Math.min(100, (p.customersNeeded / p.obtainable) * 100) : 0;
  const priceErr = !(Number(price) > 0);
  const goalErr = !(Number(goal) > 0);

  return (
    <div className="rounded-lg border border-line bg-canvas p-4 md:p-5">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <label htmlFor="ptm-price" className="text-sm font-medium">Monthly price per customer</label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-sm text-muted">$</span>
              <Input id="ptm-price" type="number" inputMode="decimal" min={1} step={1} value={price} aria-invalid={priceErr} aria-describedby={priceErr ? "ptm-price-err" : undefined} onChange={(e) => { setPrice(e.target.value); apply(Number(e.target.value), Number(goal)); }} className="tnum w-28" />
              <input type="range" min={1} max={200} value={Math.min(200, Number(price) || 1)} onChange={(e) => { setPrice(e.target.value); apply(Number(e.target.value), Number(goal)); }} className="flex-1 accent-[rgb(var(--accent))]" aria-label="Price slider" />
            </div>
            {priceErr ? <p id="ptm-price-err" className="mt-1 text-xs text-weak">Enter a price above $0.</p> : null}
          </div>
          <div>
            <label htmlFor="ptm-goal" className="text-sm font-medium">MRR goal</label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-sm text-muted">$</span>
              <Input id="ptm-goal" type="number" inputMode="numeric" min={100} step={500} value={goal} aria-invalid={goalErr} onChange={(e) => { setGoal(e.target.value); apply(Number(price), Number(e.target.value)); }} className="tnum w-28" />
              <span className="text-xs text-muted">/month</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {[3000, 5000, 10000].map((g) => (
                <button key={g} type="button" onClick={() => { setGoal(String(g)); apply(Number(price), g); }} className={cn("rounded border px-2 py-0.5 text-xs", Number(goal) === g ? "border-accent bg-accent-tint text-accent-strong" : "border-line text-ink-2 hover:bg-surface")}>
                  ${g / 1000}k
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted">Changes save automatically and recalculate the whole report.</p>
        </div>
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Customers needed" value={Number.isFinite(p.customersNeeded) ? p.customersNeeded.toLocaleString() : "—"} />
            <Stat label="Obtainable market" value={p.obtainable?.toLocaleString() ?? "—"} />
            <Stat label="Headroom" value={p.ratio != null ? `${ratio.toFixed(1)}×` : "—"} tone={ratio >= 3 ? "good" : ratio >= 1 ? "mid" : "bad"} />
            <Stat label="CAC payback" value={p.cacPaybackMonths != null ? `${p.cacPaybackMonths.toFixed(1)} mo` : "Never"} />
          </div>
          {p.obtainable ? (
            <div className="mt-5">
              <div className="relative h-7 overflow-hidden rounded bg-surface-2" role="img" aria-label={`${p.customersNeeded} customers needed out of ${p.obtainable} obtainable`}>
                <div className={cn("absolute inset-y-0 left-0", ratio >= 1 ? "bg-ink/80" : "bg-weak")} style={{ width: `${needPct}%` }} />
                <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-canvas mix-blend-normal">{needPct > 18 ? `Needed ${p.customersNeeded.toLocaleString()}` : ""}</span>
                <span className="absolute inset-y-0 right-2 flex items-center text-xs text-ink-2">Obtainable {p.obtainable.toLocaleString()}</span>
              </div>
              <p className="mt-2 text-[13px] text-ink-2">
                {money(p.mrrGoal)}/mo at {money(p.price)}/mo needs <strong className="font-semibold text-ink">{p.customersNeeded.toLocaleString()}</strong> paying customers, {ratio >= 1 ? `${Math.round(needPct)}% of the obtainable market` : "more than the obtainable market"}. Gross margin {Math.round(p.marginPct)}% after ~{money(p.variableCost, { cents: true })} running cost.
              </p>
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-line p-3">
              <p className="text-xs text-muted">Feeds Customer → Sizable customer base</p>
              <div className="mt-1.5"><CriterionDots score={sizable.score} /></div>
            </div>
            <div className="rounded border border-line p-3">
              <p className="text-xs text-muted">Feeds Worth It → Will it make money?</p>
              <div className="mt-1.5"><AnswerPill answer={money_.answer} /></div>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            <FrameworkTag id="market-sizing" />
            <FrameworkTag id="channels" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "mid" | "bad" }) {
  return (
    <div>
      <p className="text-xs text-ink-2">{label}</p>
      <p className={cn("tnum mt-0.5 text-xl font-medium tracking-tight", tone === "bad" ? "text-weak" : tone === "mid" ? "text-promising" : "text-ink")}>{value}</p>
    </div>
  );
}

// ------------------------------------------------------------------ Channels

export function ChannelList({ idea }: { idea: Idea }) {
  const channels = [...(idea.analysis?.channels ?? [])].sort((a, b) => b.fit - a.fit);
  if (!channels.length) return <p className="text-sm text-muted">No channels found yet. Add distribution ideas to your intake and re-run.</p>;
  return (
    <div className="rounded-lg border border-line bg-canvas">
      <ol className="divide-y divide-line">
        {channels.map((c, i) => (
          <li key={c.id} className="grid gap-2 p-4 sm:grid-cols-[28px_minmax(0,1fr)_180px] sm:items-start sm:gap-4">
            <span className="tnum text-sm font-medium text-muted">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{c.name}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{c.reason}</p>
              <div className="mt-1.5"><EvidenceLinks ids={c.findingIds} idea={idea} max={2} /></div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 flex-1 rounded-full bg-surface-2"><span className="block h-full rounded-full bg-ink/80" style={{ width: `${c.fit}%` }} /></span>
                <span className="tnum w-12 text-right text-xs font-medium">Fit {c.fit}</span>
              </div>
              <p className="text-right text-xs text-ink-2">Effort: <span className="font-medium capitalize text-ink">{c.effort}</span></p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ------------------------------------------------------------------ Recommendations

export function Recommendations({ idea, report }: { idea: Idea; report: Report }) {
  const router = useRouter();
  const upsert = useDesy((s) => s.upsertIdea);
  const steps = topNextSteps(report);
  const assumptions = keyAssumptions(report);
  const [creating, setCreating] = useState<string | null>(null);
  const current = Object.fromEntries(report.filters.map((f) => [f.id, f.score ?? 0]));

  const createAlt = async (altId: string) => {
    setCreating(altId);
    try {
      const draft = await createFromAlternative(idea.id, altId);
      upsert(draft);
      toast.success("Draft created from this direction", { description: "Review the prefilled intake, then run the analysis." });
      router.push(`/app/ideas/new?draft=${draft.id}`);
    } catch {
      toast.error("Couldn't create the draft. Try again.");
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold">Top 3 next steps</h3>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.id} className="flex flex-col rounded-lg border border-line bg-canvas p-4">
              <span className="tnum text-[13px] font-medium text-accent-strong">Step {i + 1}</span>
              <p className="mt-1 text-sm font-medium leading-snug text-ink">{s.text}</p>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-2">
                <Target className="mt-px size-3 shrink-0" aria-hidden />
                {s.tiedTo}
              </p>
            </li>
          ))}
          {steps.length === 0 ? <li className="text-sm text-muted">No urgent gaps. Pick a channel test and start talking to customers.</li> : null}
        </ol>
      </div>

      <div>
        <h3 className="text-base font-semibold">Alternative directions</h3>
        <p className="mt-0.5 text-[13px] text-ink-2">Adjacent or narrower versions of this idea, with a predicted filter profile. Predictions are directional until you run them.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {(idea.analysis?.alternatives ?? []).map((a) => (
            <article key={a.id} className="flex flex-col rounded-lg border border-line bg-canvas p-4">
              <h4 className="text-sm font-semibold text-ink">{a.name}</h4>
              <p className="mt-1 text-[13px] text-ink-2">{a.oneLiner}</p>
              <p className="mt-3 text-xs font-medium text-strong">Improves: {a.improves}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink">{a.why}</p>
              <table className="mt-3 w-full text-xs">
                <caption className="sr-only">Predicted filter profile compared to the current idea</caption>
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="pb-1 text-left font-normal">Filter</th>
                    <th scope="col" className="pb-1 text-right font-normal">Now</th>
                    <th scope="col" className="pb-1 text-right font-normal">Predicted</th>
                  </tr>
                </thead>
                <tbody>
                  {FILTER_IDS.map((f) => {
                    const d = a.profile[f] - (current[f] as number);
                    return (
                      <tr key={f}>
                        <th scope="row" className="py-0.5 text-left font-normal text-ink-2">{FILTER_SHORT[f]}</th>
                        <td className="tnum py-0.5 text-right text-ink-2">{current[f]}</td>
                        <td className={cn("tnum py-0.5 text-right font-medium", d > 2 ? "text-strong" : d < -2 ? "text-weak" : "text-ink")}>
                          {a.profile[f]} {d > 2 ? "↑" : d < -2 ? "↓" : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-auto pt-4">
                <Button size="sm" onClick={() => createAlt(a.id)} disabled={creating === a.id} className="w-full">
                  <Plus /> {creating === a.id ? "Creating…" : "Create as new idea"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Key assumptions to test</h3>
            <p className="mt-0.5 text-[13px] text-ink-2">Every Needs evidence criterion, Low confidence filter, and Maybe answer. {assumptions.length} in total.</p>
          </div>
          <Button asChild size="sm" variant="primary">
            <Link href={`/app/ideas/${idea.id}?tab=planner`}>
              <FlaskConical /> Plan research
            </Link>
          </Button>
        </div>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-canvas">
          {assumptions.map((a) => (
            <li key={a.id}>
              <Link href={`/app/ideas/${idea.id}?tab=planner`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-surface">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {a.label}
                    {a.kind === "criterion" ? <NeedsEvidence /> : a.kind === "rww" ? <AnswerPill answer="maybe" /> : <LowConfidence />}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-ink-2">{a.why}</span>
                </span>
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted" aria-label="Open in Research Planner" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
