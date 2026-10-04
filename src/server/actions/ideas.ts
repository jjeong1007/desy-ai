"use server";
import { uid } from "@/lib/utils";
import { getIdeaRow, getProfile, insertIdea, listIdeaRows, mutateIdea, replaceWithSeeds, type HistoryInput } from "@/server/db";
import { scoreChange, serverReport } from "@/server/report";
import { findingStatePatchSchema, historyInputSchema, id as idSchema, intakePatchSchema, intakeSchema, parse } from "@/server/schemas";
import { requireUser } from "@/server/supabase/server";
import type { FindingState, Idea, IntakeInput } from "@/types";

/** Kinds whose history entry records how the score moved. */
const SCORED_KINDS = new Set<HistoryInput["kind"]>(["pathToMrr", "hidden", "unhidden", "synthesis", "weights", "edited"]);

export async function listIdeas(): Promise<Idea[]> {
  const { sb, user } = await requireUser();
  return listIdeaRows(sb, user.id);
}

export async function getIdea(id: string): Promise<Idea | null> {
  const { sb, user } = await requireUser();
  return (await getIdeaRow(sb, user.id, parse(idSchema, id)))?.idea ?? null;
}

export async function saveDraft(id: string | null, intake: IntakeInput, step: number): Promise<Idea> {
  const { sb, user } = await requireUser();
  const data = parse(intakeSchema, intake);
  const draftStep = Math.max(0, Math.min(20, Math.trunc(step)));
  if (id && (await getIdeaRow(sb, user.id, parse(idSchema, id)))) {
    return mutateIdea(sb, user.id, id, (idea) => {
      idea.intake = data;
      idea.draftStep = draftStep;
    });
  }
  const now = new Date().toISOString();
  return insertIdea(sb, user.id, {
    id: uid("idea"),
    status: "draft",
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    intake: data,
    draftStep,
    analysis: null,
    findingState: {},
    adjustments: { criteria: {}, rww: {} },
    run: null,
    history: [{ id: uid("h"), at: now, kind: "created", summary: "Draft created" }],
    plan: null,
  });
}

export async function updateIntake(id: string, patch: Partial<IntakeInput>, history?: HistoryInput): Promise<Idea> {
  const { sb, user } = await requireUser();
  const data = parse(intakePatchSchema, patch);
  const h = history ? parse(historyInputSchema, { kind: history.kind, summary: history.summary }) : undefined;
  const { settings } = await getProfile(sb, user);
  return mutateIdea(sb, user.id, parse(idSchema, id), (idea) => {
    const before = h && SCORED_KINDS.has(h.kind) ? serverReport(idea, settings.weights) : null;
    idea.intake = { ...idea.intake, ...data };
    if (!h) return;
    return { ...h, ...scoreChange(before, before ? serverReport(idea, settings.weights) : null) };
  });
}

export async function deleteIdea(id: string): Promise<void> {
  const { sb, user } = await requireUser();
  const { error } = await sb.from("ideas").delete().eq("user_id", user.id).eq("id", parse(idSchema, id));
  if (error) throw error;
}

/** Create a prefilled draft from an alternative direction. */
export async function createFromAlternative(ideaId: string, altId: string): Promise<Idea> {
  const { sb, user } = await requireUser();
  const src = (await getIdeaRow(sb, user.id, parse(idSchema, ideaId)))?.idea;
  const alt = src?.analysis?.alternatives.find((a) => a.id === altId);
  if (!src || !alt) throw new Error("Alternative not found");
  return saveDraft(null, { ...src.intake, ...alt.intakePatch, oneLiner: alt.oneLiner }, 0);
}

/**
 * Pin, note, or hide a finding. When `summary` is given (hide/unhide), the history entry records
 * the score change, recomputed here rather than trusted from the client.
 */
export async function setFindingState(ideaId: string, findingId: string, patch: Partial<FindingState>, summary?: { text: string; kind: "hidden" | "unhidden" }): Promise<Idea> {
  const { sb, user } = await requireUser();
  const data = parse(findingStatePatchSchema, patch);
  const fid = parse(idSchema, findingId);
  const h = summary ? parse(historyInputSchema, { kind: summary.kind, summary: summary.text }) : undefined;
  const { settings } = await getProfile(sb, user);
  return mutateIdea(sb, user.id, parse(idSchema, ideaId), (idea) => {
    const before = h ? serverReport(idea, settings.weights) : null;
    const prev: FindingState = idea.findingState[fid] ?? { pinned: false, hidden: false, note: "" };
    idea.findingState[fid] = { ...prev, ...data };
    if (!h) return;
    return { ...h, ...scoreChange(before, serverReport(idea, settings.weights)) };
  });
}

/** Replaces every idea with the three samples. Chats and settings stay. */
export async function resetDemoData(): Promise<Idea[]> {
  const { sb, user } = await requireUser();
  return replaceWithSeeds(sb, user.id);
}
