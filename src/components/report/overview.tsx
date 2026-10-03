"use client";
import { AlertTriangle, ChevronDown, History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AGENT_NAME } from "@/config/agents";
import { BAND_SHORT } from "@/config/scoring";
import { cn, fmtDate } from "@/lib/utils";
import type { Idea, PillarId, Report } from "@/types";
import { FrameworkTag } from "./framework-tag";
import { ChannelList, PathToMrr, Recommendations } from "./planning";
import { ScoreHeader, type Recalc } from "./score-header";
import { FilterCard, RwwChecklist } from "./sections";

function Section({ id, title, description, children, tags }: { id: string; title: string; description?: string; children: React.ReactNode; tags?: string[] }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`${id}-h`} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {description ? <p className="mt-0.5 max-w-[72ch] text-[13px] text-ink-2">{description}</p> : null}
        </div>
        {tags ? (
          <div className="flex gap-1">
            {tags.map((t) => (
              <FrameworkTag key={t} id={t} />
            ))}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

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

export function Overview({ idea, report }: { idea: Idea; report: Report }) {
  const recalc = useRecalc(report, idea.id);
  const [histOpen, setHistOpen] = useState(false);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="space-y-10">
      {idea.analysis?.partialFailure ? (
        <div role="note" className="flex items-start gap-2 rounded-lg border border-lowconf/30 bg-lowconf-tint p-3 text-[13px] text-lowconf">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">{AGENT_NAME[idea.analysis.partialFailure]} returned partial results.</span> The criteria it would have covered show Needs evidence, confidence is lower, and a Low confidence filter caps the band. Re-run the analysis or gather the evidence yourself in the Research Planner.
          </p>
        </div>
      ) : null}
      <ScoreHeader report={report} recalc={recalc} onPillar={(id: PillarId) => scrollTo(`rww-${id}`)} onFilter={(id) => scrollTo(`filter-${id}`)} />

      <Section id="filters" title="Five filters" description="How attractive the opportunity is, largely independent of who pursues it. Open a card to see its five criteria and the evidence behind each." tags={["filters"]}>
        <div className="grid gap-4 xl:grid-cols-2">
          {report.filters.map((f) => (
            <FilterCard key={f.id} f={f} idea={idea} defaultOpen={f.knockout || f.lowConfidence} />
          ))}
        </div>
      </Section>

      <Section id="rww" title="Real / Win / Worth It" description="Whether you should pursue it. This gate never changes the score, but a No caps the band at Weak." tags={["rww"]}>
        <RwwChecklist report={report} idea={idea} />
      </Section>

      <Section id="path" title="Path to MRR" description="How many paying customers you need at your price, compared with the obtainable market. Adjust price or goal to see the report recalculate." tags={["market-sizing"]}>
        <PathToMrr idea={idea} report={report} />
      </Section>

      <Section id="channels" title="Distribution channels" description="Ranked by fit. This is the evidence behind the Channel filter." tags={["channels"]}>
        <ChannelList idea={idea} />
      </Section>

      <Section id="recs" title="Recommendations" tags={["opportunity-assessment"]}>
        <Recommendations idea={idea} report={report} />
      </Section>

      <section aria-labelledby="hist-h" className="rounded-lg border border-line">
        <h2 id="hist-h">
          <button type="button" onClick={() => setHistOpen((o) => !o)} aria-expanded={histOpen} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium">
            <span className="flex items-center gap-2">
              <History className="size-4 text-muted" aria-hidden />
              Idea history <span className="text-muted">({idea.history.length})</span>
            </span>
            <ChevronDown className={cn("size-4 transition-transform", histOpen && "rotate-180")} aria-hidden />
          </button>
        </h2>
        {histOpen ? (
          <ol className="divide-y divide-line border-t border-line">
            {idea.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]">
                <span className="text-ink">{h.summary}</span>
                <span className="flex items-center gap-3 text-xs text-muted">
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
