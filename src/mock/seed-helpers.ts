import { getSource } from "@/config/sources";
import type { AgentId, Confidence, CriterionJudgment, CriterionValue, Finding, FindingType, RwwAnswer, RwwJudgment, Sentiment } from "@/types";

export type FindingSpec = [
  id: string,
  sourceId: string,
  type: FindingType,
  title: string,
  summary: string,
  excerpt: string,
  sentiment: Sentiment,
  criterionIds: string[],
  rwwIds: string[],
  confidence?: Confidence,
  daysAgo?: number,
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);

export function buildFindings(specs: FindingSpec[], baseDate: string): Finding[] {
  const base = new Date(baseDate).getTime();
  return specs.map(([id, sourceId, type, title, summary, excerpt, sentiment, criterionIds, rwwIds, confidence = "high", daysAgo = 2]) => {
    const src = getSource(sourceId);
    return {
      id,
      title,
      sourceId,
      agentId: (src.agentId === "founder" ? "framework" : src.agentId) as AgentId,
      type,
      summary,
      excerpt,
      url: `https://example.com/${sourceId}/${slug(title)}`,
      retrievedAt: new Date(base - daysAgo * 86400000).toISOString(),
      confidence,
      sentiment,
      criterionIds,
      rwwIds,
    };
  });
}

/** Attach criterionIds/rwwIds back from judgments so the finding's "used in" list is complete. */
export function linkFindings(findings: Finding[], criteria: Record<string, CriterionJudgment>, rww: Record<string, RwwJudgment>): Finding[] {
  return findings.map((f) => {
    const c = new Set(f.criterionIds);
    const r = new Set(f.rwwIds);
    for (const [id, j] of Object.entries(criteria)) if (j.findingIds.includes(f.id)) c.add(id);
    for (const [id, j] of Object.entries(rww)) if (j.findingIds.includes(f.id)) r.add(id);
    return { ...f, criterionIds: Array.from(c), rwwIds: Array.from(r) };
  });
}

export const cj = (base: CriterionValue | null, justification: string, findingIds: string[] = []): CriterionJudgment => ({ base, justification, findingIds });
export const rj = (base: RwwAnswer | null, note: string, findingIds: string[] = []): RwwJudgment => ({ base, note, findingIds });

export function trendSeries(start: number, deltas: number[]): { month: string; value: number }[] {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  let v = start;
  return months.map((m, i) => {
    v = Math.max(1, Math.round(v + (deltas[i] ?? 0)));
    return { month: m, value: v };
  });
}
