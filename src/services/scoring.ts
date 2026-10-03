/**
 * Desy scoring engine. Pure, synchronous, unit-tested.
 * All thresholds live in config/scoring.ts. Nothing here touches storage or the network.
 *
 * Pipeline: criteria (0-4 or null) → filter scores (0-100) → Desy Score (weighted mean)
 *           RWW sub-questions → pillar net answers → consistency caps
 *           score band → band caps (RWW No → Weak; knockout → Promising; low confidence → Promising)
 */
import { CRITERIA, FILTER_IDS, FILTER_SHORT, PILLARS, PILLAR_BY_ID, RWW_QUESTIONS } from "@/config/criteria";
import { BAND_LABEL, BAND_ORDER, SCORING_CONFIG as C } from "@/config/scoring";
import type {
  Adjustments,
  Analysis,
  Confidence,
  CriterionDef,
  CriterionScore,
  CriterionValue,
  FilterId,
  FilterScore,
  Finding,
  FindingState,
  Idea,
  IntakeInput,
  PathToMrr,
  PillarId,
  PursuitBand,
  Report,
  RwwAnswer,
  RwwNet,
  RwwPillar,
  RwwQuestion,
  ScoreResult,
} from "@/types";

// ---------------------------------------------------------------- helpers

export const clampScore = (n: number): CriterionValue => Math.max(0, Math.min(4, Math.round(n))) as CriterionValue;

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

// ---------------------------------------------------------------- Path to MRR

export function customersNeeded(price: number, mrrGoal: number): number {
  if (!(price > 0)) return Infinity;
  return Math.ceil(mrrGoal / price);
}

export function computePathToMrr(intake: Pick<IntakeInput, "price" | "mrrGoal" | "runningCost">, analysis: Pick<Analysis, "market" | "unit"> | null): PathToMrr {
  const price = Math.max(0, intake.price || 0);
  const variableCost = intake.runningCost ?? analysis?.unit.variableCost ?? 0;
  const needed = customersNeeded(price, intake.mrrGoal);
  const obtainable = analysis ? analysis.market.obtainableCustomers : null;
  const ratio = obtainable != null && Number.isFinite(needed) && needed > 0 ? obtainable / needed : null;
  const marginPct = price > 0 ? ((price - variableCost) / price) * 100 : 0;
  const cac = analysis?.unit.cac ?? 0;
  const monthlyContribution = price - variableCost;
  const cacPaybackMonths = monthlyContribution > 0 ? cac / monthlyContribution : null;
  return { price, mrrGoal: intake.mrrGoal, customersNeeded: needed, obtainable, ratio, variableCost, marginPct, cac, cacPaybackMonths };
}

export function sizableScore(ratio: number | null): CriterionValue | null {
  if (ratio == null) return null;
  for (const t of C.derived.sizableRatio) if (ratio >= t.min) return t.score as CriterionValue;
  return 0;
}
export function marginScore(marginPct: number): CriterionValue {
  for (const t of C.derived.margin) if (marginPct >= t.min) return t.score as CriterionValue;
  return 0;
}
export function cacPaybackScore(months: number | null): CriterionValue {
  if (months == null) return 0;
  for (const t of C.derived.cacPayback) if (months <= t.max) return t.score as CriterionValue;
  return 0;
}
export function moneyAnswer(ratio: number | null): RwwAnswer | null {
  if (ratio == null) return null;
  if (ratio >= C.derived.money.yesMin) return "yes";
  if (ratio >= C.derived.money.maybeMin) return "maybe";
  return "no";
}

function derivedScore(def: CriterionDef, p: PathToMrr): { score: CriterionValue | null; text: string } {
  switch (def.derivation) {
    case "sizable":
      if (p.ratio == null) return { score: null, text: "No obtainable-market estimate yet." };
      return {
        score: sizableScore(p.ratio),
        text: `${fmtInt(p.obtainable ?? 0)} obtainable customers vs. ${fmtInt(p.customersNeeded)} needed for $${fmtInt(p.mrrGoal)}/mo at $${p.price}/mo (${p.ratio.toFixed(1)}×).`,
      };
    case "margin":
      return { score: marginScore(p.marginPct), text: `Estimated gross margin ${Math.round(p.marginPct)}% ($${p.price} price, ~$${p.variableCost.toFixed(2)} running cost per customer).` };
    case "cacPayback":
      return {
        score: cacPaybackScore(p.cacPaybackMonths),
        text: p.cacPaybackMonths == null ? "Price doesn't cover running costs, so CAC never pays back." : `Estimated CAC ~$${fmtInt(p.cac)} pays back in ${p.cacPaybackMonths.toFixed(1)} months.`,
      };
    default:
      return { score: null, text: "" };
  }
}

// ---------------------------------------------------------------- criteria

export interface EvidenceContext {
  findings: Finding[];
  findingState: Record<string, FindingState>;
}

function visibleOf(ids: string[], ctx: EvidenceContext) {
  const byId = new Map(ctx.findings.map((f) => [f.id, f]));
  const all = ids.map((id) => byId.get(id)).filter((f): f is Finding => !!f);
  const visible = all.filter((f) => !ctx.findingState[f.id]?.hidden);
  const hidden = all.filter((f) => ctx.findingState[f.id]?.hidden);
  return { all, visible, hidden };
}

/** Effective criterion score after hidden findings, Path to MRR inputs and interview adjustments. */
export function evaluateCriterion(
  def: CriterionDef,
  analysis: Analysis,
  ctx: EvidenceContext,
  path: PathToMrr,
  adjustments: Adjustments,
  buildReading: (d: CriterionDef) => string = (d) => d.soloReading,
): CriterionScore {
  const j = analysis.criteria[def.id] ?? { base: null, justification: "", findingIds: [] };
  const adj = adjustments.criteria[def.id];
  const base: CriterionScore = {
    id: def.id,
    filter: def.filter,
    label: def.label,
    soloReading: buildReading(def),
    score: null,
    justification: j.justification,
    findingIds: j.findingIds,
    frameworkIds: def.frameworkIds,
    origin: def.derivation === "judged" ? "agent" : "computed",
  };
  if (adj) {
    return { ...base, score: adj.score, justification: adj.note, findingIds: Array.from(new Set([...adj.findingIds, ...j.findingIds])), origin: "interview" };
  }
  const { all, visible, hidden } = visibleOf(j.findingIds, ctx);
  if (all.length > 0 && visible.length === 0) {
    return { ...base, score: null, justification: "Every finding behind this criterion is hidden, so it needs evidence." };
  }
  let score: CriterionValue | null;
  let justification = j.justification;
  if (def.derivation !== "judged") {
    const d = derivedScore(def, path);
    score = d.score;
    justification = d.text;
  } else {
    score = j.base;
  }
  if (score == null) return { ...base, score: null, justification: justification || "No supporting findings yet." };
  const removedSupport = hidden.filter((f) => f.sentiment === "supports").length;
  const removedWeaken = hidden.filter((f) => f.sentiment === "weakens").length;
  let s = clampScore(score - removedSupport + removedWeaken);
  const distinctSources = new Set(visible.map((f) => f.sourceId)).size;
  if (s === 4 && visible.length > 0 && distinctSources < C.multiSourceForTop) s = 3;
  if (hidden.length) justification = `${justification} (${hidden.length} finding${hidden.length > 1 ? "s" : ""} hidden.)`;
  return { ...base, score: s, justification };
}

// ---------------------------------------------------------------- filters

/** Filter score 0-100 rounded to a whole number, or null if no criterion is scored. */
export function filterScoreFrom(criteria: Pick<CriterionScore, "score">[]): number | null {
  const scored = criteria.filter((c) => c.score != null) as { score: number }[];
  if (scored.length === 0) return null;
  const sum = scored.reduce((a, c) => a + c.score, 0);
  return Math.round((sum / (4 * scored.length)) * 100);
}

export function filterConfidenceFrom(unscored: number): Confidence {
  if (unscored <= C.filterConfidence.highMaxUnscored) return "high";
  if (unscored <= C.filterConfidence.mediumMaxUnscored) return "medium";
  return "low";
}

export function buildFilter(
  id: FilterId,
  criteria: CriterionScore[],
  weight: number,
  notes: { rationale: string; biggestRisk: string },
): FilterScore {
  const unscored = criteria.filter((c) => c.score == null).length;
  const score = filterScoreFrom(criteria);
  const lowConfidence = score == null || unscored >= C.lowConfidenceUnscoredMin;
  return {
    id,
    score,
    weight,
    confidence: lowConfidence ? "low" : filterConfidenceFrom(unscored),
    rationale: notes.rationale,
    biggestRisk: notes.biggestRisk,
    criteria,
    unscoredCount: unscored,
    knockout: score != null && score < C.knockoutBelow,
    lowConfidence,
  };
}

/** Weighted mean of non-null filter scores; null filters drop out and remaining weights renormalize. */
export function desyScore(filters: Pick<FilterScore, "score" | "id">[], weights: Record<FilterId, number>): number {
  const active = filters.filter((f) => f.score != null);
  const wsum = active.reduce((a, f) => a + (weights[f.id] ?? 0), 0);
  if (active.length === 0) return 0;
  if (wsum <= 0) return Math.round(active.reduce((a, f) => a + (f.score as number), 0) / active.length);
  return Math.round(active.reduce((a, f) => a + (f.score as number) * (weights[f.id] ?? 0), 0) / wsum);
}

export function effectiveWeights(filters: Pick<FilterScore, "score" | "id">[], weights: Record<FilterId, number>): Record<FilterId, number> {
  const active = filters.filter((f) => f.score != null);
  const wsum = active.reduce((a, f) => a + (weights[f.id] ?? 0), 0);
  const out = {} as Record<FilterId, number>;
  for (const f of filters) out[f.id] = f.score == null || wsum <= 0 ? 0 : ((weights[f.id] ?? 0) / wsum) * 100;
  return out;
}

export function weightsValid(w: Record<FilterId, number>): boolean {
  const sum = FILTER_IDS.reduce((a, id) => a + (w[id] ?? 0), 0);
  return Math.abs(sum - 100) < 0.001 && FILTER_IDS.every((id) => (w[id] ?? 0) >= 0);
}

// ---------------------------------------------------------------- RWW

/**
 * Net answer rule (Desy assumption):
 * No if any critical sub-question is No; Yes if all Yes or only one Maybe; Probably otherwise.
 * Unanswered counts as Maybe.
 */
export function rwwNet(questions: Pick<RwwQuestion, "answer" | "critical">[]): RwwNet {
  const answers = questions.map((q) => ({ a: q.answer ?? "maybe", critical: q.critical }));
  if (answers.some((x) => x.critical && x.a === "no")) return "no";
  const maybes = answers.filter((x) => x.a === "maybe").length;
  const nos = answers.filter((x) => x.a === "no").length;
  if (nos === 0 && maybes <= 1) return "yes";
  return "probably";
}

export interface ConsistencyInputs {
  customer: number | null;
  competition: number | null;
  customersNeeded: number;
  obtainable: number | null;
}

/** Consistency rules: cap a Yes at Probably when filter evidence contradicts it. */
export function applyConsistency(pillar: PillarId, net: RwwNet, x: ConsistencyInputs): { net: RwwNet; reason?: string } {
  if (net !== "yes") return { net };
  if (pillar === "real" && (x.customer == null || x.customer < C.consistency.realNeedsCustomerAtLeast)) {
    return { net: "probably", reason: `Capped at Probably: Real can't be Yes while the Customer filter is ${x.customer == null ? "unscored" : x.customer} (below ${C.consistency.realNeedsCustomerAtLeast}).` };
  }
  if (pillar === "win" && (x.competition == null || x.competition < C.consistency.winNeedsCompetitionAtLeast)) {
    return { net: "probably", reason: `Capped at Probably: Win can't be Yes while the Competition filter is ${x.competition == null ? "unscored" : x.competition} (below ${C.consistency.winNeedsCompetitionAtLeast}).` };
  }
  if (pillar === "worthIt" && x.obtainable != null && x.customersNeeded > x.obtainable) {
    return { net: "probably", reason: `Capped at Probably: Path to MRR needs ${fmtInt(x.customersNeeded)} customers but only ~${fmtInt(x.obtainable)} are obtainable.` };
  }
  return { net };
}

export function evaluateRwwQuestion(qid: string, analysis: Analysis, ctx: EvidenceContext, path: PathToMrr, adjustments: Adjustments): RwwQuestion {
  const def = RWW_QUESTIONS.find((q) => q.id === qid)!;
  const j = analysis.rww[qid] ?? { base: null, note: "", findingIds: [] };
  const adj = adjustments.rww[qid];
  const base: RwwQuestion = { id: qid, pillar: def.pillar, text: def.text, critical: def.critical, answer: null, note: j.note, findingIds: j.findingIds, origin: def.derivation ? "computed" : "agent" };
  if (adj) return { ...base, answer: adj.answer, note: adj.note, findingIds: Array.from(new Set([...adj.findingIds, ...j.findingIds])), origin: "interview" };
  const { all, visible, hidden } = visibleOf(j.findingIds, ctx);
  if (all.length > 0 && visible.length === 0) return { ...base, answer: null, note: "Every finding behind this answer is hidden. Counts as Maybe until there's evidence." };
  let answer: RwwAnswer | null = j.base;
  let note = j.note;
  if (def.derivation === "money") {
    answer = moneyAnswer(path.ratio);
    note =
      path.ratio == null
        ? "No obtainable-market estimate yet."
        : `Needs ${fmtInt(path.customersNeeded)} paying customers; ~${fmtInt(path.obtainable ?? 0)} look obtainable (${path.ratio.toFixed(1)}×).`;
  }
  if (answer === "yes" && hidden.some((f) => f.sentiment === "supports")) {
    answer = "maybe";
    note = `${note} Downgraded to Maybe: a supporting finding is hidden.`;
  } else if (answer === "no" && hidden.some((f) => f.sentiment === "weakens")) {
    answer = "maybe";
    note = `${note} Upgraded to Maybe: the finding behind this No is hidden.`;
  }
  return { ...base, answer, note };
}

export function buildPillar(id: PillarId, questions: RwwQuestion[], x: ConsistencyInputs): RwwPillar {
  const rawNet = rwwNet(questions);
  const c = applyConsistency(id, rawNet, x);
  return { id, net: c.net, rawNet, drawsOn: PILLAR_BY_ID[id].drawsOn, questions, cappedReason: c.reason };
}

// ---------------------------------------------------------------- bands

export function bandFromScore(score: number): PursuitBand {
  if (score >= C.bands.strongMin) return "strong";
  if (score >= C.bands.promisingMin) return "promising";
  return "weak";
}

const minBand = (a: PursuitBand, b: PursuitBand): PursuitBand => (BAND_ORDER[a] <= BAND_ORDER[b] ? a : b);

export function overallConfidence(coverage: number, sources: number): Confidence {
  if (coverage >= C.overallConfidence.high.minCoverage && sources >= C.overallConfidence.high.minSources) return "high";
  if (coverage >= C.overallConfidence.medium.minCoverage && sources >= C.overallConfidence.medium.minSources) return "medium";
  return "low";
}

const PILLAR_LABEL: Record<PillarId, string> = { real: "Real", win: "Win", worthIt: "Worth It" };

function pillarNoReason(p: RwwPillar): string {
  const q = p.questions.find((x) => x.critical && x.answer === "no");
  const t = q ? q.note.replace(/\.$/, "").split(". ")[0] : "a critical sub-question is No";
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/**
 * Score result: Desy Score, band, caps, one-sentence reason.
 * Caps change the band, never the number. The lowest cap wins.
 */
export function computeScoreResult(
  filters: FilterScore[],
  pillars: RwwPillar[],
  weights: Record<FilterId, number>,
  confidence: Confidence,
): ScoreResult {
  const overall = desyScore(filters, weights);
  const uncappedBand = bandFromScore(overall);
  const knockoutFilters = filters.filter((f) => f.knockout).map((f) => f.id);
  const lowConfidenceFilters = filters.filter((f) => f.lowConfidence).map((f) => f.id);
  const noPillars = pillars.filter((p) => p.net === "no");

  let band = uncappedBand;
  const caps: { level: PursuitBand; reason: string }[] = [];
  for (const p of noPillars) caps.push({ level: "weak", reason: `${PILLAR_LABEL[p.id]} = No: ${pillarNoReason(p)}.` });
  for (const id of knockoutFilters) {
    const f = filters.find((x) => x.id === id)!;
    caps.push({ level: "promising", reason: `${FILTER_SHORT[id]} is a knockout filter (${f.score}, below ${C.knockoutBelow}).` });
  }
  for (const id of lowConfidenceFilters) {
    const f = filters.find((x) => x.id === id)!;
    caps.push({ level: "promising", reason: `Not enough evidence in ${FILTER_SHORT[id]} to call this strong (${f.unscoredCount} of 5 criteria need evidence).` });
  }
  const applied = caps.filter((c) => BAND_ORDER[c.level] < BAND_ORDER[uncappedBand]);
  for (const c of applied) band = minBand(band, c.level);
  // Only list reasons for caps at the winning (lowest) level, plus any other applied caps after them.
  const capReasons = applied
    .slice()
    .sort((a, b) => BAND_ORDER[a.level] - BAND_ORDER[b.level])
    .map((c) => c.reason);

  const reason = bandReason({ overall, band, uncappedBand, filters, pillars, knockoutFilters, lowConfidenceFilters, capReasons });
  return { overall, band, uncappedBand, capReasons, confidence, reason, knockoutFilters, lowConfidenceFilters };
}

function bandReason(x: {
  overall: number;
  band: PursuitBand;
  uncappedBand: PursuitBand;
  filters: FilterScore[];
  pillars: RwwPillar[];
  knockoutFilters: FilterId[];
  lowConfidenceFilters: FilterId[];
  capReasons: string[];
}): string {
  const label = BAND_LABEL[x.band];
  const scored = x.filters.filter((f) => f.score != null).sort((a, b) => (a.score as number) - (b.score as number));
  const weakest = scored[0];
  if (x.band !== x.uncappedBand) {
    const parts: string[] = [];
    const nos = x.pillars.filter((p) => p.net === "no");
    for (const p of nos) parts.push(`${PILLAR_LABEL[p.id]} = No (${pillarNoReason(p)})`);
    for (const id of x.knockoutFilters) parts.push(`${FILTER_SHORT[id]} is a knockout filter (${x.filters.find((f) => f.id === id)!.score})`);
    if (nos.length === 0 && x.knockoutFilters.length === 0) {
      for (const id of x.lowConfidenceFilters) {
        const f = x.filters.find((ff) => ff.id === id)!;
        parts.push(`${FILTER_SHORT[id]} is low confidence (${f.unscoredCount} of 5 criteria need evidence)`);
      }
    }
    return `${label} (capped): ${joinAnd(parts)}, despite a score of ${x.overall}; the score alone would have been misleading.`;
  }
  if (x.band === "strong") {
    const floor = scored.length ? (scored[0].score as number) : 0;
    const nets = x.pillars.every((p) => p.net === "yes") ? "every RWW pillar is Yes" : "every RWW pillar is Yes or Probably";
    return `${label}: a score of ${x.overall} with no filter below ${floor} and ${nets}.`;
  }
  if (x.band === "promising") {
    const probably = x.pillars.filter((p) => p.net === "probably").map((p) => PILLAR_LABEL[p.id]);
    const tail = probably.length ? ` and ${joinAnd(probably)} ${probably.length > 1 ? "are" : "is"} only Probably` : "";
    return `${label}: ${weakest ? `${FILTER_SHORT[weakest.id]} is the weakest filter (${weakest.score})` : "evidence is thin"}${tail}, holding the score at ${x.overall}.`;
  }
  const lc = x.lowConfidenceFilters.length ? ` Low confidence in ${joinAnd(x.lowConfidenceFilters.map((id) => FILTER_SHORT[id]))}, so more evidence could move it.` : "";
  const two = scored.slice(0, 2).map((f) => `${FILTER_SHORT[f.id]} (${f.score})`);
  return `${label}: a score of ${x.overall}, pulled down by ${joinAnd(two)}.${lc}`;
}

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

// ---------------------------------------------------------------- full report

export const EMPTY_ADJUSTMENTS: Adjustments = { criteria: {}, rww: {} };

export interface ReportInputs {
  idea: Pick<Idea, "id" | "intake" | "analysis" | "findingState" | "adjustments">;
  weights: Record<FilterId, number>;
  buildReading?: (d: CriterionDef) => string;
}

export function computeReport({ idea, weights, buildReading }: ReportInputs): Report | null {
  const analysis = idea.analysis;
  if (!analysis) return null;
  const ctx: EvidenceContext = { findings: analysis.findings, findingState: idea.findingState };
  const adjustments = idea.adjustments ?? EMPTY_ADJUSTMENTS;
  const path = computePathToMrr(idea.intake, analysis);

  const criteria = CRITERIA.map((def) => evaluateCriterion(def, analysis, ctx, path, adjustments, buildReading));
  const filters = FILTER_IDS.map((fid) =>
    buildFilter(
      fid,
      criteria.filter((c) => c.filter === fid),
      weights[fid] ?? 0,
      analysis.filterNotes[fid] ?? { rationale: "", biggestRisk: "" },
    ),
  );
  const byFilter = Object.fromEntries(filters.map((f) => [f.id, f.score])) as Record<FilterId, number | null>;
  const cons: ConsistencyInputs = { customer: byFilter.customer, competition: byFilter.competition, customersNeeded: path.customersNeeded, obtainable: path.obtainable };
  const pillars = PILLARS.map((p) =>
    buildPillar(
      p.id,
      RWW_QUESTIONS.filter((q) => q.pillar === p.id).map((q) => evaluateRwwQuestion(q.id, analysis, ctx, path, adjustments)),
      cons,
    ),
  );

  const visibleFindings = analysis.findings.filter((f) => !idea.findingState[f.id]?.hidden);
  const withEvidence = criteria.filter((c) => c.score != null && c.findingIds.some((id) => visibleFindings.some((f) => f.id === id))).length;
  const sources = new Set(visibleFindings.map((f) => f.sourceId)).size;
  const conf = overallConfidence(withEvidence / CRITERIA.length, sources);
  const score = computeScoreResult(filters, pillars, weights, conf);
  return {
    ideaId: idea.id,
    filters,
    pillars,
    score,
    weights: effectiveWeights(filters, weights),
    pathToMrr: path,
    coverage: { scored: criteria.filter((c) => c.score != null).length, withEvidence, total: CRITERIA.length, sources },
  };
}

// ---------------------------------------------------------------- diffs (hide preview, synthesis before/after)

export interface ReportDiff {
  criteria: { id: string; label: string; before: CriterionValue | null; after: CriterionValue | null }[];
  filters: { id: FilterId; before: number | null; after: number | null; confBefore: Confidence; confAfter: Confidence }[];
  rww: { id: string; text: string; before: RwwAnswer | null; after: RwwAnswer | null }[];
  pillars: { id: PillarId; before: RwwNet; after: RwwNet }[];
  score: { before: number; after: number };
  band: { before: PursuitBand; after: PursuitBand };
  caps: { before: string[]; after: string[] };
  changed: boolean;
}

export function diffReports(a: Report, b: Report): ReportDiff {
  const ac = a.filters.flatMap((f) => f.criteria);
  const bc = new Map(b.filters.flatMap((f) => f.criteria).map((c) => [c.id, c]));
  const criteria = ac.filter((c) => bc.get(c.id)?.score !== c.score).map((c) => ({ id: c.id, label: c.label, before: c.score, after: bc.get(c.id)!.score }));
  const filters = a.filters
    .map((f) => {
      const g = b.filters.find((x) => x.id === f.id)!;
      return { id: f.id, before: f.score, after: g.score, confBefore: f.confidence, confAfter: g.confidence };
    })
    .filter((x) => x.before !== x.after || x.confBefore !== x.confAfter);
  const aq = a.pillars.flatMap((p) => p.questions);
  const bq = new Map(b.pillars.flatMap((p) => p.questions).map((q) => [q.id, q]));
  const rww = aq.filter((q) => bq.get(q.id)?.answer !== q.answer).map((q) => ({ id: q.id, text: q.text, before: q.answer, after: bq.get(q.id)!.answer }));
  const pillars = a.pillars.map((p) => ({ id: p.id, before: p.net, after: b.pillars.find((x) => x.id === p.id)!.net })).filter((x) => x.before !== x.after);
  const capsChanged = a.score.capReasons.join("|") !== b.score.capReasons.join("|");
  const changed = criteria.length > 0 || filters.length > 0 || rww.length > 0 || pillars.length > 0 || a.score.overall !== b.score.overall || a.score.band !== b.score.band || capsChanged;
  return {
    criteria,
    filters,
    rww,
    pillars,
    score: { before: a.score.overall, after: b.score.overall },
    band: { before: a.score.band, after: b.score.band },
    caps: { before: a.score.capReasons, after: b.score.capReasons },
    changed,
  };
}
