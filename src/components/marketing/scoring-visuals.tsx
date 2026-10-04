"use client";

import { ArrowRight, ChevronRight, FlaskConical, MessagesSquare, RefreshCw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { BUILD } from "@/components/app/intake-form";
import { useInView } from "@/components/marketing/layout";
import { clamp01, DemoBar, ease, useDemoClock } from "@/components/marketing/workflow-demos";
import { BandBadge, CriterionDots, NetPill, SentimentTag } from "@/components/report/markers";
import { SourceLabel } from "@/components/sources/data-sources";
import { Avatar } from "@/components/ui/avatar";
import { Highlight } from "@/components/ui/research";
import { CRITERION_BY_ID, FILTER_SHORT, PILLAR_BY_ID, RWW_BY_ID } from "@/config/criteria";
import { getSource } from "@/config/sources";
import { topNextSteps } from "@/lib/insights";
import { SAMPLE_IDEA, SAMPLE_REPORT } from "@/lib/sample";
import { cn, money } from "@/lib/utils";
import { generatePlan, previewSynthesis, runSynthesis } from "@/services/planner";
import { SCORING_CONFIG } from "@/config/scoring";
import type { AssumptionStatus, Finding, InterviewNote } from "@/types";

const intake = SAMPLE_IDEA.intake;
const findings = SAMPLE_IDEA.analysis?.findings ?? [];
const findingById = (id: string) => findings.find((f) => f.id === id);

/** Sources the marketing site already names; everything else is counted, not shown. */
const PUBLIC_LOGO = new Set(["reddit", "hackernews", "producthunt", "g2", "github", "linkedin"]);

/** Square dune backdrop that grows taller when its content needs the room. */
function DuneStage({ children, label, src }: { children: ReactNode; label: string; src: string }) {
  return (
    <figure aria-label={label} className="relative m-0 flex aspect-square w-full flex-col justify-center p-4 sm:p-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="pointer-events-none absolute inset-0 size-full max-w-none rounded-xl object-cover" />
      <div className="relative flex flex-col gap-3">{children}</div>
    </figure>
  );
}

/** Loops a `total`-ms animation while the visual is on screen, holding the end state for `hold` ms. */
function useFeatureClock(total: number, hold: number) {
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const t = useDemoClock(inView, total, hold);
  return { ref, t };
}

/** Fades content in once the clock passes `at`; keeps its space so nothing shifts. */
function Appear({ t, at, className, children }: { t: number; at: number; className?: string; children: ReactNode }) {
  const on = t >= at;
  return <div className={cn("transition-all duration-500 ease-out", on ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0", className)}>{children}</div>;
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-small font-medium text-accent-strong", className)}>{children}</span>;
}

function Logos({ ids }: { ids: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {ids.map((id) => {
        const s = getSource(id);
        // eslint-disable-next-line @next/next/no-img-element
        return <img key={id} src={s.logo} alt={s.name} title={s.name} className={cn("size-3.5 object-contain", s.logoMono && "dark:invert")} />;
      })}
    </span>
  );
}

// ------------------------------------------------------------------ 1. Benchmark

const ROW_FROM = 1100;
const ROW_GAP = 420;
const ROW_FILL = 900;
const SCORE_FROM = ROW_FROM + 4 * ROW_GAP + ROW_FILL;
const SCORE_MS = 1000;
const BENCH_TOTAL = SCORE_FROM + SCORE_MS + 1000;

const BENCH_ROWS = SAMPLE_REPORT.filters.map((f) => {
  const ids = [...new Set(f.criteria.flatMap((c) => c.findingIds))];
  const sources = [...new Set(ids.map((id) => findingById(id)?.sourceId).filter((s): s is string => !!s))];
  return { id: f.id, score: f.score ?? 0, findings: ids.length, logos: sources.filter((s) => PUBLIC_LOGO.has(s)).slice(0, 3) };
});

const GOALS = [`${money(intake.price)}/mo`, `${money(intake.mrrGoal)} MRR goal`, `${intake.timelineMonths} months`, BUILD.find((b) => b.id === intake.buildPath)?.label ?? ""].filter(Boolean);

/** The idea and its goals, benchmarked area by area into a Desy Score. */
export function IdeaScoreVisual() {
  const { ref, t } = useFeatureClock(BENCH_TOTAL, 3200);
  const s = SAMPLE_REPORT.score;
  const scoreP = ease(clamp01((t - SCORE_FROM) / SCORE_MS));

  return (
    <DuneStage label={`"${intake.name}" benchmarked across five areas into a Desy Score of ${s.overall}`} src="/marketing/feature-dunes.png">
      <div ref={ref} className="glass-panel flex flex-col gap-3 rounded-lg p-3 sm:p-4">
        <div className="glass-card flex flex-col gap-2 rounded-lg p-4">
          <Eyebrow>Your idea</Eyebrow>
          <span className="text-title font-semibold text-fg">{intake.name}</span>
          <span className="line-clamp-2 text-small text-fg-secondary">{intake.oneLiner}</span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {GOALS.map((g, i) => (
              <Appear key={g} t={t} at={250 + i * 160}>
                <span className="inline-flex rounded-full border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-fg-secondary">{g}</span>
              </Appear>
            ))}
          </div>
        </div>

        <div className="glass-card flex flex-col gap-3 rounded-lg p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-title font-semibold text-fg">Scoring</span>
            <span className="tnum text-xs text-fg-secondary">
              {findings.length} findings · {SAMPLE_REPORT.coverage.sources} sources
            </span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {BENCH_ROWS.map((r, i) => {
              const start = ROW_FROM + i * ROW_GAP;
              const p = ease(clamp01((t - start) / ROW_FILL));
              return (
                <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_2rem] items-center gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-small font-medium text-fg">{FILTER_SHORT[r.id]}</span>
                    <span className={cn("hidden transition-opacity duration-300 sm:inline-flex", t >= start ? "opacity-100" : "opacity-0")}>
                      <Logos ids={r.logos} />
                    </span>
                  </span>
                  <DemoBar value={r.score * p} />
                  <span className="tnum text-right text-small font-semibold text-fg">{t >= start ? Math.round(r.score * p) : "—"}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
            <div className="flex items-end gap-3">
              <span className="flex flex-col">
                <span className="text-xs text-fg-secondary">Desy Score</span>
                <span className="tnum text-[40px] font-semibold leading-none text-fg">{t >= SCORE_FROM ? Math.round(s.overall * scoreP) : "—"}</span>
              </span>
              <Appear t={t} at={SCORE_FROM + SCORE_MS} className="pb-1">
                <BandBadge band={s.band} score={s} full />
              </Appear>
            </div>
            <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 pb-1">
              {SAMPLE_REPORT.pillars.map((pl, i) => (
                <li key={pl.id}>
                  <Appear t={t} at={SCORE_FROM + SCORE_MS + 200 + i * 150} className="flex items-center gap-1.5 text-xs font-medium text-fg-secondary">
                    {PILLAR_BY_ID[pl.id].label}
                    <NetPill net={pl.net} size="sm" />
                  </Appear>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DuneStage>
  );
}

// ------------------------------------------------------------------ 2. Trace

const TRACE_FILTER = SAMPLE_REPORT.filters.find((f) => f.id === "competition")!;
const TRACE_CRITERION = TRACE_FILTER.criteria.find((c) => c.id === "comp.substitutes")!;
const TRACE_FINDINGS = TRACE_CRITERION.findingIds.map(findingById).filter((f): f is Finding => !!f);
const TRACE_STEP = topNextSteps(SAMPLE_REPORT).find((s) => s.refId === TRACE_CRITERION.id);
const FOCUS_AT = 1200;
const FINDING_FROM = 2000;
const FINDING_MS = 2000;
const REC_AT = FINDING_FROM + TRACE_FINDINGS.length * FINDING_MS;
const TRACE_TOTAL = REC_AT + 900;

function Chip({ n, on }: { n: number; on: boolean }) {
  return <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-caption font-semibold transition-colors", on ? "bg-brand text-on-brand" : "bg-subtle text-fg-secondary")}>{n}</span>;
}

/** A weak criterion opened up: the findings it cites, then the recommendation it produces. */
export function CitedFindingVisual() {
  const { ref, t } = useFeatureClock(TRACE_TOTAL, 3200);
  const focused = t >= FOCUS_AT;
  const current = t < FINDING_FROM ? -1 : Math.min(TRACE_FINDINGS.length - 1, Math.floor((t - FINDING_FROM) / FINDING_MS));

  return (
    <DuneStage label="A weak score traced to the findings it cites and the recommendation it produces" src="/marketing/finding-dunes.png">
      <div ref={ref} className="glass-panel flex flex-col gap-3 rounded-lg p-3 sm:p-4">
        <div className="glass-card flex flex-col gap-3 rounded-lg p-4">
          <p className="m-0 flex flex-wrap items-center gap-1 text-small font-medium text-fg-secondary [&_svg]:size-3">
            Desy Score {SAMPLE_REPORT.score.overall}
            <ChevronRight aria-hidden />
            <span className="text-fg">
              {FILTER_SHORT[TRACE_FILTER.id]} {TRACE_FILTER.score}
            </span>
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {TRACE_FILTER.criteria.map((c, i) => {
              const focus = focused && c.id === TRACE_CRITERION.id;
              return (
                <li key={c.id}>
                  <Appear t={t} at={150 + i * 120}>
                    <div className={cn("flex flex-col rounded-md border px-3 py-1.5 transition-colors duration-300", focus ? "border-brand bg-canvas" : "border-transparent")}>
                      <span className="flex items-center justify-between gap-3">
                        <span className={cn("truncate text-small font-medium", focus ? "text-fg" : "text-fg-secondary")}>{c.label}</span>
                        <CriterionDots score={c.score} />
                      </span>
                      <div className={cn("grid transition-[grid-template-rows] duration-500 ease-out", focus ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                        <p className="m-0 overflow-hidden text-small text-fg">
                          <span className="block h-2" aria-hidden />
                          {c.justification}{" "}
                          <span className="inline-flex gap-1 align-middle">
                            {TRACE_FINDINGS.map((f, k) => (
                              <Chip key={f.id} n={k + 1} on={k === current} />
                            ))}
                          </span>
                        </p>
                      </div>
                    </div>
                  </Appear>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-1 [&>*]:col-start-1 [&>*]:row-start-1">
          {TRACE_FINDINGS.map((f, k) => {
            const on = k === current;
            const highlighted = t >= FINDING_FROM + k * FINDING_MS + 500;
            return (
              <div key={f.id} className={cn("glass-card flex flex-col gap-2 rounded-lg p-4 transition-opacity duration-500", on ? "opacity-100" : "opacity-0")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Chip n={k + 1} on />
                    <SourceLabel sourceId={f.sourceId} className="truncate" />
                  </span>
                  <SentimentTag s={f.sentiment} />
                </span>
                <span className="text-small font-semibold text-fg">{f.title}</span>
                <p className="m-0 line-clamp-3 text-small text-fg-secondary">{highlighted ? <Highlight>&ldquo;{f.excerpt}&rdquo;</Highlight> : <>&ldquo;{f.excerpt}&rdquo;</>}</p>
              </div>
            );
          })}
        </div>

        <Appear t={t} at={REC_AT}>
          <div className="glass-card flex flex-col gap-2 rounded-lg p-4">
            <span className="inline-flex items-center gap-1 text-small font-medium text-accent-strong [&_svg]:size-3.5">
              <ArrowRight aria-hidden /> Recommendation
            </span>
            <span className="text-title font-semibold text-fg">{TRACE_STEP?.text ?? CRITERION_BY_ID[TRACE_CRITERION.id].nextStep}</span>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-fg-secondary">{TRACE_STEP?.tiedTo ?? `Weak spot in ${FILTER_SHORT[TRACE_FILTER.id]}`}</span>
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-2.5 py-1 text-xs font-medium text-on-brand [&_svg]:size-3.5">
                <FlaskConical /> Add to research plan
              </span>
            </span>
          </div>
        </Appear>
      </div>
    </DuneStage>
  );
}

// ------------------------------------------------------------------ 3. Research Planner loop

/** Real plan + synthesis on the sample idea, so the before → after score is what the app would compute. */
const NOTES: InterviewNote[] = [
  { id: "n1", interviewee: "Maya, brand designer", personaId: "p1", date: "2026-10-01", text: "Every Monday I chase two or three invoices. I hate the built-in reminders, they're too generic. I'd pay $15 a month if it sounded like me." },
  { id: "n2", interviewee: "Leo, UI contractor", personaId: "p2", date: "2026-10-02", text: "Late payments happen every month with net-60 clients. I already pay for invoicing tools. A friend in my Slack group would recommend it." },
];
const PLAN = { ...generatePlan(SAMPLE_IDEA, SAMPLE_REPORT, "discovery"), notes: NOTES };
const SYNTH = runSynthesis(PLAN, SAMPLE_REPORT);
const PREVIEW = previewSynthesis({ ...SAMPLE_IDEA, plan: PLAN }, SYNTH, { weights: SCORING_CONFIG.defaultWeights });
const SCORE_BEFORE = PREVIEW?.before.score.overall ?? SAMPLE_REPORT.score.overall;
const SCORE_AFTER = PREVIEW?.after.score.overall ?? SCORE_BEFORE;

const PLAN_REFS = ["cust.frequent", "real.willBuy", "win.advantage"];
const QUESTIONS = PLAN_REFS.map((id) => PLAN.script.flatMap((s) => s.items).find((q) => q.tests === id)).filter((q): q is NonNullable<typeof q> => !!q);
const ASSUMPTIONS = PLAN_REFS.map((id) => SYNTH.assumptions.find((a) => a.refId === id)).filter((a): a is NonNullable<typeof a> => !!a);
const areaLabel = (id: string) => (RWW_BY_ID[id] ? PILLAR_BY_ID[RWW_BY_ID[id].pillar].label : FILTER_SHORT[CRITERION_BY_ID[id]?.filter ?? "customer"]);

const STATUS: Record<AssumptionStatus, { label: string; cls: string }> = {
  validated: { label: "Validated", cls: "bg-strong-tint text-strong" },
  invalidated: { label: "Invalidated", cls: "bg-weak-tint text-weak" },
  unclear: { label: "Still unclear", cls: "bg-surface text-fg-secondary" },
};

const PHASES = [
  { id: "plan", label: "Plan", icon: <Sparkles />, at: 0 },
  { id: "interview", label: "Interview", icon: <MessagesSquare />, at: 2800 },
  { id: "rescore", label: "Re-score", icon: <RefreshCw />, at: 5600 },
] as const;
const NOTE_TYPE_MS = 1900;
const APPLY_AT = PHASES[2].at + 1700;
const PLAN_TOTAL = APPLY_AT + 1600;

/** The Research Planner loop: generate a script, log an interview, apply the synthesis to the score. */
export function ActionPlanVisual() {
  const { ref, t } = useFeatureClock(PLAN_TOTAL, 2800);
  const phase = t >= PHASES[2].at ? 2 : t >= PHASES[1].at ? 1 : 0;
  const note = NOTES[0];
  const noteStart = PHASES[1].at + 300;
  const typed = note.text.slice(0, Math.round(note.text.length * clamp01((t - noteStart) / NOTE_TYPE_MS)));
  const synthesizing = t >= noteStart + NOTE_TYPE_MS + 200;
  const applyP = ease(clamp01((t - APPLY_AT) / 900));
  const shownScore = Math.round(SCORE_BEFORE + (SCORE_AFTER - SCORE_BEFORE) * applyP);
  const phaseEnd = (i: number) => (i < PHASES.length - 1 ? PHASES[i + 1].at : PLAN_TOTAL);

  return (
    <DuneStage label={`The Research Planner: an interview script, a logged interview, and a score update from ${SCORE_BEFORE} to ${SCORE_AFTER}`} src="/marketing/feature-dunes.png">
      <div ref={ref} className="glass-panel flex flex-col gap-3 rounded-lg p-3 sm:p-4">
        <div className="glass-card flex flex-col gap-3 rounded-lg p-4">
          <div className="flex flex-col gap-0.5">
            <Eyebrow>Research Planner</Eyebrow>
            <span className="truncate text-title font-semibold text-fg">{intake.name}</span>
          </div>
          <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0">
            {PHASES.map((p, i) => {
              const fill = clamp01((t - p.at) / (phaseEnd(i) - p.at)) * 100;
              return (
                <li key={p.id} className="flex flex-col gap-1.5">
                  <DemoBar value={fill} className="h-0.5 bg-line" />
                  <span className={cn("flex items-center gap-1.5 text-small font-medium transition-colors [&_svg]:size-3.5", i === phase ? "text-fg-brand" : i < phase ? "text-fg" : "text-fg-tertiary")}>
                    {p.icon}
                    {p.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid grid-cols-1 [&>*]:col-start-1 [&>*]:row-start-1">
          {/* Plan: questions generated from the riskiest assumptions */}
          <div className={cn("glass-card flex flex-col gap-3 rounded-lg p-4 transition-opacity duration-500", phase === 0 ? "opacity-100" : "pointer-events-none opacity-0")}>
            <span className="flex items-center justify-between gap-2">
              <span className="text-small font-semibold text-fg">Interview script</span>
              <span className="truncate text-xs text-fg-secondary">Talking to {PLAN.personas[0]?.name ?? "your customer"}</span>
            </span>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {QUESTIONS.map((q, i) => (
                <li key={q.id}>
                  <Appear t={t} at={300 + i * 550} className="flex gap-3 rounded-md border border-line bg-canvas p-3">
                    <span className="w-5 shrink-0 text-small font-semibold text-fg-brand">Q{i + 1}</span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-small font-medium text-fg">&ldquo;{q.text}&rdquo;</span>
                      <span className="self-start rounded bg-surface px-1.5 py-0.5 text-[11px] text-fg-secondary">Tests {areaLabel(q.tests)}</span>
                    </span>
                  </Appear>
                </li>
              ))}
            </ol>
          </div>

          {/* Interview: notes logged after a call */}
          <div className={cn("glass-card flex flex-col gap-3 rounded-lg p-4 transition-opacity duration-500", phase === 1 ? "opacity-100" : "pointer-events-none opacity-0")}>
            <span className="flex items-center justify-between gap-2">
              <span className="text-small font-semibold text-fg">Interview notes</span>
              <span className="tnum text-xs text-fg-secondary">{NOTES.length} interviews logged</span>
            </span>
            <div className="flex flex-col gap-2 rounded-md border border-line bg-canvas p-3">
              <span className="flex items-center gap-2">
                <Avatar name={note.interviewee} />
                <span className="text-small font-medium text-fg">{note.interviewee}</span>
              </span>
              <p className="m-0 min-h-[4.5em] text-small text-fg">
                {typed}
                {!synthesizing ? <span className="ml-px inline-block h-[1.1em] w-px translate-y-[3px] animate-pulse bg-fg" /> : null}
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-md border border-line bg-canvas/60 p-3 opacity-70">
              <span className="flex items-center gap-2">
                <Avatar name={NOTES[1].interviewee} />
                <span className="text-small font-medium text-fg">{NOTES[1].interviewee}</span>
              </span>
              <p className="m-0 line-clamp-1 text-small text-fg-secondary">{NOTES[1].text}</p>
            </div>
            <span className={cn("inline-flex items-center gap-1.5 self-end rounded-sm px-3 py-1.5 text-small font-medium transition-all duration-300 [&_svg]:size-3.5", synthesizing ? "bg-brand text-on-brand shadow-card" : "bg-subtle text-fg-tertiary")}>
              <Sparkles /> Synthesize notes
            </span>
          </div>

          {/* Re-score: assumptions resolved, score recalculated */}
          <div className={cn("glass-card flex flex-col gap-3 rounded-lg p-4 transition-opacity duration-500", phase === 2 ? "opacity-100" : "pointer-events-none opacity-0")}>
            <span className="text-small font-semibold text-fg">What the interviews showed</span>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {ASSUMPTIONS.map((a, i) => (
                <li key={a.id}>
                  <Appear t={t} at={PHASES[2].at + 250 + i * 400} className="flex items-center justify-between gap-3 rounded-md border border-line bg-canvas px-3 py-2">
                    <span className="truncate text-small font-medium text-fg">{a.label}</span>
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-xs font-medium", STATUS[a.status].cls)}>{STATUS[a.status].label}</span>
                  </Appear>
                </li>
              ))}
            </ul>
            <Appear t={t} at={APPLY_AT - 200} className="flex items-end justify-between gap-3 border-t border-line pt-3">
              <span className="flex flex-col">
                <span className="text-xs text-fg-secondary">Desy Score</span>
                <span className="tnum text-[40px] font-semibold leading-none text-fg">{shownScore}</span>
              </span>
              <span className={cn("mb-1 inline-flex items-center rounded bg-accent-tint px-2 py-0.5 text-xs font-medium text-accent-strong transition-opacity duration-300", applyP >= 1 ? "opacity-100" : "opacity-0")}>
                Recalculated: {SCORE_BEFORE} → {SCORE_AFTER}
              </span>
            </Appear>
          </div>
        </div>
      </div>
    </DuneStage>
  );
}
