"use client";
import { AlertTriangle, ChevronDown, Lock, Sparkles, Calculator } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CRITERION_BY_ID, FILTERS, FILTER_SHORT, PILLAR_BY_ID } from "@/config/criteria";
import { getSource } from "@/config/sources";
import { cn } from "@/lib/utils";
import type { CriterionScore, FilterScore, Idea, Report, RwwPillar } from "@/types";
import { FrameworkTag, FrameworkTags } from "./framework-tag";
import { AnswerPill, ConfidenceText, CriterionDots, Knockout, LowConfidence, NetPill } from "./markers";

export function EvidenceLinks({ ids, idea, max = 3 }: { ids: string[]; idea: Idea; max?: number }) {
  const findings = idea.analysis?.findings ?? [];
  const list = ids.map((id) => findings.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f);
  if (list.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {list.slice(0, max).map((f) => {
        const hidden = idea.findingState[f.id]?.hidden;
        return (
          <Link
            key={f.id}
            href={`/app/ideas/${idea.id}?tab=sources&finding=${f.id}`}
            className={cn("inline-flex max-w-[240px] items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-2 hover:bg-surface-2 hover:text-ink", hidden && "line-through opacity-60")}
            title={f.title}
          >
            <span className="font-medium text-ink">{getSource(f.sourceId).name}</span>
            <span className="truncate">{f.title}</span>
          </Link>
        );
      })}
      {list.length > max ? (
        <Link href={`/app/ideas/${idea.id}?tab=sources`} className="text-[11px] text-muted hover:text-ink">
          +{list.length - max} more
        </Link>
      ) : null}
    </span>
  );
}

function OriginTag({ c }: { c: CriterionScore }) {
  if (c.origin === "computed")
    return (
      <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-2 [&_svg]:size-3">
        <Calculator aria-hidden /> Computed from Path to MRR inputs
      </span>
    );
  if (c.origin === "interview")
    return (
      <span className="inline-flex items-center gap-1 rounded bg-accent-tint px-1.5 py-0.5 text-[11px] text-accent-strong [&_svg]:size-3">
        <Sparkles aria-hidden /> From your interviews
      </span>
    );
  return null;
}

export function CriterionRow({ c, idea }: { c: CriterionScore; idea: Idea }) {
  const def = CRITERION_BY_ID[c.id];
  return (
    <li className="grid gap-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{c.label}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
          <span className="text-muted">Solo SaaS reading: </span>
          {c.soloReading}
        </p>
        {def?.note ? <p className="mt-1 text-xs text-muted">{def.note}</p> : null}
        <p className={cn("mt-2 text-[13px] leading-relaxed", c.score == null ? "text-ink-2" : "text-ink")}>{c.justification || (c.score == null ? "No supporting findings yet. Added to Key assumptions to test." : "")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <OriginTag c={c} />
          <EvidenceLinks ids={c.findingIds} idea={idea} />
          <FrameworkTags ids={c.frameworkIds} />
        </div>
      </div>
      <div className="sm:pt-0.5">
        <CriterionDots score={c.score} />
      </div>
    </li>
  );
}

export function FilterCard({ f, idea, defaultOpen, idPrefix = "" }: { f: FilterScore; idea: Idea; defaultOpen?: boolean; idPrefix?: string }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const meta = FILTERS.find((x) => x.id === f.id)!;
  const anchor = `${idPrefix}filter-${f.id}`;
  const panelId = `${anchor}-criteria`;
  return (
    <article id={anchor} className={cn("scroll-mt-24 rounded-lg border bg-canvas", f.knockout ? "border-weak/40" : "border-line")} aria-labelledby={`${anchor}-title`}>
      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={`${anchor}-title`} className="text-base font-semibold text-ink">
              {meta.label}
            </h3>
            <p className="mt-1 text-xs font-medium text-ink-2">{meta.question}</p>
          </div>
          <div className="flex items-end gap-3 text-right">
            <div>
              <p className="tnum text-[32px] font-semibold leading-none text-ink">
                {f.score ?? "—"}
                <span className="text-sm font-normal text-muted">/100</span>
              </p>
              <p className="mt-1 text-xs text-ink-2">
                Confidence <ConfidenceText c={f.confidence} /> · weight {Math.round(f.weight)}%
              </p>
            </div>
          </div>
        </div>
        {f.knockout || f.lowConfidence ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {f.knockout ? <Knockout /> : null}
            {f.lowConfidence ? <LowConfidence /> : null}
            <span className="text-xs text-ink-2">{f.knockout ? "Below 40: caps the band at Promising." : `${f.unscoredCount} of 5 criteria need evidence: caps the band at Promising.`}</span>
          </div>
        ) : null}
        <p className="mt-3 max-w-[72ch] text-sm leading-relaxed text-ink">{f.rationale}</p>
        <p className="mt-2 flex max-w-[72ch] items-start gap-1.5 text-[13px] leading-relaxed text-ink-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-promising" aria-hidden />
          <span>
            <span className="font-medium text-ink">Biggest risk: </span>
            {f.biggestRisk}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <FrameworkTag id="filters" />
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[13px] font-medium text-ink-2 hover:bg-surface hover:text-ink">
            {open ? "Hide" : "Show"} 5 criteria
            <span className="text-muted">({5 - f.unscoredCount} scored{f.unscoredCount ? `, ${f.unscoredCount} need evidence` : ""})</span>
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>
      {open ? (
        <ul id={panelId} className="divide-y divide-line border-t border-line px-4 md:px-5">
          {f.criteria.map((c) => (
            <CriterionRow key={c.id} c={c} idea={idea} />
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function RwwPanel({ p, idea, capping }: { p: RwwPillar; idea: Idea; capping: boolean }) {
  const def = PILLAR_BY_ID[p.id];
  return (
    <article id={`rww-${p.id}`} className={cn("scroll-mt-24 rounded-lg border bg-canvas", p.net === "no" ? "border-weak/40" : "border-line")} aria-labelledby={`rww-${p.id}-title`}>
      <div className="border-b border-line p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id={`rww-${p.id}-title`} className="text-base font-semibold text-ink">
              {def.label}
            </h3>
            <p className="mt-0.5 text-[13px] text-ink-2">{def.question}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-2">Net answer</span>
            <NetPill net={p.net} />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Measures {def.fit.toLowerCase()} · Draws on {p.drawsOn.map((f) => FILTER_SHORT[f]).join(" + ")}
          {p.id === "win" ? " + your inputs" : p.id === "worthIt" ? " + Path to MRR + your budget and hours" : ""}
        </p>
        {p.cappedReason ? (
          <p className="mt-2 flex items-start gap-1.5 rounded bg-surface px-2 py-1.5 text-xs text-ink-2">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
            {p.cappedReason} (Answers alone gave {p.rawNet === "yes" ? "Yes" : p.rawNet}.)
          </p>
        ) : null}
        {capping ? (
          <p className="mt-2 flex items-start gap-1.5 rounded bg-weak-tint px-2 py-1.5 text-xs font-medium text-weak">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
            This pillar is capping the band at Weak.
          </p>
        ) : null}
      </div>
      <ul className="divide-y divide-line px-4 md:px-5">
        {p.questions.map((q) => (
          <li key={q.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm text-ink">
                {q.text}
                {q.critical ? <span className="ml-1.5 rounded border border-line px-1 py-px align-middle text-[10px] font-medium text-ink-2">Critical</span> : null}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{q.note || (q.answer == null ? "Unanswered; counts as Maybe and is flagged as an assumption to test." : "")}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {q.origin === "computed" ? <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-2"><Calculator className="size-3" aria-hidden /> Computed from Path to MRR</span> : null}
                {q.origin === "interview" ? <span className="inline-flex items-center gap-1 rounded bg-accent-tint px-1.5 py-0.5 text-[11px] text-accent-strong"><Sparkles className="size-3" aria-hidden /> From your interviews</span> : null}
                <EvidenceLinks ids={q.findingIds} idea={idea} max={2} />
              </div>
            </div>
            <div>
              <AnswerPill answer={q.answer} />
            </div>
          </li>
        ))}
      </ul>
      <div className="px-4 pb-4 md:px-5">
        <FrameworkTag id="rww" />
      </div>
    </article>
  );
}

export function RwwChecklist({ report, idea }: { report: Report; idea: Idea }) {
  const capping = new Set(report.score.band !== report.score.uncappedBand ? report.pillars.filter((p) => p.net === "no").map((p) => p.id) : []);
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {report.pillars.map((p) => (
        <RwwPanel key={p.id} p={p} idea={idea} capping={capping.has(p.id)} />
      ))}
    </div>
  );
}
