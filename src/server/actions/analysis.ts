"use server";
import { analyze, buildRunPlan } from "@/engine/analysis";
import { getIdeaRow, getProfile, mutateIdea } from "@/server/db";
import { serverReport } from "@/server/report";
import { id as idSchema, parse } from "@/server/schemas";
import { requireUser } from "@/server/supabase/server";
import type { Analysis, Idea } from "@/types";

/** Start a run: compute the analysis now and save it with a replayable run plan. */
export async function startAnalysis(ideaId: string): Promise<Idea> {
  const { sb, user } = await requireUser();
  const id = parse(idSchema, ideaId);
  const { settings } = await getProfile(sb, user);
  const cur = await getIdeaRow(sb, user.id, id);
  if (!cur) throw new Error("Idea not found");
  if (!cur.idea.intake.name.trim()) throw new Error("Add a name before running the analysis");

  const idea = cur.idea;
  const runIndex = idea.history.filter((h) => h.kind === "run").length;
  const analysis: Analysis =
    idea.seed && idea.analysis
      ? { ...idea.analysis, generatedAt: new Date().toISOString() }
      : analyze(idea.intake, { seedKey: `${idea.id}:${runIndex}`, forcePartial: false });

  return mutateIdea(sb, user.id, id, (it) => {
    const keep = new Set(analysis.findings.map((f) => f.id));
    it.analysis = analysis;
    it.findingState = Object.fromEntries(Object.entries(it.findingState).filter(([k]) => keep.has(k)));
    const report = serverReport(it, settings.weights);
    if (!report) throw new Error("Couldn't score this idea");
    it.run = buildRunPlan(it, analysis, report, false);
    it.status = "running";
    it.draftStep = undefined;
  });
}

/** Finish a run. Idempotent: a second call (reload, double click) returns the idea unchanged. */
export async function completeAnalysis(ideaId: string): Promise<Idea> {
  const { sb, user } = await requireUser();
  const id = parse(idSchema, ideaId);
  const { settings } = await getProfile(sb, user);
  const cur = await getIdeaRow(sb, user.id, id);
  if (!cur) throw new Error("Idea not found");
  if (cur.idea.status !== "running") return cur.idea;

  return mutateIdea(sb, user.id, id, (it) => {
    if (it.status !== "running") return;
    const report = serverReport(it, settings.weights);
    const prev = it.history.find((h) => h.kind === "run");
    it.status = "complete";
    it.lastRunAt = new Date().toISOString();
    it.run = null;
    return {
      kind: "run",
      summary: it.analysis?.partialFailure ? "Analysis complete (one agent returned partial results)" : "Analysis complete",
      scoreBefore: prev?.scoreAfter,
      bandBefore: prev?.bandAfter,
      scoreAfter: report?.score.overall,
      bandAfter: report?.score.band,
    };
  });
}
