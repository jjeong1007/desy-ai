"use client";
import { AlertTriangle, ChevronDown, Lock, Sparkles, Calculator } from "lucide-react";
import { useState } from "react";
import { FILTERS, PILLAR_BY_ID } from "@/config/criteria";
import { getSource } from "@/config/sources";
import { FindingSheet, findingNumber } from "@/components/sources/finding-sheet";
import { cn } from "@/lib/utils";
import type { CriterionScore, FilterScore, Idea, RwwPillar } from "@/types";
import { ConfidenceText, Knockout, LowConfidence, NetPill } from "./markers";

/** Numbered citations; each opens the finding in a side drawer without leaving the page. */
export function EvidenceLinks({ ids, idea }: { ids: string[]; idea: Idea }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const findings = idea.analysis?.findings ?? [];
  const list = ids.map((id) => findings.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f);
  if (list.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {list
        .map((f) => ({ f, n: findingNumber(idea, f.id) }))
        .sort((x, y) => x.n - y.n)
        .map(({ f, n }) => {
          const hidden = idea.findingState[f.id]?.hidden;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setOpenId(f.id)}
              className={cn("tnum inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-surface px-1 text-[11px] font-semibold text-ink-2 hover:bg-accent-tint hover:text-accent-strong", hidden && "line-through opacity-60")}
              title={`${getSource(f.sourceId).name}: ${f.title}${hidden ? " (hidden from scoring)" : ""}`}
              aria-label={`Evidence ${n}: ${f.title}${hidden ? ", hidden from scoring" : ""}`}
            >
              {n}
            </button>
          );
        })}
      <FindingSheet idea={idea} findingId={openId} onClose={() => setOpenId(null)} />
    </span>
  );
}

/** One evidence-backed point: what was found, where it came from, and the citations. */
function FindingPoint({ text, origin, findingIds, idea }: { text: string; origin?: CriterionScore["origin"]; findingIds: string[]; idea: Idea }) {
  return (
    <li className="py-3">
      <p className="text-[13px] leading-relaxed text-ink">{text}</p>
      {origin === "computed" || origin === "interview" || findingIds.length ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {origin === "computed" ? (
            <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-2 [&_svg]:size-3">
              <Calculator aria-hidden /> From your Path to MRR inputs
            </span>
          ) : null}
          {origin === "interview" ? (
            <span className="inline-flex items-center gap-1 rounded bg-accent-tint px-1.5 py-0.5 text-[11px] text-accent-strong [&_svg]:size-3">
              <Sparkles aria-hidden /> From your interviews
            </span>
          ) : null}
          <EvidenceLinks ids={findingIds} idea={idea} />
        </div>
      ) : null}
    </li>
  );
}

export function FilterCard({ f, idea, defaultOpen, idPrefix = "" }: { f: FilterScore; idea: Idea; defaultOpen?: boolean; idPrefix?: string }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const meta = FILTERS.find((x) => x.id === f.id)!;
  const anchor = `${idPrefix}filter-${f.id}`;
  const panelId = `${anchor}-points`;
  const points = f.criteria.filter((c) => c.score != null && c.justification);
  const gaps = f.criteria.length - points.length;
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
          <div className="text-right">
            <p className="tnum text-[32px] font-semibold leading-none text-ink">
              {f.score ?? "—"}
              <span className="text-sm font-normal text-fg-tertiary">/100</span>
            </p>
            <p className="mt-1 text-xs text-ink-2">
              Confidence <ConfidenceText c={f.confidence} />
            </p>
          </div>
        </div>
        {f.knockout || f.lowConfidence ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {f.knockout ? <Knockout /> : null}
            {f.lowConfidence ? <LowConfidence /> : null}
            <span className="text-xs text-ink-2">{f.knockout ? "This is holding the overall rating back." : "More evidence needed before this can rate highly."}</span>
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
        {points.length ? (
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[13px] font-medium text-ink-2 hover:bg-surface hover:text-ink">
              {open ? "Hide" : "Show"} what we found
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      {open && points.length ? (
        <div id={panelId} className="border-t border-line px-4 pb-3 md:px-5">
          <ul className="divide-y divide-line">
            {points.map((c) => (
              <FindingPoint key={c.id} text={c.justification} origin={c.origin} findingIds={c.findingIds} idea={idea} />
            ))}
          </ul>
          {gaps ? <p className="pt-1 text-xs text-fg-tertiary">Some areas still need evidence. They&apos;re listed in your research plan.</p> : null}
        </div>
      ) : null}
    </article>
  );
}

export function RwwPanel({ p, idea, capping }: { p: RwwPillar; idea: Idea; capping: boolean }) {
  const def = PILLAR_BY_ID[p.id];
  const points = p.questions.filter((q) => q.answer != null && q.note);
  const open = p.questions.length - points.length;
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
            <span className="text-xs text-ink-2">Answer</span>
            <NetPill net={p.net} />
          </div>
        </div>
        {p.cappedReason ? (
          <p className="mt-2 flex items-start gap-1.5 rounded bg-surface px-2 py-1.5 text-xs text-ink-2">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
            {p.cappedReason}
          </p>
        ) : null}
        {capping ? (
          <p className="mt-2 flex items-start gap-1.5 rounded bg-weak-tint px-2 py-1.5 text-xs font-medium text-weak">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
            This is holding the overall rating back.
          </p>
        ) : null}
      </div>
      <div className="px-4 pb-3 md:px-5">
        {points.length ? (
          <ul className="divide-y divide-line">
            {points.map((q) => (
              <FindingPoint key={q.id} text={q.note} origin={q.origin} findingIds={q.findingIds} idea={idea} />
            ))}
          </ul>
        ) : (
          <p className="py-3 text-[13px] text-ink-2">Not enough evidence yet.</p>
        )}
        {open ? <p className="pt-1 text-xs text-fg-tertiary">Some questions are still open. They&apos;re listed in your research plan.</p> : null}
      </div>
    </article>
  );
}
