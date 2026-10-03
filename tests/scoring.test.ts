import { describe, expect, it } from "vitest";
import { CRITERIA, FILTER_IDS } from "@/config/criteria";
import { SCORING_CONFIG } from "@/config/scoring";
import { SEED_IDEAS, invoiceIdea, notesIdea, tutorIdea } from "@/mock/seeds";
import {
  applyConsistency,
  bandFromScore,
  buildFilter,
  computeReport,
  computeScoreResult,
  desyScore,
  diffReports,
  filterScoreFrom,
  rwwNet,
} from "@/services/scoring";
import type { CriterionScore, FilterId, FilterScore, Idea, RwwPillar } from "@/types";

const W = { ...SCORING_CONFIG.defaultWeights };
const crit = (filter: FilterId, scores: (0 | 1 | 2 | 3 | 4 | null)[]): CriterionScore[] =>
  scores.map((s, i) => ({ id: `${filter}.${i}`, filter, label: "", soloReading: "", score: s, justification: "", findingIds: [], frameworkIds: [], origin: "agent" }));
const filt = (id: FilterId, scores: (0 | 1 | 2 | 3 | 4 | null)[]) => buildFilter(id, crit(id, scores), 20, { rationale: "", biggestRisk: "" });
const pillar = (id: RwwPillar["id"], net: RwwPillar["net"]): RwwPillar => ({ id, net, rawNet: net, drawsOn: [], questions: [] });
const yesPillars = [pillar("real", "yes"), pillar("win", "yes"), pillar("worthIt", "yes")];

describe("criterion → filter math", () => {
  it("averages scored criteria on a 0-100 scale", () => {
    expect(filterScoreFrom(crit("customer", [4, 4, 3, 4, 3]))).toBe(90);
    expect(filterScoreFrom(crit("customer", [2, 2, 2, 3, null]))).toBe(56); // 9/16 = 56.25
  });
  it("excludes null criteria from the average", () => {
    expect(filterScoreFrom(crit("customer", [4, null, null, null, null]))).toBe(100);
  });
  it("returns null when nothing is scored", () => {
    expect(filterScoreFrom(crit("customer", [null, null, null, null, null]))).toBeNull();
  });
  it("marks a filter low confidence at 3+ unscored criteria", () => {
    expect(filt("timing", [4, 4, null, null, 4]).lowConfidence).toBe(false);
    expect(filt("timing", [4, 4, null, null, null]).lowConfidence).toBe(true);
    expect(filt("timing", [null, null, null, null, null]).lowConfidence).toBe(true);
  });
  it("marks a knockout below 40", () => {
    expect(filt("competition", [1, 1, 1, 0, null]).knockout).toBe(true);
    expect(filt("competition", [2, 1, 2, 1, 2]).knockout).toBe(false); // 40
  });
});

describe("Desy Score", () => {
  it("is the weighted mean of filter scores", () => {
    const fs = FILTER_IDS.map((id, i) => ({ id, score: [90, 85, 56, 75, 80][i] }));
    expect(desyScore(fs, W)).toBe(77);
  });
  it("renormalizes weights when a filter is null", () => {
    const fs = FILTER_IDS.map((id, i) => ({ id, score: [80, 60, null, 60, 80][i] }));
    expect(desyScore(fs, W)).toBe(70); // (80+60+60+80)/4
    const weighted = { customer: 40, economic: 10, competition: 20, channel: 10, timing: 20 };
    // active weights 40,10,10,20 = 80 → (80*40+60*10+60*10+80*20)/80 = 75
    expect(desyScore(fs, weighted)).toBe(75);
  });
  it("respects custom weights", () => {
    const fs = FILTER_IDS.map((id, i) => ({ id, score: [100, 0, 0, 0, 0][i] }));
    expect(desyScore(fs, { customer: 60, economic: 10, competition: 10, channel: 10, timing: 10 })).toBe(60);
  });
});

describe("RWW net answer", () => {
  const q = (a: "yes" | "maybe" | "no" | null, critical = false) => ({ answer: a, critical });
  it("is No when any critical sub-question is No", () => {
    expect(rwwNet([q("no", true), q("yes"), q("yes")])).toBe("no");
  });
  it("is Yes when all Yes or one Maybe", () => {
    expect(rwwNet([q("yes"), q("yes"), q("yes")])).toBe("yes");
    expect(rwwNet([q("yes"), q("maybe"), q("yes")])).toBe("yes");
  });
  it("is Probably otherwise (three Maybes, like Spoil My Spouse)", () => {
    expect(rwwNet([q("maybe"), q("maybe"), q("maybe"), q("yes")])).toBe("probably");
    expect(rwwNet([q("yes"), q("no"), q("yes")])).toBe("probably"); // non-critical No
  });
  it("counts unanswered as Maybe", () => {
    expect(rwwNet([q(null), q(null), q("yes")])).toBe("probably");
    expect(rwwNet([q(null), q("yes"), q("yes")])).toBe("yes");
  });
});

describe("consistency caps", () => {
  const base = { customer: 80, competition: 60, customersNeeded: 100, obtainable: 1000 };
  it("Real cannot be Yes with Customer below 50", () => {
    expect(applyConsistency("real", "yes", { ...base, customer: 45 }).net).toBe("probably");
    expect(applyConsistency("real", "yes", base).net).toBe("yes");
  });
  it("Win cannot be Yes with Competition below 40", () => {
    const r = applyConsistency("win", "yes", { ...base, competition: 30 });
    expect(r.net).toBe("probably");
    expect(r.reason).toMatch(/Competition/);
  });
  it("Worth It cannot be Yes if Path to MRR needs more customers than obtainable", () => {
    expect(applyConsistency("worthIt", "yes", { ...base, customersNeeded: 2000 }).net).toBe("probably");
  });
  it("never upgrades or touches No", () => {
    expect(applyConsistency("win", "no", { ...base, competition: 10 }).net).toBe("no");
  });
});

describe("band caps", () => {
  const strongFilters = (): FilterScore[] => [filt("customer", [4, 4, 4, 4, 3]), filt("economic", [3, 3, 3, 3, 3]), filt("competition", [3, 3, 3, 3, 3]), filt("channel", [3, 3, 3, 3, 3]), filt("timing", [3, 3, 3, 3, 3])];
  it("uses the score band when no cap applies", () => {
    const r = computeScoreResult(strongFilters(), yesPillars, W, "high");
    expect(r.band).toBe("strong");
    expect(r.capReasons).toEqual([]);
  });
  it("RWW pillar = No caps at Weak", () => {
    const r = computeScoreResult(strongFilters(), [pillar("real", "yes"), pillar("win", "no"), pillar("worthIt", "yes")], W, "high");
    expect(r.uncappedBand).toBe("strong");
    expect(r.band).toBe("weak");
  });
  it("a knockout filter caps at Promising", () => {
    const fs = strongFilters();
    fs[2] = filt("competition", [4, 4, 4, 4, 4].map(() => 1) as (0 | 1)[]); // 25 → knockout
    fs[0] = filt("customer", [4, 4, 4, 4, 4]);
    fs[1] = filt("economic", [4, 4, 4, 4, 4]);
    fs[3] = filt("channel", [4, 4, 4, 4, 4]);
    fs[4] = filt("timing", [4, 4, 4, 4, 4]);
    const r = computeScoreResult(fs, yesPillars, W, "high");
    expect(r.overall).toBe(85);
    expect(r.band).toBe("promising");
    expect(r.knockoutFilters).toEqual(["competition"]);
  });
  it("a low-confidence filter caps at Promising (score 70+, one low-confidence filter)", () => {
    const fs = strongFilters();
    fs[4] = filt("timing", [4, 4, null, null, null]);
    const r = computeScoreResult(fs, yesPillars, W, "medium");
    expect(r.overall).toBeGreaterThanOrEqual(70);
    expect(r.band).toBe("promising");
    expect(r.uncappedBand).toBe("strong");
    expect(r.capReasons.join(" ")).toMatch(/Not enough evidence in Timing/);
    expect(r.reason).toMatch(/capped/);
  });
  it("a null filter is low confidence and caps at Promising, but is never a knockout", () => {
    const fs = strongFilters();
    fs[3] = filt("channel", [null, null, null, null, null]);
    const r = computeScoreResult(fs, yesPillars, W, "medium");
    expect(r.knockoutFilters).toEqual([]);
    expect(r.lowConfidenceFilters).toEqual(["channel"]);
    expect(r.band).toBe("promising");
  });
  it("the lowest cap wins", () => {
    const fs = strongFilters();
    fs[2] = filt("competition", [1, 1, 1, 1, 1]);
    fs[4] = filt("timing", [4, 4, null, null, null]);
    const r = computeScoreResult(fs, [pillar("real", "yes"), pillar("win", "no"), pillar("worthIt", "yes")], W, "medium");
    expect(r.band).toBe("weak");
  });
  it("caps never change the Desy Score", () => {
    const fs = strongFilters();
    const uncapped = computeScoreResult(fs, yesPillars, W, "high");
    const capped = computeScoreResult(fs, [pillar("real", "no"), pillar("win", "no"), pillar("worthIt", "no")], W, "high");
    expect(capped.overall).toBe(uncapped.overall);
    expect(capped.band).not.toBe(uncapped.band);
  });
  it("a weak score with a low-confidence filter stays Weak", () => {
    const fs = [filt("customer", [1, 1, 1, 1, 1]), filt("economic", [1, 1, 1, 1, 1]), filt("competition", [2, 2, 2, 2, 2]), filt("channel", [1, 1, 1, 1, 1]), filt("timing", [2, null, null, null, 2])];
    const r = computeScoreResult(fs, yesPillars, W, "low");
    expect(r.band).toBe("weak");
    expect(r.capReasons).toEqual([]);
    expect(r.lowConfidenceFilters).toContain("timing");
  });
  it("band thresholds", () => {
    expect(bandFromScore(70)).toBe("strong");
    expect(bandFromScore(69)).toBe("promising");
    expect(bandFromScore(45)).toBe("promising");
    expect(bandFromScore(44)).toBe("weak");
  });
});

describe("seed ideas", () => {
  const report = (idea: Idea) => computeReport({ idea, weights: W })!;
  it("Invoice reminders → Strong pursuit", () => {
    const r = report(invoiceIdea);
    expect(r.score.overall).toBeGreaterThanOrEqual(70);
    expect(r.score.band).toBe("strong");
    expect(r.score.capReasons).toEqual([]);
    expect(r.filters.every((f) => (f.score ?? 0) >= 40)).toBe(true);
    expect(r.score.lowConfidenceFilters).toEqual([]);
    expect(r.pillars.every((p) => p.net !== "no")).toBe(true);
  });
  it("Tutor scheduling → Promising, Channel weakest, Win = Probably", () => {
    const r = report(tutorIdea);
    expect(r.score.overall).toBeGreaterThanOrEqual(45);
    expect(r.score.overall).toBeLessThan(70);
    expect(r.score.band).toBe("promising");
    const weakest = [...r.filters].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
    expect(weakest.id).toBe("channel");
    expect(r.pillars.find((p) => p.id === "win")!.net).toBe("probably");
    expect(tutorIdea.intake.buildPath).toBe("aiNoCode");
  });
  it("Generic AI notes → Weak (capped) despite a Promising-range score", () => {
    const r = report(notesIdea);
    expect(r.score.overall).toBeGreaterThanOrEqual(45);
    expect(r.score.overall).toBeLessThan(70);
    expect(r.score.uncappedBand).toBe("promising");
    expect(r.score.band).toBe("weak");
    expect(r.score.knockoutFilters).toEqual(["competition"]);
    expect(r.pillars.find((p) => p.id === "win")!.net).toBe("no");
    expect(r.score.reason).toMatch(/misleading/);
  });
  it("every seed has 2+ Needs evidence criteria, 25-40 findings across 8+ sources, and high confidence", () => {
    for (const idea of SEED_IDEAS) {
      const r = report(idea);
      const nulls = r.filters.flatMap((f) => f.criteria).filter((c) => c.score == null);
      expect(nulls.length).toBeGreaterThanOrEqual(2);
      const fnd = idea.analysis!.findings;
      expect(fnd.length).toBeGreaterThanOrEqual(25);
      expect(fnd.length).toBeLessThanOrEqual(40);
      expect(new Set(fnd.map((f) => f.sourceId)).size).toBeGreaterThanOrEqual(8);
      expect(r.score.confidence).toBe("high");
    }
  });
  it("seed criterion scores match their stated judgments (no silent caps)", () => {
    for (const idea of SEED_IDEAS) {
      const r = report(idea);
      for (const c of r.filters.flatMap((f) => f.criteria)) {
        const def = CRITERIA.find((d) => d.id === c.id)!;
        if (def.derivation === "judged") expect(c.score, `${idea.id} ${c.id}`).toBe(idea.analysis!.criteria[c.id].base);
      }
      // every cited finding exists
      const ids = new Set(idea.analysis!.findings.map((f) => f.id));
      for (const j of Object.values(idea.analysis!.criteria)) for (const id of j.findingIds) expect(ids.has(id), id).toBe(true);
      for (const j of Object.values(idea.analysis!.rww)) for (const id of j.findingIds) expect(ids.has(id), id).toBe(true);
    }
  });
  it("seed RWW answers obey the consistency rules", () => {
    for (const idea of SEED_IDEAS) {
      const r = report(idea);
      const f = Object.fromEntries(r.filters.map((x) => [x.id, x.score]));
      const real = r.pillars.find((p) => p.id === "real")!;
      const win = r.pillars.find((p) => p.id === "win")!;
      if ((f.customer ?? 0) < 50) expect(real.net).not.toBe("yes");
      if ((f.competition ?? 0) < 40) expect(win.net).not.toBe("yes");
      expect(real.cappedReason ?? null).toBeNull();
    }
  });
});

describe("recalculation triggers", () => {
  it("changing Path to MRR inputs recalculates criteria, filters and score", () => {
    const before = computeReport({ idea: invoiceIdea, weights: W })!;
    const after = computeReport({ idea: { ...invoiceIdea, intake: { ...invoiceIdea.intake, price: 3 } }, weights: W })!;
    const d = diffReports(before, after);
    expect(d.changed).toBe(true);
    expect(d.criteria.map((c) => c.id)).toEqual(expect.arrayContaining(["cust.sizable", "econ.margins", "chan.cac"]));
    expect(after.score.overall).toBeLessThan(before.score.overall);
  });
  it("hiding a finding lowers the criteria it supported", () => {
    const before = computeReport({ idea: invoiceIdea, weights: W })!;
    const idea = { ...invoiceIdea, findingState: { ...invoiceIdea.findingState, "inv-f16": { pinned: false, hidden: true, note: "" } } };
    const after = computeReport({ idea, weights: W })!;
    const c = after.filters.flatMap((f) => f.criteria).find((x) => x.id === "comp.resources")!;
    expect(c.score).toBe(2);
    expect(diffReports(before, after).changed).toBe(true);
  });
  it("hiding every finding behind a criterion makes it Needs evidence", () => {
    const idea = { ...invoiceIdea, findingState: { "inv-f19": { pinned: false, hidden: true, note: "" } } };
    const r = computeReport({ idea, weights: W })!;
    expect(r.filters.flatMap((f) => f.criteria).find((x) => x.id === "time.trends")!.score).toBeNull();
  });
  it("changing weights changes the score but never the criteria", () => {
    const a = computeReport({ idea: notesIdea, weights: W })!;
    const b = computeReport({ idea: notesIdea, weights: { customer: 10, economic: 10, competition: 60, channel: 10, timing: 10 } })!;
    expect(b.score.overall).toBeLessThan(a.score.overall);
    expect(diffReports(a, b).criteria).toEqual([]);
  });
  it("interview adjustments override criteria and RWW answers", () => {
    const idea = {
      ...notesIdea,
      adjustments: {
        criteria: { "comp.defensible": { score: 3 as const, note: "Interviews", findingIds: [] } },
        rww: { "win.advantage": { answer: "maybe" as const, note: "Interviews", findingIds: [] } },
      },
    };
    const r = computeReport({ idea, weights: W })!;
    expect(r.pillars.find((p) => p.id === "win")!.net).toBe("probably");
  });
});
