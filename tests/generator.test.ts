import { describe, expect, it } from "vitest";
import { SCORING_CONFIG } from "@/config/scoring";
import { generateAnalysis } from "@/mock/generator";
import { computeReport } from "@/services/scoring";
import { generatePlan, runSynthesis, sampleNotes, previewSynthesis } from "@/engine/planner";
import { EMPTY_INTAKE } from "@/config/intake";
import type { Idea, IntakeInput } from "@/types";

const intake: IntakeInput = {
  ...EMPTY_INTAKE,
  name: "Inventory alerts for Etsy candle makers",
  oneLiner: "Low-stock alerts for handmade sellers.",
  problem: "Candle makers run out of wax and jars weekly and lose sales.",
  targetCustomer: "Etsy candle makers selling 50+ orders a month from home",
  currentSolution: "A spreadsheet and checking shelves every week.",
  solution: "Syncs orders and predicts when supplies run out.",
  keyFeatures: "Order sync; supply forecasts; reorder reminders",
  price: 15, mrrGoal: 3000, timelineMonths: 12, runningCost: 1,
  whyNow: "Marketplace APIs opened order webhooks.",
  skills: "Ran a candle shop for 3 years.", weeklyHours: 8, budget: 1200,
  buildPath: "aiNoCode", familiarity: "iAmOne", distributionIdeas: "Etsy seller forums, my Instagram audience",
};
const W = { ...SCORING_CONFIG.defaultWeights };
const asIdea = (a: ReturnType<typeof generateAnalysis>): Idea => ({ id: "t", status: "complete", createdAt: "", updatedAt: "", lastRunAt: null, intake, analysis: a, findingState: {}, adjustments: { criteria: {}, rww: {} }, run: null, history: [], plan: null });

describe("generated reports", () => {
  it("produce a valid report that uses the founder's inputs", () => {
    const a = generateAnalysis(intake, { seedKey: "x", forcePartial: false });
    const r = computeReport({ idea: asIdea(a), weights: W })!;
    expect(r.score.overall).toBeGreaterThan(0);
    expect(a.findings.length).toBeGreaterThanOrEqual(20);
    expect(new Set(a.findings.map((f) => f.sourceId)).size).toBeGreaterThanOrEqual(8);
    expect(JSON.stringify(a)).toContain("candle");
    expect(r.filters.flatMap((f) => f.criteria).filter((c) => c.score == null).length).toBeGreaterThanOrEqual(1);
  });
  it("a partial agent failure makes Timing low confidence and caps the band at Promising or lower", () => {
    const a = generateAnalysis(intake, { seedKey: "x", forcePartial: true });
    const r = computeReport({ idea: asIdea(a), weights: W })!;
    expect(a.partialFailure).toBe("market");
    expect(r.score.lowConfidenceFilters).toContain("timing");
    expect(r.score.band).not.toBe("strong");
  });
  it("is deterministic for the same seed", () => {
    expect(generateAnalysis(intake, { seedKey: "s", forcePartial: false, now: "2026-01-01T00:00:00Z" })).toEqual(generateAnalysis(intake, { seedKey: "s", forcePartial: false, now: "2026-01-01T00:00:00Z" }));
  });
  it("planner generates a plan and sample-note synthesis changes the score", () => {
    const idea = asIdea(generateAnalysis(intake, { seedKey: "x", forcePartial: false }));
    const r = computeReport({ idea, weights: W })!;
    const plan = generatePlan(idea, r, "discovery");
    expect(plan.script.length).toBe(6);
    expect(plan.personas.length).toBeGreaterThanOrEqual(2);
    plan.notes = sampleNotes(idea).map((n, i) => ({ ...n, id: `n${i}` }));
    const syn = runSynthesis(plan, r);
    expect(syn.assumptions.some((a) => a.status !== "unclear")).toBe(true);
    const pv = previewSynthesis({ ...idea, plan: { ...plan, synthesis: syn } }, syn, { weights: W })!;
    expect(pv.diff.changed).toBe(true);
  });
});
