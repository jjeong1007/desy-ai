/**
 * Derived guidance: next steps, assumptions to test, and what a research plan should test.
 * Pure functions of a Report so they update whenever the score recalculates.
 */
import { CRITERION_BY_ID, FILTER_SHORT, PILLAR_BY_ID, RWW_BY_ID } from "@/config/criteria";
import type { PlanTarget, Report } from "@/types";

export interface NextStep {
  id: string;
  text: string;
  tiedTo: string;
  kind: "cap" | "criterion" | "rww";
  refId: string;
}

export function topNextSteps(report: Report, n = 3): NextStep[] {
  const steps: NextStep[] = [];
  const seen = new Set<string>();
  const push = (s: NextStep) => {
    if (seen.has(s.refId) || steps.length >= n) return;
    seen.add(s.refId);
    steps.push(s);
  };
  // 1. Active band caps first: the fastest way to move the band.
  for (const p of report.pillars.filter((x) => x.net === "no")) {
    const q = p.questions.find((x) => x.critical && x.answer === "no") ?? p.questions.find((x) => x.answer === "no");
    if (q) push({ id: `cap-${q.id}`, kind: "cap", refId: q.id, text: RWW_BY_ID[q.id].nextStep, tiedTo: `${PILLAR_BY_ID[p.id].label} came back No` });
  }
  for (const f of report.filters.filter((x) => x.knockout)) {
    const worst = f.criteria.filter((c) => c.score != null).sort((a, b) => (a.score as number) - (b.score as number))[0];
    if (worst) push({ id: `ko-${worst.id}`, kind: "cap", refId: worst.id, text: CRITERION_BY_ID[worst.id].nextStep, tiedTo: `${FILTER_SHORT[f.id]} is holding the rating back` });
  }
  for (const f of report.filters.filter((x) => x.lowConfidence)) {
    const gap = f.criteria.find((c) => c.score == null);
    if (gap) push({ id: `lc-${gap.id}`, kind: "cap", refId: gap.id, text: `Gather evidence: ${CRITERION_BY_ID[gap.id].nextStep.toLowerCase()}`, tiedTo: `${FILTER_SHORT[f.id]} needs more evidence` });
  }
  // 2. Interleave lowest criteria and Maybe/No RWW answers.
  const lows = report.filters
    .flatMap((f) => f.criteria)
    .filter((c) => c.score != null && (c.score as number) <= 2 && c.id !== "comp.ip")
    .sort((a, b) => (a.score as number) - (b.score as number) || (report.filters.find((f) => f.id === a.filter)!.score ?? 0) - (report.filters.find((f) => f.id === b.filter)!.score ?? 0));
  const rwws = report.pillars.flatMap((p) => p.questions).filter((q) => q.answer === "no" || (q.answer === "maybe" && q.critical));
  const max = Math.max(lows.length, rwws.length);
  for (let i = 0; i < max; i++) {
    const c = lows[i];
    if (c) push({ id: `c-${c.id}`, kind: "criterion", refId: c.id, text: CRITERION_BY_ID[c.id].nextStep, tiedTo: `Weak spot in ${FILTER_SHORT[c.filter]}` });
    const q = rwws[i];
    if (q) push({ id: `r-${q.id}`, kind: "rww", refId: q.id, text: RWW_BY_ID[q.id].nextStep, tiedTo: `Open question for ${PILLAR_BY_ID[q.pillar].label}` });
  }
  return steps;
}

export interface Assumption {
  id: string;
  kind: "criterion" | "filter" | "rww";
  refId: string;
  label: string;
  why: string;
}

export function keyAssumptions(report: Report): Assumption[] {
  const out: Assumption[] = [];
  for (const f of report.filters) {
    if (f.lowConfidence) out.push({ id: `f-${f.id}`, kind: "filter", refId: f.id, label: `${FILTER_SHORT[f.id]} filter has too little evidence`, why: "More evidence here could change the rating." });
    for (const c of f.criteria) if (c.score == null) out.push({ id: `c-${c.id}`, kind: "criterion", refId: c.id, label: c.label, why: `Needs evidence. Test: ${CRITERION_BY_ID[c.id].testPrompt}` });
  }
  for (const p of report.pillars)
    for (const q of p.questions)
      if (q.answer === "maybe" || q.answer == null) out.push({ id: `r-${q.id}`, kind: "rww", refId: q.id, label: `${PILLAR_BY_ID[p.id].label}: ${q.text.split(" (")[0]}`, why: q.answer == null ? "Still open." : q.note });
  return out;
}

/** "What this plan is testing": Needs evidence, low-confidence filters, active caps, Maybe/No RWW first. */
export function planTargets(report: Report, max = 8): PlanTarget[] {
  const t: PlanTarget[] = [];
  const push = (x: PlanTarget) => {
    if (!t.some((y) => y.refId === x.refId)) t.push(x);
  };
  for (const r of report.score.capReasons) push({ id: `cap-${t.length}`, kind: "cap", refId: `cap:${r}`, label: r.replace(/\.$/, ""), why: "Holding the rating back" });
  for (const p of report.pillars) for (const q of p.questions) if (q.answer === "no") push({ id: `t-${q.id}`, kind: "rww", refId: q.id, label: q.text.split(" (")[0], why: `${PILLAR_BY_ID[p.id].label} = No` });
  for (const f of report.filters) if (f.lowConfidence) push({ id: `t-${f.id}`, kind: "filter", refId: f.id, label: `${FILTER_SHORT[f.id]} filter evidence`, why: "Low confidence" });
  for (const f of report.filters) for (const c of f.criteria) if (c.score == null) push({ id: `t-${c.id}`, kind: "criterion", refId: c.id, label: c.label, why: "Needs evidence" });
  for (const p of report.pillars) for (const q of p.questions) if (q.answer === "maybe" || q.answer == null) push({ id: `t-${q.id}`, kind: "rww", refId: q.id, label: q.text.split(" (")[0], why: `${PILLAR_BY_ID[p.id].label} = Maybe` });
  const lows = report.filters.flatMap((f) => f.criteria).filter((c) => c.score != null && (c.score as number) <= 1);
  for (const c of lows) push({ id: `t-${c.id}`, kind: "criterion", refId: c.id, label: c.label, why: "Weak evidence so far" });
  return t.slice(0, max);
}
