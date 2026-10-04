"use client";
import { Lock, RefreshCw } from "lucide-react";
import { FILTER_SHORT, PILLAR_BY_ID } from "@/config/criteria";
import { BAND_LABEL, BAND_SHORT, SCORING_CONFIG as C } from "@/config/scoring";
import { cn } from "@/lib/utils";
import type { PillarId, Report } from "@/types";
import { BAND_STYLE, BandBadge, ConfidenceText, Knockout, LowConfidence, NetPill } from "./markers";

/** 0-100 rail with the three band segments and the Desy diamond as the marker. */
export function ScoreRail({ score, band, uncappedBand, compact }: { score: number; band: Report["score"]["band"]; uncappedBand: Report["score"]["band"]; compact?: boolean }) {
  const segs = [
    { id: "weak" as const, from: 0, to: C.bands.promisingMin },
    { id: "promising" as const, from: C.bands.promisingMin, to: C.bands.strongMin },
    { id: "strong" as const, from: C.bands.strongMin, to: 100 },
  ];
  const capped = band !== uncappedBand;
  return (
    <div className="w-full" aria-hidden>
      <div className={cn("relative flex w-full gap-[3px]", compact ? "h-2" : "h-3")}>
        {segs.map((s) => (
          <div
            key={s.id}
            style={{ width: `${s.to - s.from}%` }}
            className={cn(
              "relative h-full first:rounded-l-full last:rounded-r-full",
              s.id === band ? BAND_STYLE[s.id].bar : s.id === uncappedBand && capped ? "hatch bg-surface-2" : "bg-surface-2",
            )}
          />
        ))}
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${Math.max(1.5, Math.min(98.5, score))}%` }}>
          <div className={cn("rotate-45 rounded-[2px] border-2 border-canvas bg-ink", compact ? "size-3" : "size-4")} />
        </div>
      </div>
      {!compact ? (
        <div className="mt-1.5 flex w-full text-[11px] text-fg-tertiary">
          {segs.map((s) => (
            <span key={s.id} style={{ width: `${s.to - s.from}%` }} className={cn("flex items-center gap-1", s.id === band && "font-medium text-ink")}>
              {s.id === band && capped ? <Lock className="size-3" /> : null}
              {BAND_SHORT[s.id]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RwwStrip({ report, onSelect, size = "md" }: { report: Report; onSelect?: (id: PillarId) => void; size?: "sm" | "md" }) {
  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Real / Win / Worth It">
      {report.pillars.map((p) => {
        const inner = (
          <>
            <span className={cn("font-medium text-ink", size === "sm" ? "text-xs" : "text-[13px]")}>{PILLAR_BY_ID[p.id].label}</span>
            <NetPill net={p.net} size="sm" />
          </>
        );
        return onSelect ? (
          <button key={p.id} role="listitem" type="button" onClick={() => onSelect(p.id)} className={cn("flex items-center gap-2 rounded border border-line bg-canvas hover:border-line-strong hover:bg-surface", size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5", p.net === "no" && "border-weak/40")} aria-label={`${PILLAR_BY_ID[p.id].label}: ${p.net}. Jump to checklist`}>
            {inner}
          </button>
        ) : (
          <span key={p.id} role="listitem" className={cn("flex items-center gap-2 rounded border border-line bg-canvas", size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5")}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

export function FilterChart({ report, onSelect, compact }: { report: Report; onSelect?: (id: string) => void; compact?: boolean }) {
  return (
    <div>
      <ul className={cn("space-y-2.5", compact && "space-y-2")} aria-label="Five filter scores">
        {report.filters.map((f) => {
          const pct = f.score ?? 0;
          const row = (
            <>
              <span className={cn("shrink-0 text-left text-[13px] font-medium text-ink", compact ? "w-[84px]" : "w-[92px]")}>{FILTER_SHORT[f.id]}</span>
              <span className="relative h-2 flex-1 rounded-full bg-surface-2">
                <span className={cn("absolute inset-y-0 left-0 rounded-full", f.score == null ? "hatch" : f.knockout ? "bg-weak" : f.lowConfidence ? "bg-lowconf/60" : "bg-ink/80")} style={{ width: `${f.score == null ? 100 : pct}%` }} />
              </span>
              <span className="tnum w-7 shrink-0 text-right text-[13px] font-semibold text-ink">{f.score ?? "—"}</span>
              {!compact ? (
                <span className="flex w-[118px] shrink-0 justify-end gap-1">
                  {f.knockout ? <Knockout /> : null}
                  {f.lowConfidence ? <LowConfidence /> : null}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={f.id}>
              {onSelect ? (
                <button type="button" onClick={() => onSelect(f.id)} className="flex w-full items-center gap-3 rounded py-0.5 hover:bg-surface" aria-label={`${FILTER_SHORT[f.id]} filter ${f.score ?? "not scored"}${f.knockout ? ", knockout" : ""}${f.lowConfidence ? ", low confidence" : ""}. Jump to card`}>
                  {row}
                </button>
              ) : (
                <div className="flex items-center gap-3">{row}</div>
              )}
              {compact && (f.knockout || f.lowConfidence) ? (
                <div className="ml-[96px] mt-1 flex gap-1">
                  {f.knockout ? <Knockout /> : null}
                  {f.lowConfidence ? <LowConfidence /> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface Recalc {
  before: number;
  after: number;
  bandBefore: Report["score"]["band"];
  bandAfter: Report["score"]["band"];
  key: number;
}

export function ScoreHeader({ report, onPillar, onFilter, recalc, compact, headingId = "score-heading" }: { report: Report; onPillar?: (id: PillarId) => void; onFilter?: (id: string) => void; recalc?: Recalc | null; compact?: boolean; headingId?: string }) {
  const s = report.score;
  const capped = s.band !== s.uncappedBand;
  const lowConf = s.lowConfidenceFilters.length > 0;
  return (
    <section aria-labelledby={headingId} className={cn("rounded-lg border border-line bg-canvas", compact ? "p-4" : "p-5 md:p-6")}>
      <div className={cn("grid gap-6", !compact && "lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-10")}>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 id={headingId} className="text-[13px] font-medium text-ink-2">
              Desy Score
            </h2>
            {recalc ? (
              <span key={recalc.key} role="status" className="inline-flex animate-flash items-center gap-1 rounded bg-accent-tint px-2 py-0.5 text-xs font-medium text-accent-strong">
                <RefreshCw className="size-3" aria-hidden />
                Recalculated: {recalc.before} → {recalc.after}
                {recalc.bandBefore !== recalc.bandAfter ? `, ${BAND_SHORT[recalc.bandBefore]} → ${BAND_SHORT[recalc.bandAfter]}` : ""}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-end gap-x-5 gap-y-2">
            <p className={cn("tnum font-semibold leading-none text-ink", compact ? "text-[40px]" : "text-[48px]")} aria-label={`Desy Score ${s.overall} out of 100`}>
              {s.overall}
            </p>
            <div className="pb-2">
              <p className="sr-only">Pursuit band: {BAND_LABEL[s.band]}{capped ? " (capped)" : ""}</p>
              <div className="flex flex-wrap items-center gap-1.5" aria-hidden>
                <BandBadge band={s.band} full />
                {capped ? <span className="inline-flex items-center gap-1 rounded border border-dashed border-capped/60 px-2 py-[3px] text-[13px] font-medium text-capped"><Lock className="size-3.5" />Capped</span> : null}
                {lowConf ? <LowConfidence /> : null}
              </div>
              {capped ? <p className="mt-1.5 text-xs text-ink-2">Score alone: {BAND_LABEL[s.uncappedBand]}</p> : null}
            </div>
          </div>
          <div className={cn("mt-5", compact ? "max-w-full" : "max-w-xl")}>
            <ScoreRail score={s.overall} band={s.band} uncappedBand={s.uncappedBand} compact={compact} />
          </div>
          <p className="mt-5 max-w-[68ch] text-sm font-medium leading-relaxed text-ink-2">{s.reason}</p>
          {capped && s.capReasons.length ? (
            <ul className="mt-3 space-y-1.5" aria-label="Cap reasons">
              {s.capReasons.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[13px] text-ink-2">
                  <Lock className="mt-0.5 size-3.5 shrink-0 text-capped" aria-hidden />
                  <span>
                    {r}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {!compact ? (
            <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
              <div className="flex gap-1.5">
                <dt className="text-ink-2">Confidence</dt>
                <dd>
                  <ConfidenceText c={s.confidence} />
                  <span className="text-fg-tertiary"> ({report.coverage.sources} sources)</span>
                </dd>
              </div>
            </dl>
          ) : null}
          <div className="mt-5">
            <p className="mb-2 text-[13px] font-medium text-ink-2">Opportunity Assessment</p>
            <RwwStrip report={report} onSelect={onPillar} />
          </div>
        </div>
        <div className={cn("min-w-0", !compact && "lg:border-l lg:border-line lg:pl-10")}>
          <p className="mb-3 text-[13px] font-medium text-ink-2">Scoring</p>
          <FilterChart report={report} onSelect={onFilter} compact={compact} />
        </div>
      </div>
    </section>
  );
}
