/**
 * Research Planner engine. Deterministic templates today: generates discovery and pitch plans from the
 * report, runs a keyword synthesis over interview notes, and turns it into score adjustments.
 * Pure functions, shared by the server actions and the marketing demo. A model can replace
 * generatePlan/runSynthesis later; the shapes stay the same.
 */
import { CRITERION_BY_ID, FILTER_SHORT, PILLAR_BY_ID, RWW_BY_ID } from "@/config/criteria";
import { planTargets } from "@/lib/insights";
import { uid } from "@/lib/utils";
import { clampScore, computeReport, diffReports, type ReportDiff } from "@/services/scoring";
import type {
  Adjustments,
  Finding,
  Idea,
  InterviewNote,
  Objection,
  PitchSection,
  PlanGoal,
  PlanQuestion,
  PlanSection,
  Report,
  ResearchPlan,
  Settings,
  Synthesis,
  TrackedAssumption,
} from "@/types";

const isInterviewable = (prompt: string) => !/^\((Founder check|Desk research)\)/.test(prompt);
const q = (text: string, learn: string, tests: string): PlanQuestion => ({ id: uid("q"), text, learn, tests });

// ------------------------------------------------------------------ generation

export function generatePlan(idea: Idea, report: Report, goal: PlanGoal, previous?: ResearchPlan | null): ResearchPlan {
  const i = idea.intake;
  const a = idea.analysis!;
  const targets = planTargets(report);
  const targetPrompts: PlanQuestion[] = [];
  for (const t of targets) {
    const prompt = t.kind === "criterion" ? CRITERION_BY_ID[t.refId]?.testPrompt : t.kind === "rww" ? RWW_BY_ID[t.refId]?.testPrompt : undefined;
    if (prompt && isInterviewable(prompt)) targetPrompts.push(q(prompt, `Tests the riskiest assumption: ${t.label}.`, t.refId));
  }
  const problemWords = i.problem.split(".")[0].toLowerCase().slice(0, 80) || "this problem";
  const script: PlanSection[] = [
    { id: uid("s"), title: "Warm-up", items: [q("Tell me about your work and what a typical week looks like.", "Context and vocabulary; confirms they're in the segment.", "cust.identifiable"), q("How long have you been doing this on your own?", "Experience level; separates new from established customers.", "cust.identifiable")] },
    { id: uid("s"), title: "Current workflow", items: [q(`Walk me through the last time you dealt with ${problemWords}. What happened, step by step?`, "Today's workaround, in their words.", "real.need"), q("What tools or apps were open while you did that?", "Real substitutes, including spreadsheets and doing nothing.", "comp.substitutes"), ...targetPrompts.filter((x) => ["cust.problem", "real.need", "cust.identifiable"].includes(x.tests))] },
    { id: uid("s"), title: "Pain", items: [q("How many times did that come up in the last month?", "Frequency from real counts, not estimates.", "cust.frequent"), q("What did it cost you the last time it went badly, in time or money?", "Severity tied to a specific event.", "real.willBuy"), ...targetPrompts.filter((x) => ["cust.frequent", "time.trends", "win.timing"].includes(x.tests))] },
    { id: uid("s"), title: "Past attempts to solve it", items: [q("What have you tried to fix this? What happened?", "Past behavior beats stated intent.", "comp.substitutes"), q("Why did you stop using the last thing you tried?", "Why substitutes fail; where an advantage could come from.", "win.advantage"), ...targetPrompts.filter((x) => x.tests.startsWith("comp.") || ["win.advantage", "win.beat", "real.barriers"].includes(x.tests))] },
    { id: uid("s"), title: "Buying behavior", items: [q("What do you pay for tools in this part of your work today?", "Existing spend sets a price anchor.", "econ.monetization"), q("How did you find the last tool you started paying for?", "Real acquisition channels.", "chan.route"), ...targetPrompts.filter((x) => x.tests.startsWith("chan.") || x.tests.startsWith("econ.") || ["real.willBuy", "real.canBuy", "worth.money"].includes(x.tests))] },
    { id: uid("s"), title: "Wrap-up", items: [q("Is there anything about this I should have asked but didn't?", "Catches unknown unknowns.", "cust.problem"), q("Who else should I talk to about this?", "Referrals; tests accessibility of the segment.", "cust.accessible"), q(`(Only now, briefly) I'm exploring ${i.oneLiner.toLowerCase().replace(/\.$/, "")}. What would make that useless to you?`, "Pitch last; invites disconfirming feedback.", "real.willBuy")] },
  ];
  // de-duplicate questions by text
  const seen = new Set<string>();
  for (const s of script) s.items = s.items.filter((x) => (seen.has(x.text) ? false : (seen.add(x.text), true)));

  const screener: PlanQuestion[] = [
    q(`Which best describes you? (${i.targetCustomer.split(/[,(]/)[0]} / something else)`, "Confirms the segment.", "cust.identifiable"),
    q(`In the last month, how often did you deal with ${problemWords}? (never / once / weekly / daily)`, "Screens out people without the problem.", "cust.frequent"),
    q("What do you use for it today?", "Captures substitutes before the call.", "comp.substitutes"),
    q("Have you paid for any tool to help with this in the last year?", "Screens for buyers, not just sufferers.", "time.educated"),
  ];

  const outreach = `Hi {first name},\n\nI'm researching how ${i.targetCustomer.split(/[,(]/)[0].toLowerCase()} handle ${problemWords}. I'm not selling anything. I'd love 20 minutes to hear how you deal with it today.\n\nWould you be open to a quick call this week or next? Happy to share what I learn from everyone I talk to.\n\nThanks,\n{your name}`;

  const pick = (pred: (f: Finding) => boolean, n = 2) => a.findings.filter((f) => !idea.findingState[f.id]?.hidden && pred(f)).slice(0, n).map((f) => f.id);
  const filterScore = (id: string) => report.filters.find((f) => f.id === id)?.score;
  const pitch: PitchSection[] = [
    { id: uid("p"), title: "Problem", pillar: "real", body: i.problem, findingIds: pick((f) => f.criterionIds.includes("cust.problem")) },
    { id: uid("p"), title: "Who has it", pillar: "real", body: `${i.targetCustomer}. ${a.filterNotes.customer.rationale}`, findingIds: pick((f) => f.criterionIds.includes("cust.identifiable") || f.criterionIds.includes("cust.sizable")) },
    { id: uid("p"), title: "Why now", pillar: "timing", body: i.whyNow || `Timing filter scores ${filterScore("timing") ?? "n/a"}: ${a.filterNotes.timing.rationale}`, findingIds: pick((f) => f.criterionIds.some((c) => c.startsWith("time."))) },
    { id: uid("p"), title: "Solution", pillar: "real", body: `${i.solution} Key features: ${i.keyFeatures}.`, findingIds: pick((f) => f.criterionIds.includes("time.infra"), 1) },
    { id: uid("p"), title: "Why you", pillar: "win", body: i.skills || "Describe your edge here.", findingIds: pick((f) => f.rwwIds.some((r) => r.startsWith("win.")), 1) },
    { id: uid("p"), title: "The ask", pillar: "worthIt", body: `At $${i.price}/mo, ${report.pathToMrr.customersNeeded.toLocaleString()} customers reach $${i.mrrGoal.toLocaleString()} MRR. I'm looking for {pilot customers / a partner / feedback} to get the first 10.`, findingIds: pick((f) => f.criterionIds.includes("cust.sizable") || f.criterionIds.includes("econ.margins")) },
  ];

  const objections: Objection[] = [];
  const weak = [...report.filters].filter((f) => f.score != null).sort((x, y) => (x.score as number) - (y.score as number)).slice(0, 2);
  for (const f of weak) objections.push({ id: uid("o"), objection: objectionFor(f.id), response: `${a.filterNotes[f.id].rationale} Next: ${a.filterNotes[f.id].biggestRisk.replace(/\.$/, "")} is what I'm testing first.`, source: `Weakest filter: ${FILTER_SHORT[f.id]} (${f.score})`, findingIds: f.criteria.flatMap((c) => c.findingIds).slice(0, 2) });
  for (const c of report.score.capReasons) objections.push({ id: uid("o"), objection: "If the score is that high, why isn't it a strong pursuit?", response: `Because a gate caps it: ${c} I'm addressing that before building.`, source: "Active band cap", findingIds: [] });
  for (const p of report.pillars)
    for (const x of p.questions.filter((y) => y.answer === "no" || (y.answer === "maybe" && y.critical)).slice(0, 2))
      objections.push({ id: uid("o"), objection: rwwObjection(x.id), response: `${x.note} ${RWW_BY_ID[x.id].nextStep}.`, source: `${PILLAR_BY_ID[p.id].label}: ${x.answer === "no" ? "No" : "Maybe"}`, findingIds: x.findingIds.slice(0, 2) });

  return {
    goal,
    generatedAt: new Date().toISOString(),
    targets,
    personas: a.personas.map((p) => ({ ...p })),
    screener,
    script,
    outreach,
    pitch,
    objections: objections.slice(0, 6),
    notes: previous?.notes ?? [],
    synthesis: previous?.synthesis ?? null,
  };
}

function objectionFor(f: string) {
  return (
    {
      customer: "Is there really a customer who has this problem often enough?",
      economic: "Can this make enough money at that price?",
      competition: "Why won't an existing tool just add this?",
      channel: "How will you reach customers without burning money on ads?",
      timing: "Why is now the right time for this?",
    } as Record<string, string>
  )[f];
}
function rwwObjection(id: string) {
  const def = RWW_BY_ID[id];
  return `${def.text.split(" (")[0].replace("Is there", "Is there really").replace("Will the customer buy?", "Will anyone actually pay for this?")}`;
}

// ------------------------------------------------------------------ synthesis

const CUES: Record<string, { pos: string[]; neg: string[] }> = {
  frequency: { pos: ["every week", "weekly", "daily", "every day", "each week", "every monday", "constantly", "all the time", "every month"], neg: ["rarely", "once a year", "not often", "few times a year", "slow months"] },
  pay: { pos: ["would pay", "i'd pay", "id pay", "happily pay", "worth paying", "pre-order", "sign me up", "already pay"], neg: ["wouldn't pay", "would not pay", "not worth", "too expensive", "only if free", "free is fine"] },
  substitutes: { pos: ["hate", "frustrat", "clunky", "gave up", "stopped using", "doesn't work", "too generic"], neg: ["good enough", "works fine", "happy with", "does the job"] },
  channel: { pos: ["facebook group", "reddit", "community", "newsletter", "referr", "recommend", "word of mouth", "slack group"], neg: ["don't use social", "never search", "no idea where"] },
  advantage: { pos: ["nothing does", "no tool", "wish there was", "would switch if", "missing"], neg: ["already does that", "same as", "no different"] },
  problem: { pos: ["huge pain", "big problem", "biggest headache", "drives me crazy", "costs me"], neg: ["not a problem", "doesn't bother", "don't care", "not really an issue"] },
};

function cueFor(refId: string) {
  if (["cust.frequent", "time.trends", "win.timing"].includes(refId)) return CUES.frequency;
  if (["real.willBuy", "econ.monetization", "econ.margins", "worth.money", "time.educated", "real.canBuy"].includes(refId)) return CUES.pay;
  if (refId.startsWith("chan.") || refId === "cust.accessible") return CUES.channel;
  if (["comp.substitutes", "comp.leader", "win.beat"].includes(refId)) return CUES.substitutes;
  if (["comp.defensible", "comp.ip", "win.advantage", "real.barriers"].includes(refId)) return CUES.advantage;
  return CUES.problem;
}

const THEMES: { theme: string; words: string[] }[] = [
  { theme: "Time lost to the workaround", words: ["hour", "time", "evening", "weekend", "sunday", "night"] },
  { theme: "Willingness to pay", words: ["pay", "price", "$", "cost", "worth"] },
  { theme: "Frustration with current tools", words: ["hate", "clunky", "frustrat", "generic", "stopped using", "gave up"] },
  { theme: "Free tools feel good enough", words: ["good enough", "free", "works fine"] },
  { theme: "Discovery through peers", words: ["recommend", "referr", "group", "friend", "word of mouth"] },
  { theme: "Setup and switching effort", words: ["setup", "set up", "switch", "migrat", "learn"] },
];

const sentences = (t: string) => t.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

export function runSynthesis(plan: ResearchPlan, report: Report): Synthesis {
  const notes = plan.notes;
  const refs = new Map<string, TrackedAssumption>();
  const addRef = (kind: "criterion" | "rww", refId: string) => {
    if (refs.has(refId)) return;
    const label = kind === "criterion" ? CRITERION_BY_ID[refId]?.label : RWW_BY_ID[refId]?.text.split(" (")[0];
    if (!label) return;
    refs.set(refId, { id: uid("a"), refKind: kind, refId, label, status: "unclear", evidence: [] });
  };
  for (const t of plan.targets) if (t.kind === "criterion" || t.kind === "rww") addRef(t.kind, t.refId);
  for (const id of ["cust.frequent", "real.willBuy", "comp.substitutes"]) addRef(id.includes(".") && RWW_BY_ID[id] ? "rww" : "criterion", id);

  for (const a of refs.values()) {
    const cue = cueFor(a.refId);
    let pos = 0;
    let neg = 0;
    for (const n of notes) {
      for (const s of sentences(n.text)) {
        const l = s.toLowerCase();
        const p = cue.pos.some((w) => l.includes(w));
        const ng = cue.neg.some((w) => l.includes(w));
        if (ng) neg++;
        else if (p) pos++;
        if (p || ng) a.evidence.push({ noteId: n.id, snippet: s.length > 160 ? `${s.slice(0, 157)}…` : s });
      }
    }
    a.evidence = a.evidence.slice(0, 3);
    a.status = pos === 0 && neg === 0 ? "unclear" : pos > neg ? "validated" : neg > pos ? "invalidated" : "unclear";
  }

  const themes = THEMES.map((t) => {
    const ids = notes.filter((n) => t.words.some((w) => n.text.toLowerCase().includes(w))).map((n) => n.id);
    return { theme: t.theme, count: ids.length, noteIds: ids };
  })
    .filter((t) => t.count > 0)
    .sort((x, y) => y.count - x.count);

  const quotes = notes
    .flatMap((n) => (n.text.match(/"([^"]{12,180})"/g) ?? []).map((m) => ({ text: m.replace(/"/g, ""), noteId: n.id, interviewee: n.interviewee })))
    .slice(0, 6);

  void report;
  return { at: new Date().toISOString(), themes, quotes, assumptions: Array.from(refs.values()), appliedAt: null };
}

/** Turn a synthesis into adjustments + interview findings, without saving. */
export function synthesisAdjustments(idea: Idea, synthesis: Synthesis, report: Report): { adjustments: Adjustments; findings: Finding[] } {
  const adjustments: Adjustments = JSON.parse(JSON.stringify(idea.adjustments ?? { criteria: {}, rww: {} }));
  const findings: Finding[] = [];
  const crit = new Map(report.filters.flatMap((f) => f.criteria).map((c) => [c.id, c]));
  const rwwQ = new Map(report.pillars.flatMap((p) => p.questions).map((x) => [x.id, x]));
  const notes = idea.plan?.notes ?? [];
  for (const a of synthesis.assumptions) {
    if (a.status === "unclear") continue;
    const fid = `int-${a.refId}-${synthesis.at.slice(0, 16).replace(/\D/g, "")}`;
    const ev = a.evidence[0];
    const note = notes.find((n) => n.id === ev?.noteId);
    findings.push({
      id: fid,
      title: `Interviews: ${a.label} ${a.status === "validated" ? "validated" : "invalidated"}`,
      sourceId: "interviews",
      agentId: "framework",
      type: "interview",
      summary: `${a.evidence.length} note excerpt${a.evidence.length === 1 ? "" : "s"} from your interviews ${a.status === "validated" ? "support" : "contradict"} this assumption.`,
      excerpt: ev?.snippet ?? "",
      url: `https://example.com/interviews/${note?.id ?? "notes"}`,
      retrievedAt: synthesis.at,
      confidence: a.evidence.length >= 2 ? "high" : "medium",
      sentiment: a.status === "validated" ? "supports" : "weakens",
      criterionIds: a.refKind === "criterion" ? [a.refId] : [],
      rwwIds: a.refKind === "rww" ? [a.refId] : [],
    });
    const why = `From interview synthesis: ${a.status} by ${a.evidence.length} excerpt${a.evidence.length === 1 ? "" : "s"}${note ? ` (e.g. ${note.interviewee})` : ""}.`;
    if (a.refKind === "criterion") {
      const cur = crit.get(a.refId)?.score ?? null;
      const next = a.status === "validated" ? (cur == null ? 3 : clampScore(cur + 1)) : cur == null ? 1 : clampScore(cur - 2);
      adjustments.criteria[a.refId] = { score: next, note: why, findingIds: [fid] };
    } else {
      const cur = rwwQ.get(a.refId);
      adjustments.rww[a.refId] = { answer: a.status === "validated" ? "yes" : cur?.answer === "yes" ? "maybe" : "no", note: why, findingIds: [fid] };
    }
  }
  return { adjustments, findings };
}

export function previewSynthesis(idea: Idea, synthesis: Synthesis, settings: Pick<Settings, "weights">): { before: Report; after: Report; diff: ReportDiff } | null {
  const before = computeReport({ idea, weights: settings.weights });
  if (!before || !idea.analysis) return null;
  const { adjustments, findings } = synthesisAdjustments(idea, synthesis, before);
  const after = computeReport({ idea: { ...idea, adjustments, analysis: { ...idea.analysis, findings: [...idea.analysis.findings, ...findings] } }, weights: settings.weights })!;
  return { before, after, diff: diffReports(before, after) };
}

/** Demo helper: realistic sample notes so the synthesis flow can be tried without real interviews. */
export function sampleNotes(idea: Idea): Omit<InterviewNote, "id">[] {
  const i = idea.intake;
  const p = idea.analysis?.personas ?? [];
  const comp = idea.analysis?.competitors[0]?.name ?? "another tool";
  const today = new Date();
  const d = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);
  const cur = i.currentSolution.split(/[.;]/)[0].toLowerCase() || "a spreadsheet";
  return [
    { interviewee: "Maya R.", personaId: p[0]?.id ?? "p1", date: d(6), text: `Works solo, about four years in. Deals with this every week, usually Sunday night. Today she uses ${cur}. "Honestly it eats two hours every week and I hate doing it." Tried ${comp} last year and stopped using it because setup was clunky. Found her current invoicing tool through a recommendation in a Facebook group. When asked what she pays for tools now: about $40 a month total. "I'd pay $${i.price || 15} a month if it just worked without me babysitting it."` },
    { interviewee: "Dev P.", personaId: p[1]?.id ?? p[0]?.id ?? "p1", date: d(4), text: `Has the problem every month, worse during busy seasons. "Most of the time the free stuff is good enough for me." He uses ${cur} and says it does the job. Wouldn't pay for something that only covers this one step: "Not worth it if I have to set it up myself." Discovers tools on Reddit and through friends.` },
    { interviewee: "Sam K.", personaId: p[0]?.id ?? "p1", date: d(2), text: `Calls it "my biggest headache, all the time." Last month it happened at least six times. Has tried two tools and gave up on both: "too generic, nothing does the part I actually need." Would switch if it connected to what she already uses. Said she would pay, and asked to be told when there's something to try. Heard about her last tool through a referral from another freelancer.` },
  ];
}
