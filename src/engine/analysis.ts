/**
 * Analysis engine. Simulates the research agents: analyze() builds the analysis from templates
 * (src/mock/generator.ts) and buildRunPlan() scripts the replay the run view shows.
 * Real agents replace analyze() later and stream events instead of a scripted plan.
 */
import { FILTER_SHORT, PILLAR_BY_ID } from "@/config/criteria";
import { BAND_SHORT } from "@/config/scoring";
import { getSource } from "@/config/sources";
import { generateAnalysis } from "@/mock/generator";
import { rng } from "@/lib/utils";
import type { AgentId, Analysis, Idea, IntakeInput, Report, RunAgentPlan, RunPlan } from "@/types";

export function analyze(intake: IntakeInput, opts: { seedKey: string; forcePartial?: boolean | null }): Analysis {
  return generateAnalysis(intake, opts);
}

function topTerm(idea: Idea) {
  const t = idea.analysis?.trend.term || idea.intake.name;
  return t.length > 32 ? `${t.slice(0, 31)}…` : t;
}

export function frameworkLogs(report: Report): string[] {
  const logs: string[] = ["Phase 1: Scoring the opportunity…"];
  for (const f of report.filters) {
    logs.push(`${FILTER_SHORT[f.id]}: ${f.score ?? "needs evidence"}`);
  }
  logs.push("Phase 2: Assessing the opportunity…");
  for (const p of report.pillars) {
    logs.push(`${PILLAR_BY_ID[p.id].label}: ${p.net === "yes" ? "Yes" : p.net === "no" ? "No" : "Probably"}`);
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

