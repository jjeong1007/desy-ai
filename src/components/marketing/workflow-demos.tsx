"use client";
import { ArrowUpRight, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusBadge, type Status } from "@/components/app/agent-run";
import { BUILD, FAMILIAR, STEPS } from "@/components/app/intake-form";
import { SentimentTag } from "@/components/report/markers";
import { SourceLabel } from "@/components/sources/data-sources";
import { AGENTS } from "@/config/agents";
import { getSource } from "@/config/sources";
import { SAMPLE_IDEA } from "@/lib/sample";
import { cn, money } from "@/lib/utils";
import type { AgentId } from "@/types";

/**
 * Milliseconds since `playing` last turned on, capped at `total`. With `loopHold`, replays after holding the
 * end state that long. Jumps to the end state under reduced motion.
 */
export function useDemoClock(playing: boolean, total: number, loopHold?: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(total);
      return;
    }
    let start = performance.now();
    let frame = 0;
    setT(0);
    const tick = (now: number) => {
      let e = now - start;
      if (loopHold != null && e >= total + loopHold) {
        start = now;
        e = 0;
      }
      // Same value during the hold, so React skips those renders.
      setT(Math.min(total, e));
      if (loopHold != null || e < total) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, total, loopHold]);
  return t;
}

export const ease = (p: number) => 1 - (1 - p) ** 2;
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** A progress bar driven per frame by a demo clock: scaled on the GPU, no CSS transition to lag behind. */
export function DemoBar({ value, tone = "brand", className }: { value: number; tone?: "brand" | "accent" | "strong"; className?: string }) {
  const fill = { brand: "bg-brand", accent: "bg-accent", strong: "bg-strong" }[tone];
  return (
    <span aria-hidden className={cn("block h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <span className={cn("block h-full w-full origin-left rounded-full transition-colors duration-300 will-change-transform", fill)} style={{ transform: `scaleX(${clamp01(value / 100)})` }} />
    </span>
  );
}

// ------------------------------------------------------------------ Step 1: Describe

const intake = SAMPLE_IDEA.intake;
const TYPE_MS = 1700;
const ROWS_FROM = 2100;
const ROW_GAP = 520;

const REVIEW_ROWS: { step: number; label: string; value: string }[] = [
  { step: 0, label: "Idea", value: intake.name },
  { step: 1, label: "Customer", value: intake.targetCustomer },
  { step: 1, label: "Problem", value: intake.problem },
  { step: 1, label: "Today", value: intake.currentSolution },
  { step: 2, label: "Price and goal", value: `${money(intake.price)}/mo toward ${money(intake.mrrGoal)} MRR in ${intake.timelineMonths} months` },
  { step: 3, label: "Build path", value: BUILD.find((b) => b.id === intake.buildPath)?.label ?? "" },
  { step: 3, label: "Customer familiarity", value: FAMILIAR.find((f) => f.id === intake.familiarity)?.label ?? "" },
];
const DESCRIBE_TOTAL = ROWS_FROM + REVIEW_ROWS.length * ROW_GAP + 400;

/** Home prompt → guided intake → Run analysis. */
export function DescribeDemo({ playing }: { playing: boolean }) {
  const t = useDemoClock(playing, DESCRIBE_TOTAL);
  const typed = intake.oneLiner.slice(0, Math.round(intake.oneLiner.length * clamp01(t / TYPE_MS)));
  const submitted = t >= TYPE_MS + 200;
  const shown = Math.max(0, Math.min(REVIEW_ROWS.length, Math.floor((t - ROWS_FROM) / ROW_GAP) + 1));
  const done = shown === REVIEW_ROWS.length;
  const step = done ? STEPS.length - 1 : shown ? REVIEW_ROWS[shown - 1].step : 0;
  const ready = t >= DESCRIBE_TOTAL - 200;
  // Glide toward each step's share over 400ms after the row that reached it appears.
  const stepAt = (i: number) => {
    if (i === 0) return TYPE_MS + 200;
    const row = REVIEW_ROWS.findIndex((r) => r.step >= i);
    return ROWS_FROM + (row === -1 ? REVIEW_ROWS.length - 1 : row) * ROW_GAP;
  };
  const intakeProgress = STEPS.reduce((acc, _, i) => acc + (100 / STEPS.length) * ease(clamp01((t - stepAt(i)) / 400)), 0);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="glass-card flex flex-col gap-4 rounded-lg p-4 sm:p-5">
        <span className="text-small font-medium text-fg-tertiary">Home</span>
        <p className="m-0 text-heading font-medium text-fg">What are you thinking of building?</p>
        <div className={cn("flex min-h-[148px] flex-col justify-between gap-3 rounded-lg border bg-canvas px-4 py-3 transition-colors", submitted ? "border-line" : "border-line-strong")}>
          <p className="m-0 text-body text-fg">
            {typed}
            {!submitted ? <span className="ml-px inline-block h-[1.1em] w-px translate-y-[3px] animate-pulse bg-fg" /> : null}
          </p>
          <span className={cn("ml-auto inline-flex size-9 items-center justify-center rounded-full bg-brand text-on-brand transition-transform [&_svg]:size-4", submitted && "scale-90 ring-4 ring-brand/20")}>
            <ArrowUpRight />
          </span>
        </div>
        <p className="m-0 mt-auto text-small text-fg-secondary">Start with one sentence. Desy carries it into a short intake so nothing important is left out.</p>
      </div>

      <div className={cn("glass-card flex flex-col gap-4 rounded-lg p-4 transition-opacity duration-500 sm:p-5", submitted ? "opacity-100" : "opacity-40")}>
        <div className="flex flex-col gap-1">
          <span className="text-small font-medium text-accent-strong">New idea</span>
          <span className="text-title font-semibold text-fg">{STEPS[step].title}</span>
          <span className="text-small text-fg-secondary">{STEPS[step].blurb}</span>
        </div>
        <div className="flex flex-col gap-2">
          <DemoBar tone="accent" value={intakeProgress} />
          <ol className="m-0 flex list-none gap-1 overflow-hidden p-0">
            {STEPS.map((s, i) => (
              <li key={s.id} className={cn("shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors", submitted && i === step ? "bg-accent-tint text-accent-strong" : "text-fg-tertiary")}>
                {i + 1}. {s.title}
              </li>
            ))}
          </ol>
        </div>
        <dl className="m-0 flex min-h-[236px] flex-col gap-2.5">
          {REVIEW_ROWS.slice(0, shown).map((r) => (
            <div key={r.label} className="workflow-demo-enter flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="shrink-0 text-xs text-fg-tertiary sm:w-28">{r.label}</dt>
              <dd className="m-0 min-w-0 truncate text-small font-medium text-fg">{r.value}</dd>
            </div>
          ))}
        </dl>
        <span className={cn("inline-flex h-9 items-center gap-1.5 self-end rounded-sm px-3 text-body font-medium transition-all duration-300 [&_svg]:size-4", ready ? "bg-brand text-on-brand shadow-card" : "bg-subtle text-fg-tertiary")}>
          <Play /> Run analysis
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Step 2: Research

const analysis = SAMPLE_IDEA.analysis!;
const RESEARCH_TOTAL = 6400;
const mentions = analysis.painPoints.reduce((a, p) => a + p.mentions, 0);

/** Compressed copy of the live run. Log lines only name sources the marketing site already shows. */
const RUN: { id: Exclude<AgentId, "framework" | "founder">; start: number; dur: number; logs: string[] }[] = [
  { id: "market", start: 0, dur: 4600, logs: ["Reading search-trend data for “late invoice”…", "Trend loaded: up 18% year over year", "Cross-checking against LinkedIn profile counts…", `Obtainable market ≈ ${analysis.market.obtainableCustomers.toLocaleString()} ${analysis.market.unit}`] },
  { id: "competitor", start: 250, dur: 5600, logs: ["Searching G2 and Product Hunt for alternatives…", "Filtering candidates to direct competitors…", `Found ${analysis.competitors.length} competitors worth tracking`, "Building competitor matrix…"] },
  { id: "community", start: 500, dur: 5200, logs: ["Searching r/freelance for “chasing invoices”…", "Scanning Hacker News threads…", `Clustering ${mentions} pain-point mentions…`, `Top theme: “${analysis.painPoints[0]?.theme}”`] },
  { id: "builder", start: 750, dur: 4200, logs: ["Searching GitHub for open-source alternatives…", "Checking invoicing APIs and webhooks…", "Estimating running cost per customer…", "Feasibility check complete"] },
  { id: "signal", start: 1000, dur: 3800, logs: ["Scanning startup and funding news…", "Checking LinkedIn hiring trends…", "Signals logged"] },
];

const PUBLIC_LOGO = new Set(["reddit", "hackernews", "producthunt", "g2", "github", "linkedin"]);

/** Each finding surfaces partway through its agent's run so the feed fills as agents work. */
const FEED = RUN.flatMap((a) => {
  const own = analysis.findings.filter((f) => f.agentId === a.id);
  return own.map((f, i) => ({ f, at: a.start + 600 + ((a.dur - 600) * (i + 1)) / (own.length + 1) }));
}).sort((x, y) => x.at - y.at);

function agentView(a: (typeof RUN)[number], t: number): { status: Status; progress: number; log: string | null } {
  if (t < a.start) return { status: "queued", progress: 0, log: null };
  const p = clamp01((t - a.start) / a.dur);
  if (p >= 1) return { status: "done", progress: 100, log: a.logs[a.logs.length - 1] };
  return { status: "running", progress: ease(p) * 100, log: a.logs[Math.min(a.logs.length - 1, Math.floor(p * a.logs.length))] };
}

/** Research agents running in parallel while cited findings stream in. */
export function ResearchDemo({ playing }: { playing: boolean }) {
  const t = useDemoClock(playing, RESEARCH_TOTAL);
  const arrived = FEED.filter((x) => x.at <= t);
  const visible = arrived.filter((x) => PUBLIC_LOGO.has(x.f.sourceId)).slice(-5).reverse();
  const overall = RUN.reduce((s, a) => s + agentView(a, t).progress, 0) / RUN.length;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="glass-card flex flex-col gap-3 rounded-lg p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-small font-medium text-accent-strong">Research run</span>
            <span className="truncate text-title font-semibold text-fg">{intake.name}</span>
          </div>
          <span className="tnum shrink-0 text-small text-fg-secondary">{Math.floor(overall)}%</span>
        </div>
        <DemoBar tone="accent" value={overall} />
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {RUN.map((a) => {
            const meta = AGENTS.find((m) => m.id === a.id)!;
            const v = agentView(a, t);
            const logos = meta.sourceIds.filter((s) => PUBLIC_LOGO.has(s));
            return (
              <li key={a.id} className="flex flex-col gap-1.5 py-2.5 first:pt-1 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-small font-semibold text-fg">{meta.name}</span>
                    <span className="hidden min-w-0 items-center gap-1.5 sm:flex">
                      {logos.length ? (
                        logos.map((s) => {
                          const src = getSource(s);
                          // eslint-disable-next-line @next/next/no-img-element
                          return <img key={s} src={src.logo} alt={src.name} title={src.name} className={cn("size-3.5 object-contain", src.logoMono && "dark:invert")} />;
                        })
                      ) : (
                        <span className="truncate text-xs text-fg-tertiary">{meta.sourceIds.map((id) => getSource(id).category).find((c) => c !== "Licensed market databases")}</span>
                      )}
                    </span>
                  </span>
                  <StatusBadge status={v.status} />
                </div>
                <DemoBar value={v.progress} tone={v.status === "done" ? "strong" : "accent"} />
                <span className="truncate font-mono text-[12px] leading-relaxed text-fg-secondary">{v.log ?? "Waiting…"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="glass-card flex flex-col gap-3 rounded-lg p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-title font-semibold text-fg">Findings</span>
          <span className="tnum text-small text-fg-secondary">
            {arrived.length} of {analysis.findings.length}
          </span>
        </div>
        <ul className="m-0 flex min-h-[300px] list-none flex-col gap-2 p-0">
          {visible.map(({ f }) => (
            <li key={f.id} className="workflow-demo-enter flex flex-col gap-1 rounded-md border border-line bg-canvas px-3 py-2.5">
              <span className="flex items-center justify-between gap-2">
                <SourceLabel sourceId={f.sourceId} />
                <SentimentTag s={f.sentiment} />
              </span>
              <span className="line-clamp-2 text-small font-medium text-fg">{f.title}</span>
            </li>
          ))}
          {visible.length === 0 ? <li className="py-6 text-center text-small text-fg-tertiary">Agents are reading the web…</li> : null}
        </ul>
      </div>
    </div>
  );
}
