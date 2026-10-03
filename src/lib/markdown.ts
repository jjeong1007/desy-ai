import { FILTERS, PILLAR_BY_ID } from "@/config/criteria";
import { BAND_LABEL } from "@/config/scoring";
import { getSource } from "@/config/sources";
import { keyAssumptions, topNextSteps } from "./insights";
import type { Idea, Report, ResearchPlan } from "@/types";

const ans = (a: string | null) => (a == null ? "Unanswered (counts as Maybe)" : a === "yes" ? "Yes" : a === "no" ? "No" : a === "maybe" ? "Maybe" : "Probably");

export function reportMarkdown(idea: Idea, r: Report): string {
  const s = r.score;
  const capped = s.band !== s.uncappedBand;
  const L: string[] = [];
  L.push(`# ${idea.intake.name}`, "", `> ${idea.intake.oneLiner}`, "");
  L.push(`## Desy Score: ${s.overall}/100`, "");
  L.push(`**Pursuit band:** ${BAND_LABEL[s.band]}${capped ? ` (capped; score alone: ${BAND_LABEL[s.uncappedBand]})` : ""}  `);
  L.push(`**Confidence:** ${s.confidence} (${r.coverage.withEvidence}/${r.coverage.total} criteria with evidence, ${r.coverage.sources} sources)  `);
  L.push(`**Weights:** ${FILTERS.map((f) => `${f.short} ${Math.round(r.weights[f.id])}%`).join(", ")}. Equal weights by default; the course framework does not specify weights.`, "");
  L.push(s.reason, "");
  if (s.capReasons.length) {
    L.push("**Cap reasons**", "");
    for (const c of s.capReasons) L.push(`- ${c}`);
    L.push("");
  }
  L.push(`**Real / Win / Worth It:** ${r.pillars.map((p) => `${PILLAR_BY_ID[p.id].label} ${ans(p.net)}`).join(" | ")}`, "");
  L.push("## Five filters", "", "| Filter | Score | Confidence | Flags |", "| --- | --- | --- | --- |");
  for (const f of r.filters) L.push(`| ${FILTERS.find((x) => x.id === f.id)!.short} | ${f.score ?? "—"} | ${f.confidence} | ${[f.knockout ? "Knockout" : "", f.lowConfidence ? "Low confidence" : ""].filter(Boolean).join(", ")} |`);
  L.push("");
  for (const f of r.filters) {
    const meta = FILTERS.find((x) => x.id === f.id)!;
    L.push(`### ${meta.label}: ${f.score ?? "—"}`, "", f.rationale, "", `*Biggest risk:* ${f.biggestRisk}`, "");
    for (const c of f.criteria) {
      L.push(`- **${c.label}**: ${c.score == null ? "Needs evidence" : `${c.score}/4`}`);
      L.push(`  - Solo SaaS reading: ${c.soloReading}`);
      if (c.justification) L.push(`  - ${c.justification}`);
      const ev = c.findingIds.map((id) => idea.analysis?.findings.find((x) => x.id === id)).filter(Boolean);
      if (ev.length) L.push(`  - Evidence: ${ev.map((e) => `${getSource(e!.sourceId).name}: ${e!.title}`).join("; ")}`);
    }
    L.push("");
  }
  L.push("## Real / Win / Worth It checklist", "");
  for (const p of r.pillars) {
    const d = PILLAR_BY_ID[p.id];
    L.push(`### ${d.label}: ${ans(p.net)}`, "", `${d.question} (${d.fit})`, "");
    if (p.cappedReason) L.push(`*${p.cappedReason}*`, "");
    for (const q of p.questions) L.push(`- ${q.text}${q.critical ? " *(critical)*" : ""}: **${ans(q.answer)}**. ${q.note}`);
    L.push("");
  }
  const pm = r.pathToMrr;
  L.push("## Path to MRR", "", `$${pm.mrrGoal.toLocaleString()}/mo at $${pm.price}/mo needs ${pm.customersNeeded.toLocaleString()} customers; obtainable ≈ ${pm.obtainable?.toLocaleString() ?? "unknown"}${pm.ratio != null ? ` (${pm.ratio.toFixed(1)}×)` : ""}. Gross margin ${Math.round(pm.marginPct)}%. CAC payback ${pm.cacPaybackMonths != null ? `${pm.cacPaybackMonths.toFixed(1)} months` : "never"}.`, "");
  L.push("## Distribution channels", "");
  [...(idea.analysis?.channels ?? [])].sort((a, b) => b.fit - a.fit).forEach((c, i) => L.push(`${i + 1}. **${c.name}** (fit ${c.fit}, ${c.effort} effort): ${c.reason}`));
  L.push("", "## Next steps", "");
  topNextSteps(r).forEach((s2, i) => L.push(`${i + 1}. ${s2.text} *(${s2.tiedTo})*`));
  L.push("", "## Key assumptions to test", "");
  for (const a of keyAssumptions(r)) L.push(`- ${a.label}: ${a.why}`);
  L.push("", "---", "Scoring: five filters from \"Scoring Opportunities with Filters\" (M2 lecture) and Real / Win / Worth It (Screening Opportunities reading). Anchors, thresholds, weights and caps are Desy's assumptions.");
  return L.join("\n");
}

export function planMarkdown(idea: Idea, plan: ResearchPlan): string {
  const L: string[] = [`# Research plan: ${idea.intake.name}`, "", `Goal: ${plan.goal === "discovery" ? "Customer discovery" : "Pitch"}`, "", "## What this plan is testing", ""];
  for (const t of plan.targets) L.push(`- ${t.label} (${t.why})`);
  if (plan.goal === "discovery") {
    L.push("", "## Personas", "");
    for (const p of plan.personas) L.push(`### ${p.name}`, "", `- Who: ${p.who}`, `- Where to find them: ${p.where}`, `- Why they matter: ${p.why}`, "");
    L.push("## Screener", "");
    plan.screener.forEach((q, i) => L.push(`${i + 1}. ${q.text}`));
    L.push("", "## Interview script", "");
    for (const s of plan.script) {
      L.push(`### ${s.title}`, "");
      for (const q of s.items) L.push(`- ${q.text}`, `  - Learn: ${q.learn} *(tests ${q.tests})*`);
      L.push("");
    }
    L.push("## Outreach message", "", "```", plan.outreach, "```");
  } else {
    L.push("", "## Pitch script", "");
    for (const s of plan.pitch) L.push(`### ${s.title}`, "", s.body, "");
    L.push("## Likely objections", "");
    for (const o of plan.objections) L.push(`- **${o.objection}**`, `  - ${o.response} *(from: ${o.source})*`);
  }
  if (plan.synthesis) {
    L.push("", "## Synthesis", "");
    for (const t of plan.synthesis.themes) L.push(`- ${t.theme}: ${t.count} interview(s)`);
    L.push("");
    for (const a of plan.synthesis.assumptions) L.push(`- ${a.label}: **${a.status}**`);
  }
  return L.join("\n");
}
