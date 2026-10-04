import type { Idea, ResearchPlan } from "@/types";

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
