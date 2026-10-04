"use server";
import { generatePlan, runSynthesis, synthesisAdjustments } from "@/engine/planner";
import { getIdeaRow, getProfile, mutateIdea } from "@/server/db";
import { scoreChange, serverReport } from "@/server/report";
import { id as idSchema, interviewNoteSchema, parse, planSchema } from "@/server/schemas";
import { requireUser } from "@/server/supabase/server";
import type { Idea, InterviewNote, PlanGoal, ResearchPlan } from "@/types";

/**
 * Saves edits from the planner. Notes and synthesis are owned by saveNote/deleteNote/synthesize,
 * so the server's copies win; an edit made in another tab can't drop a note.
 */
export async function savePlan(ideaId: string, plan: ResearchPlan): Promise<Idea> {
  const { sb, user } = await requireUser();
  const next = parse(planSchema, plan) as unknown as ResearchPlan;
  return mutateIdea(sb, user.id, parse(idSchema, ideaId), (idea) => {
    idea.plan = { ...next, notes: idea.plan?.notes ?? next.notes, synthesis: idea.plan?.synthesis ?? next.synthesis };
  });
}

export async function createPlan(ideaId: string, goal: PlanGoal): Promise<Idea> {
  const { sb, user } = await requireUser();
  const id = parse(idSchema, ideaId);
  if (goal !== "discovery" && goal !== "pitch") throw new Error("Invalid goal");
  const { settings } = await getProfile(sb, user);
  return mutateIdea(sb, user.id, id, (idea) => {
    const report = serverReport(idea, settings.weights);
    if (!report || !idea.analysis) throw new Error("Run the analysis before planning research");
    idea.plan = generatePlan(idea, report, goal, idea.plan);
  });
}

export async function saveNote(ideaId: string, note: InterviewNote): Promise<Idea> {
  const { sb, user } = await requireUser();
  const n = parse(interviewNoteSchema, note);
  return mutateIdea(sb, user.id, parse(idSchema, ideaId), (idea) => {
    if (!idea.plan) return;
    const i = idea.plan.notes.findIndex((x) => x.id === n.id);
    if (i >= 0) idea.plan.notes[i] = n;
    else idea.plan.notes.push(n);
  });
}

export async function deleteNote(ideaId: string, noteId: string): Promise<Idea> {
  const { sb, user } = await requireUser();
  const nid = parse(idSchema, noteId);
  return mutateIdea(sb, user.id, parse(idSchema, ideaId), (idea) => {
    if (!idea.plan) return;
    idea.plan.notes = idea.plan.notes.filter((x) => x.id !== nid);
  });
}

export async function synthesize(ideaId: string): Promise<Idea> {
  const { sb, user } = await requireUser();
  const { settings } = await getProfile(sb, user);
  return mutateIdea(sb, user.id, parse(idSchema, ideaId), (idea) => {
    const report = serverReport(idea, settings.weights);
    if (!idea.plan || !report) throw new Error("No plan");
    idea.plan.synthesis = runSynthesis(idea.plan, report);
  });
}

export async function applySynthesis(ideaId: string): Promise<Idea> {
  const { sb, user } = await requireUser();
  const id = parse(idSchema, ideaId);
  const { settings } = await getProfile(sb, user);
  if (!(await getIdeaRow(sb, user.id, id))) throw new Error("Idea not found");
  return mutateIdea(sb, user.id, id, (idea) => {
    const syn = idea.plan?.synthesis;
    const before = serverReport(idea, settings.weights);
    if (!syn || !idea.analysis || !before) throw new Error("Nothing to apply");
    const { adjustments, findings } = synthesisAdjustments(idea, syn, before);
    idea.adjustments = adjustments;
    const ids = new Set(idea.analysis.findings.map((f) => f.id));
    idea.analysis.findings.push(...findings.filter((f) => !ids.has(f.id)));
    syn.appliedAt = new Date().toISOString();
    const changed = syn.assumptions.filter((a) => a.status !== "unclear").length;
    return {
      kind: "synthesis",
      summary: `Applied interview synthesis (${changed} assumption${changed === 1 ? "" : "s"} updated)`,
      ...scoreChange(before, serverReport(idea, settings.weights)),
    };
  });
}
