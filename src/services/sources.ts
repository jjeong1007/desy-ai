/** Data Sources service: query findings, pin/note/hide, preview the effect of hiding. */
import { CRITERION_BY_ID, FILTER_SHORT, PILLAR_BY_ID, RWW_BY_ID } from "@/config/criteria";
import { getSource } from "@/config/sources";
import { delay } from "@/lib/utils";
import { computeReport, diffReports, type ReportDiff } from "./scoring";
import { updateIdea } from "./ideas";
import type { AgentId, FilterId, Finding, PillarId, FindingState, FindingType, Idea, Report, Settings } from "@/types";

export interface FindingQuery {
  search: string;
  sourceId: string | "all";
  agentId: AgentId | "all";
  type: FindingType | "all";
  filter: FilterId | "all";
  pillar: PillarId | "all";
  show: "visible" | "pinned" | "hidden" | "all";
}

export const EMPTY_QUERY: FindingQuery = { search: "", sourceId: "all", agentId: "all", type: "all", filter: "all", pillar: "all", show: "visible" };

export const FINDING_TYPE_LABEL: Record<FindingType, string> = {
  competitor: "Competitor",
  marketStat: "Market statistic",
  communitySignal: "Community signal",
  trend: "Trend",
  fundingEvent: "Funding event",
  openSource: "Open-source project",
  builderCapability: "Builder-tool capability",
  interview: "Interview",
};

/** Pure filter used by the findings list. */
export function queryFindings(findings: Finding[], state: Record<string, FindingState>, q: FindingQuery): Finding[] {
  const s = q.search.trim().toLowerCase();
  return findings
    .filter((f) => {
      const st = state[f.id];
      if (q.show === "visible" && st?.hidden) return false;
      if (q.show === "hidden" && !st?.hidden) return false;
      if (q.show === "pinned" && !st?.pinned) return false;
      if (q.sourceId !== "all" && f.sourceId !== q.sourceId) return false;
      if (q.agentId !== "all" && f.agentId !== q.agentId) return false;
      if (q.type !== "all" && f.type !== q.type) return false;
      if (q.filter !== "all" && !f.criterionIds.some((c) => CRITERION_BY_ID[c]?.filter === q.filter)) return false;
      if (q.pillar !== "all" && !f.rwwIds.some((r) => RWW_BY_ID[r]?.pillar === q.pillar)) return false;
      if (s && !`${f.title} ${f.summary} ${f.excerpt} ${getSource(f.sourceId).name} ${state[f.id]?.note ?? ""}`.toLowerCase().includes(s)) return false;
      return true;
    })
    .sort((a, b) => Number(!!state[b.id]?.pinned) - Number(!!state[a.id]?.pinned));
}

export interface UsedIn {
  criteria: { id: string; label: string; filter: string }[];
  rww: { id: string; text: string; pillar: string }[];
  sections: string[];
}

export function usedIn(finding: Finding, idea: Idea): UsedIn {
  const criteria = finding.criterionIds.map((id) => ({ id, label: CRITERION_BY_ID[id]?.label ?? id, filter: FILTER_SHORT[CRITERION_BY_ID[id]?.filter ?? "customer"] }));
  const rww = finding.rwwIds.map((id) => ({ id, text: RWW_BY_ID[id]?.text ?? id, pillar: PILLAR_BY_ID[RWW_BY_ID[id]?.pillar ?? "real"].label }));
  const sections = new Set<string>();
  if (criteria.length) sections.add("Scoring");
  if (rww.length) sections.add("Opportunity Assessment");
  const a = idea.analysis;
  if (a?.channels.some((c) => c.findingIds.includes(finding.id))) sections.add("Distribution channels");
  if (finding.criterionIds.includes("cust.sizable") || finding.rwwIds.includes("worth.money")) sections.add("Path to MRR");
  if (finding.type === "competitor" || finding.type === "fundingEvent") sections.add("Competitor matrix");
  if (finding.type === "trend") sections.add("Search-trend chart");
  if (finding.type === "communitySignal") sections.add("Community pain points");
  if (finding.type === "marketStat") sections.add("Market-sizing worksheet");
  if (idea.plan?.pitch.some((p) => p.findingIds.includes(finding.id))) sections.add("Pitch script");
  return { criteria, rww, sections: Array.from(sections) };
}

export function previewHide(idea: Idea, findingId: string, settings: Pick<Settings, "weights">, hide = true): { before: Report; after: Report; diff: ReportDiff } | null {
  const before = computeReport({ idea, weights: settings.weights });
  const prevState: FindingState = idea.findingState[findingId] ?? { pinned: false, hidden: false, note: "" };
  const nextState = { ...idea.findingState, [findingId]: { ...prevState, hidden: hide } };
  const after = computeReport({ idea: { ...idea, findingState: nextState }, weights: settings.weights });
  if (!before || !after) return null;
  return { before, after, diff: diffReports(before, after) };
}

export async function setFindingState(ideaId: string, findingId: string, patch: Partial<FindingState>, summary?: { text: string; kind: "hidden" | "unhidden"; scoreBefore: number; scoreAfter: number; bandBefore: Report["score"]["band"]; bandAfter: Report["score"]["band"] }): Promise<Idea> {
  await delay(120);
  return updateIdea(
    ideaId,
    (idea) => {
      const prev: FindingState = idea.findingState[findingId] ?? { pinned: false, hidden: false, note: "" };
      idea.findingState[findingId] = { ...prev, ...patch };
    },
    summary ? { kind: summary.kind, summary: summary.text, scoreBefore: summary.scoreBefore, scoreAfter: summary.scoreAfter, bandBefore: summary.bandBefore, bandAfter: summary.bandAfter } : undefined,
  );
}
