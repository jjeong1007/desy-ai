"use client";
import { AlertTriangle, ArrowRight, ChevronDown, FlaskConical, History, Megaphone, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AGENT_NAME } from "@/config/agents";
import { FILTERS, FILTER_SHORT, PILLARS, PILLAR_BY_ID } from "@/config/criteria";
import { BAND_SHORT } from "@/config/scoring";
import { Button } from "@/components/ui/button";
import { topNextSteps } from "@/lib/insights";
import { cn, fmtDate, money } from "@/lib/utils";
import type { FilterId, Idea, PillarId, Report, RwwAnswer } from "@/types";
import { BandBadge, ConfidenceText, Knockout, LowConfidence, NetPill } from "./markers";
import { FilterChart, ScoreRail, type Recalc } from "./score-header";
import { FilterCard, RwwPanel } from "./sections";

export type IdeaTab = "overview" | "filters" | "rww" | "mrr" | "channels" | "next" | "sources";

export const IDEA_TABS: { id: IdeaTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "filters", label: "Scoring" },
  { id: "rww", label: "Opportunity Assessment" },
  { id: "mrr", label: "Path to MRR" },
  { id: "channels", label: "Channels" },
  { id: "next", label: "Recommendations" },
  { id: "sources", label: "Data sources" },
];

type Go = (tab: IdeaTab, extra?: Record<string, string>) => void;

/** A dashboard tile: a small heading, an optional "view details" jump, and its content. */
function Tile({ title, onOpen, openLabel = "View details", className, children }: { title: string; onOpen?: () => void; openLabel?: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-canvas p-4 md:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-medium text-ink-2">{title}</h2>
        {onOpen ? (
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-ink-2 hover:bg-surface hover:text-ink">
            {openLabel} <ArrowRight className="size-3" aria-hidden />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PartialFailureNote({ idea }: { idea: Idea }) {
  if (!idea.analysis?.partialFailure) return null;
  return (
    <div role="note" className="flex items-start gap-2 rounded-lg border border-lowconf/30 bg-lowconf-tint p-3 text-[13px] text-lowconf">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">{AGENT_NAME[idea.analysis.partialFailure]} returned partial results.</span> Some areas show Needs evidence and confidence is lower. Re-run the analysis or gather the evidence yourself in the Research Planner.
      </p>
    </div>
  );
}

const ANSWER_BAR: Record<RwwAnswer | "none", string> = { yes: "bg-strong", maybe: "bg-promising", no: "bg-weak", none: "bg-surface-2" };

/** One segment per question, colored by its answer. */
function AnswerBar({ answers }: { answers: (RwwAnswer | null)[] }) {
  return (
    <span className="flex h-1.5 w-full gap-0.5" aria-hidden>
      {answers.map((a, i) => (
        <span key={i} className={cn("h-full flex-1 rounded-full", ANSWER_BAR[a ?? "none"])} />
      ))}
    </span>
  );
}

function tally(answers: (RwwAnswer | null)[]) {
  const yes = answers.filter((a) => a === "yes").length;
  return `${yes} of ${answers.length} Yes`;
}

// ------------------------------------------------------------------ Overview

/** Flags a score change (e.g. from Path to MRR edits) so the dashboard can show before → after. */
export function useRecalc(report: Report | null, ideaId: string): Recalc | null {
  const prev = useRef<{ id: string; score: number; band: Report["score"]["band"]; sig: string } | null>(null);
  const [recalc, setRecalc] = useState<Recalc | null>(null);
  useEffect(() => {
    if (!report) return;
    const sig = report.filters.map((f) => f.score).join(",") + report.pillars.map((p) => p.net).join(",") + report.score.overall;
    const p = prev.current;
    if (p && p.id === ideaId && p.sig !== sig) {
      setRecalc({ before: p.score, after: report.score.overall, bandBefore: p.band, bandAfter: report.score.band, key: Date.now() });
      const t = setTimeout(() => setRecalc(null), 5000);
      prev.current = { id: ideaId, score: report.score.overall, band: report.score.band, sig };
      return () => clearTimeout(t);
    }
    prev.current = { id: ideaId, score: report.score.overall, band: report.score.band, sig };
  }, [report, ideaId]);
  return recalc;
}


export function OverviewDashboard({ idea, report, go }: { idea: Idea; report: Report; go: Go }) {
  const recalc = useRecalc(report, idea.id);
  const [histOpen, setHistOpen] = useState(false);
  const s = report.score;
  const p = report.pathToMrr;
  const capped = s.band !== s.uncappedBand;
  const steps = topNextSteps(report);
  const findings = idea.analysis?.findings ?? [];
  const supports = findings.filter((f) => f.sentiment === "supports").length;
  const weakens = findings.filter((f) => f.sentiment === "weakens").length;
  const neutral = findings.length - supports - weakens;
  const weakest = [...report.filters].filter((f) => f.score != null).sort((a, b) => (a.score as number) - (b.score as number))[0];
  const channel = [...(idea.analysis?.channels ?? [])].sort((a, b) => b.fit - a.fit)[0];
  const needPct = p.obtainable ? Math.min(100, (p.customersNeeded / p.obtainable) * 100) : 0;
  const ratio = p.ratio ?? 0;

  return (
    <div className="space-y-4">
      <PartialFailureNote idea={idea} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Tile title="Desy Score">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="tnum text-[48px] font-semibold leading-none text-ink" aria-label={`Desy Score ${s.overall} out of 100`}>
              {s.overall}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pb-1.5">
              <BandBadge band={s.band} score={s} full />
              {s.lowConfidenceFilters.length ? <LowConfidence /> : null}
            </div>
            {recalc ? (
              <span key={recalc.key} role="status" className="mb-1.5 inline-flex animate-flash items-center rounded bg-accent-tint px-2 py-0.5 text-xs font-medium text-accent-strong">
                Recalculated: {recalc.before} → {recalc.after}
              </span>
            ) : null}
          </div>
          <ScoreRail score={s.overall} band={s.band} uncappedBand={s.uncappedBand} />
          <p className="text-sm font-medium leading-relaxed text-ink-2">{s.reason}</p>
          <p className="text-xs text-ink-2">
            Confidence <ConfidenceText c={s.confidence} /> · {report.coverage.sources} sources
          </p>
        </Tile>

        <Tile title="Scoring" onOpen={() => go("filters")}>
          <FilterChart report={report} onSelect={(id) => go("filters", { filter: id })} />
        </Tile>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Tile title="Opportunity Assessment" onOpen={() => go("rww")}>
          <ul className="space-y-1">
            {report.pillars.map((pl) => {
              const answers = pl.questions.map((q) => q.answer);
              return (
                <li key={pl.id}>
                  <button type="button" onClick={() => go("rww", { pillar: pl.id })} className="w-full space-y-1.5 rounded px-1 py-1.5 text-left hover:bg-surface" aria-label={`${PILLAR_BY_ID[pl.id].label}: ${pl.net}, ${tally(answers)}. Open`}>
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-ink">{PILLAR_BY_ID[pl.id].label}</span>
                        <NetPill net={pl.net} size="sm" />
                      </span>
                      <span className="tnum text-ink-2">{tally(answers)}</span>
                    </span>
                    <AnswerBar answers={answers} />
                  </button>
                </li>
              );
            })}
          </ul>
          {capped ? <p className="text-xs text-ink-2">The gate is capping the band. Open it to see why.</p> : null}
        </Tile>

        <Tile title="Path to MRR" onOpen={() => go("mrr")} openLabel="Adjust">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-ink-2">Customers needed</p>
              <p className="tnum text-xl font-medium text-ink">{Number.isFinite(p.customersNeeded) ? p.customersNeeded.toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-ink-2">Headroom</p>
              <p className={cn("tnum text-xl font-medium", ratio >= 3 ? "text-ink" : ratio >= 1 ? "text-promising" : "text-weak")}>{p.ratio != null ? `${ratio.toFixed(1)}×` : "—"}</p>
            </div>
          </div>
          {p.obtainable ? (
            <div className="space-y-1">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${p.customersNeeded} needed of ${p.obtainable} obtainable`}>
                <div className={cn("absolute inset-y-0 left-0 rounded-full", ratio >= 1 ? "bg-ink/80" : "bg-weak")} style={{ width: `${Math.max(2, needPct)}%` }} />
              </div>
              <p className="text-xs text-ink-2">
                {Math.round(needPct)}% of {p.obtainable.toLocaleString()} obtainable customers
              </p>
            </div>
          ) : null}
          <p className="text-xs text-ink-2">
            {money(p.mrrGoal)}/mo at {money(p.price)}/mo · margin {Math.round(p.marginPct)}%
          </p>
        </Tile>

        <Tile title="Evidence" onOpen={() => go("sources")} openLabel="Browse">
          <p className="tnum text-xl font-medium text-ink">
            {findings.length} <span className="text-sm font-normal text-ink-2">findings from {report.coverage.sources} sources</span>
          </p>
          {findings.length ? (
            <div className="space-y-1.5">
              <span className="flex h-2.5 w-full overflow-hidden rounded-full" aria-hidden>
                <span className="h-full bg-strong" style={{ width: `${(supports / findings.length) * 100}%` }} />
                <span className="h-full bg-surface-2" style={{ width: `${(neutral / findings.length) * 100}%` }} />
                <span className="h-full bg-weak" style={{ width: `${(weakens / findings.length) * 100}%` }} />
              </span>
              <p className="flex flex-wrap gap-x-3 text-xs text-ink-2">
                <span>
                  <span className="font-medium text-strong">{supports}</span> support
                </span>
                <span>
                  <span className="font-medium text-weak">{weakens}</span> weaken
                </span>
                {neutral ? <span>{neutral} neutral</span> : null}
              </p>
            </div>
          ) : null}
          {weakest ? (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-ink-2">
              <AlertTriangle className="mt-px size-3 shrink-0 text-promising" aria-hidden />
              <span>
                <span className="font-medium text-ink">Biggest risk ({FILTER_SHORT[weakest.id]}):</span> {weakest.biggestRisk}
              </span>
            </p>
          ) : null}
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Tile title="Top recommendations" onOpen={() => go("next")} openLabel="All recommendations">
          <ol className="grid gap-2 sm:grid-cols-3">
            {steps.map((st, i) => (
              <li key={st.id} className="flex flex-col gap-1.5 rounded border border-line p-3">
                <span className="tnum text-xs font-medium text-accent-strong">Step {i + 1}</span>
                <p className="text-[13px] font-medium leading-snug text-ink">{st.text}</p>
                <p className="mt-auto flex items-start gap-1 text-[11px] text-ink-2">
                  <Target className="mt-px size-3 shrink-0" aria-hidden />
                  {st.tiedTo}
                </p>
              </li>
            ))}
            {steps.length === 0 ? <li className="text-sm text-ink-2">No urgent gaps. Pick a channel test and start talking to customers.</li> : null}
          </ol>
        </Tile>
        <Tile title="Go test it">
          {channel ? (
            <button type="button" onClick={() => go("channels")} className="flex items-start gap-2 rounded border border-line p-3 text-left hover:bg-surface">
              <Megaphone className="mt-0.5 size-4 shrink-0 text-fg-tertiary" aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs text-ink-2">Best-fit channel · Fit {channel.fit}</span>
                <span className="block text-[13px] font-medium text-ink">{channel.name}</span>
              </span>
            </button>
          ) : null}
          <p className="text-[13px] text-ink-2">Turn the open assumptions into interviews. What you learn comes back as evidence and updates the score.</p>
          <Button asChild variant="primary" size="sm" className="mt-auto self-start">
            <Link href={`/app/planner/${idea.id}`}>
              <FlaskConical /> {idea.plan ? "Open research plan" : "Plan research"}
            </Link>
          </Button>
        </Tile>
      </div>

      <section aria-labelledby="hist-h" className="rounded-lg border border-line">
        <h2 id="hist-h">
          <button type="button" onClick={() => setHistOpen((o) => !o)} aria-expanded={histOpen} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium">
            <span className="flex items-center gap-2">
              <History className="size-4 text-fg-tertiary" aria-hidden />
              Idea history <span className="text-fg-tertiary">({idea.history.length})</span>
            </span>
            <ChevronDown className={cn("size-4 transition-transform", histOpen && "rotate-180")} aria-hidden />
          </button>
        </h2>
        {histOpen ? (
          <ol className="divide-y divide-line border-t border-line">
            {idea.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]">
                <span className="text-ink">{h.summary}</span>
                <span className="flex items-center gap-3 text-xs text-fg-tertiary">
                  {h.scoreAfter != null ? (
                    <span className="tnum text-ink-2">
                      {h.scoreBefore != null ? `${h.scoreBefore} → ` : ""}
                      {h.scoreAfter}
                      {h.bandAfter ? ` ${BAND_SHORT[h.bandAfter]}` : ""}
                    </span>
                  ) : null}
                  {fmtDate(h.at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Scoring

/** Five score tiles; picking one shows its rationale, risk and criteria below. */
export function FiltersView({ idea, report, selected, onSelect }: { idea: Idea; report: Report; selected: FilterId; onSelect: (id: FilterId) => void }) {
  const f = report.filters.find((x) => x.id === selected) ?? report.filters[0];
  return (
    <div className="space-y-4">
      <p className="max-w-[72ch] text-[13px] text-ink-2">How attractive the opportunity is. Pick an area to see what we found.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="Filters">
        {report.filters.map((x) => {
          const on = x.id === f.id;
          const meta = FILTERS.find((m) => m.id === x.id)!;
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(x.id)}
              className={cn("flex flex-col gap-2 rounded-lg border bg-canvas p-3 text-left transition-colors", on ? "border-accent ring-1 ring-accent" : x.knockout ? "border-weak/40 hover:bg-surface" : "border-line hover:bg-surface")}
            >
              <span className="text-[13px] font-medium text-ink">{meta.short}</span>
              <span className="tnum text-[28px] font-semibold leading-none text-ink">
                {x.score ?? "—"}
                <span className="text-xs font-normal text-ink-2">/100</span>
              </span>
              <span className="relative h-1.5 w-full rounded-full bg-surface-2">
                <span className={cn("absolute inset-y-0 left-0 rounded-full", x.score == null ? "hatch w-full" : x.knockout ? "bg-weak" : x.lowConfidence ? "bg-lowconf/60" : "bg-ink/80")} style={x.score == null ? undefined : { width: `${x.score}%` }} />
              </span>
              <span className="flex flex-wrap items-center gap-1 text-[11px] text-ink-2">
                {x.knockout ? <Knockout /> : x.lowConfidence ? <LowConfidence /> : (
                  <>
                    Confidence <ConfidenceText c={x.confidence} />
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <FilterCard key={f.id} f={f} idea={idea} defaultOpen />
    </div>
  );
}

// ------------------------------------------------------------------ Opportunity Assessment

export function RwwView({ idea, report, selected, onSelect }: { idea: Idea; report: Report; selected: PillarId; onSelect: (id: PillarId) => void }) {
  const p = report.pillars.find((x) => x.id === selected) ?? report.pillars[0];
  const capping = new Set(report.score.band !== report.score.uncappedBand ? report.pillars.filter((x) => x.net === "no").map((x) => x.id) : []);
  return (
    <div className="space-y-4">
      <p className="max-w-[72ch] text-[13px] text-ink-2">Whether you should pursue it: is it Real, can you Win, and is it Worth It. Pick one to see what we found.</p>
      <dl className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3">
        {PILLARS.map((def) => (
          <div key={def.id} className="space-y-1">
            <dt className="text-[13px] font-semibold text-ink">
              {def.label} <span className="font-normal text-ink-2">· {def.fit}</span>
            </dt>
            <dd className="text-[13px] text-ink-2">{def.definition}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Real / Win / Worth It">
        {report.pillars.map((x) => {
          const on = x.id === p.id;
          const def = PILLAR_BY_ID[x.id];
          const answers = x.questions.map((q) => q.answer);
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(x.id)}
              className={cn("flex flex-col gap-2 rounded-lg border bg-canvas p-4 text-left transition-colors", on ? "border-accent ring-1 ring-accent" : x.net === "no" ? "border-weak/40 hover:bg-surface" : "border-line hover:bg-surface")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold text-ink">{def.label}</span>
                <NetPill net={x.net} />
              </span>
              <span className="text-xs text-ink-2">{def.question}</span>
              <AnswerBar answers={answers} />
              <span className="tnum text-[11px] text-ink-2">{tally(answers)}</span>
            </button>
          );
        })}
      </div>
      <RwwPanel key={p.id} p={p} idea={idea} capping={capping.has(p.id)} />
    </div>
  );
}
