/**
 * Analysis service. Simulates the research agents on the client.
 * startAnalysis() computes the analysis immediately (deterministic templates) and stores a RunPlan;
 * the run view replays the plan in real time. A real backend would stream agent events instead.
 */
import { FILTER_SHORT, PILLAR_BY_ID } from "@/config/criteria";
import { BAND_SHORT } from "@/config/scoring";
import { getSource } from "@/config/sources";
import { generateAnalysis } from "@/mock/generator";
import { delay, rng, uid } from "@/lib/utils";
import { computeReport } from "./scoring";
import { mutateDb, readDb } from "./storage";
import type { AgentId, Analysis, Idea, Report, RunAgentPlan, RunPlan } from "@/types";

function topTerm(idea: Idea) {
  const t = idea.analysis?.trend.term || idea.intake.name;
  return t.length > 32 ? `${t.slice(0, 31)}…` : t;
}

export function frameworkLogs(report: Report): string[] {
  const logs: string[] = ["Phase 1: Scoring 5 filters (25 criteria)…"];
  for (const f of report.filters) {
    const scored = 5 - f.unscoredCount;
    logs.push(`${FILTER_SHORT[f.id]} filter: ${scored} of 5 criteria scored${f.unscoredCount ? `, ${f.unscoredCount} need${f.unscoredCount > 1 ? "" : "s"} evidence` : ""} → ${f.score ?? "no score"}`);
  }
  logs.push("Phase 2: Applying Real / Win / Worth It…");
  for (const p of report.pillars) {
    const flagged = p.questions.find((q) => q.answer === "no") ?? p.questions.find((q) => q.answer === "maybe");
    logs.push(`${PILLAR_BY_ID[p.id].label}: ${p.net === "yes" ? "Yes" : p.net === "no" ? "No" : "Probably"}${flagged ? ` ('${flagged.text.split(" (")[0]}' → ${flagged.answer === "no" ? "No" : "Maybe"})` : ""}`);
    if (p.cappedReason) logs.push(p.cappedReason);
  }
  logs.push("Phase 3: Computing Desy Score and pursuit band…");
  logs.push(`Desy Score ${report.score.overall} → ${BAND_SHORT[report.score.uncappedBand]} by score`);
  for (const c of report.score.capReasons) logs.push(`Band capped at ${BAND_SHORT[report.score.band]}: ${c}`);
  logs.push(`Pursuit band: ${BAND_SHORT[report.score.band]}${report.score.band !== report.score.uncappedBand ? " (capped)" : ""}, confidence ${report.score.confidence}`);
  return logs;
}

export function buildRunPlan(idea: Idea, analysis: Analysis, report: Report, quick: boolean): RunPlan {
  const r = rng(`${idea.id}:${analysis.generatedAt}`);
  const term = topTerm(idea);
  const count = (a: AgentId) => analysis.findings.filter((f) => f.agentId === a).length;
  const comp = analysis.competitors.length;
  const cust = idea.intake.targetCustomer.split(/[,(]/)[0].slice(0, 40) || "your customers";
  const failed = analysis.partialFailure;
  const scale = quick ? 0.35 : 1;
  const mk = (id: AgentId, start: number, dur: number, logs: string[]): RunAgentPlan => ({
    id,
    startDelayMs: Math.round(start * scale),
    durationMs: Math.round(dur * scale),
    logs,
    findings: count(id),
    outcome: failed === id ? "partial" : "done",
  });
  const agents: RunAgentPlan[] = [
    mk("market", 0, r.int(15000, 19000), failed === "market"
      ? [`Querying ${getSource("statista").name} for "${term}"…`, "Estimating top-down market size…", `Requesting ${getSource("googletrends").name} 12-month series for "${term}"…`, "Trend request timed out (retry 1/2)…", "Trend request timed out (retry 2/2)", "Returning partial results: market size only, no trend or adoption data"]
      : [`Querying ${getSource("statista").name} for "${term}"…`, "Estimating top-down market size…", `Requesting ${getSource("googletrends").name} 12-month series for "${term}"…`, `Trend for "${term}" loaded (12 points)`, "Cross-checking bottom-up estimate against profile counts…", `Obtainable market ≈ ${analysis.market.obtainableCustomers.toLocaleString()} ${analysis.market.unit}`]),
    mk("competitor", 500, r.int(17000, 21000), [`Searching ${getSource("g2").name} and ${getSource("producthunt").name} for alternatives…`, `Found ${comp + r.int(6, 12)} candidates; filtering to direct competitors…`, `Found ${comp} competitors worth tracking`, `Checking ${getSource("crunchbase").name} and ${getSource("pitchbook").name} funding history…`, `${analysis.competitors.filter((c) => /seed|series|\$/i.test(c.funding)).length} competitors show disclosed funding`, "Building competitor matrix…"]),
    mk("community", 1000, r.int(16000, 20000), [`Searching r/${cust.split(" ").slice(-1)[0].toLowerCase().replace(/[^a-z]/g, "") || "SaaS"} and r/SaaS for "${term}"…`, `Scanning ${getSource("hackernews").name} threads…`, `Reading ${getSource("indiehackers").name} discussions about pricing…`, `Clustering ${analysis.painPoints.reduce((a, p) => a + p.mentions, 0)} pain-point mentions into themes…`, `Top theme: "${analysis.painPoints[0]?.theme ?? "time lost"}"`, "Extracting quote snippets…"]),
    mk("builder", 1500, r.int(12000, 16000), [`Searching ${getSource("github").name} for open-source alternatives…`, "Checking API availability for the core feature…", idea.intake.buildPath === "aiNoCode" ? "Testing integrations available in common AI and no-code builders…" : "Estimating running cost per customer…", idea.intake.buildPath === "hiredDeveloper" ? "Comparing typical contractor quotes to your build budget…" : "Checking feasibility against your weekly hours…", "Feasibility check complete"]),
    mk("signal", 2000, r.int(11000, 15000), [`Scanning ${getSource("techcrunch").name} for funding news…`, `Checking ${getSource("linkedin").name} hiring trends for ${cust}…`, "Looking for incumbents announcing similar features…", "Signals logged"]),
  ];
  const researchEnd = Math.max(...agents.map((a) => a.startDelayMs + a.durationMs));
  const fwDur = Math.round(9000 * scale);
  agents.push({ id: "framework", startDelayMs: researchEnd, durationMs: fwDur, logs: frameworkLogs(report), findings: analysis.findings.length, outcome: "done" });
  return { startedAt: new Date().toISOString(), totalMs: researchEnd + fwDur, agents };
}

/** Start a run: compute the analysis now, persist it with a replayable run plan. */
export async function startAnalysis(ideaId: string): Promise<Idea> {
  await delay(400);
  const db = readDb();
  const idea = db.ideas.find((i) => i.id === ideaId);
  if (!idea) throw new Error("Idea not found");
  const runIndex = idea.history.filter((h) => h.kind === "run").length;
  const forcePartial = db.settings.partialFailure === "always" ? true : db.settings.partialFailure === "never" ? false : null;
  const analysis: Analysis = idea.seed && idea.analysis && forcePartial !== true
    ? { ...idea.analysis, generatedAt: new Date().toISOString() }
    : generateAnalysis(idea.intake, { seedKey: `${idea.id}:${runIndex}`, forcePartial });
  const draft: Idea = { ...idea, analysis };
  const keep = new Set(analysis.findings.map((f) => f.id));
  draft.findingState = Object.fromEntries(Object.entries(idea.findingState).filter(([k]) => keep.has(k)));
  const report = computeReport({ idea: draft, weights: db.settings.weights })!;
  const plan = buildRunPlan(draft, analysis, report, db.settings.reducedMotionRuns);
  let out: Idea | null = null;
  mutateDb((d) => {
    const it = d.ideas.find((i) => i.id === ideaId)!;
    it.analysis = analysis;
    it.findingState = draft.findingState;
    it.status = "running";
    it.run = plan;
    it.draftStep = undefined;
    it.updatedAt = new Date().toISOString();
    out = it;
  });
  return out!;
}

export async function completeAnalysis(ideaId: string): Promise<Idea> {
  await delay(200);
  const db = readDb();
  let out: Idea | null = null;
  mutateDb((d) => {
    const it = d.ideas.find((i) => i.id === ideaId);
    if (!it) throw new Error("Idea not found");
    if (it.status !== "running") {
      out = it;
      return;
    }
    const report = computeReport({ idea: it, weights: db.settings.weights });
    const prev = it.history.find((h) => h.kind === "run");
    it.status = "complete";
    it.lastRunAt = new Date().toISOString();
    it.run = null;
    it.history.unshift({
      id: uid("h"),
      at: it.lastRunAt,
      kind: "run",
      summary: it.analysis?.partialFailure ? "Analysis complete (one agent returned partial results)" : "Analysis complete",
      scoreBefore: prev?.scoreAfter,
      bandBefore: prev?.bandAfter,
      scoreAfter: report?.score.overall,
      bandAfter: report?.score.band,
    });
    out = it;
  });
  return out!;
}
