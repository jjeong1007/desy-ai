/** Ideas service. Async, typed; reads/writes local storage today, an API later. */
import { delay, uid } from "@/lib/utils";
import { mutateDb, readDb, resetDb } from "./storage";
import type { HistoryEntry, Idea, IntakeInput } from "@/types";

export const EMPTY_INTAKE: IntakeInput = {
  name: "",
  oneLiner: "",
  problem: "",
  targetCustomer: "",
  currentSolution: "",
  solution: "",
  keyFeatures: "",
  price: 0,
  mrrGoal: 5000,
  timelineMonths: 12,
  runningCost: null,
  whyNow: "",
  regulatory: "",
  skills: "",
  weeklyHours: 10,
  budget: 1000,
  buildPath: null,
  buildBudget: null,
  familiarity: null,
  distributionIdeas: "",
};

export async function listIdeas(): Promise<Idea[]> {
  await delay(250);
  return readDb().ideas;
}

export async function getIdea(id: string): Promise<Idea | null> {
  await delay(150);
  return readDb().ideas.find((i) => i.id === id) ?? null;
}

export async function saveDraft(id: string | null, intake: IntakeInput, step: number): Promise<Idea> {
  await delay(300);
  const now = new Date().toISOString();
  let saved: Idea | null = null;
  mutateDb((db) => {
    const existing = id ? db.ideas.find((i) => i.id === id) : null;
    if (existing) {
      existing.intake = intake;
      existing.draftStep = step;
      existing.updatedAt = now;
      saved = existing;
    } else {
      const idea: Idea = {
        id: uid("idea"),
        status: "draft",
        createdAt: now,
        updatedAt: now,
        lastRunAt: null,
        intake,
        draftStep: step,
        analysis: null,
        findingState: {},
        adjustments: { criteria: {}, rww: {} },
        run: null,
        history: [{ id: uid("h"), at: now, kind: "created", summary: "Draft created" }],
        plan: null,
      };
      db.ideas.unshift(idea);
      saved = idea;
    }
  });
  return saved!;
}

export async function updateIdea(id: string, fn: (idea: Idea) => void, history?: Omit<HistoryEntry, "id" | "at">): Promise<Idea> {
  await delay(120);
  let out: Idea | null = null;
  mutateDb((db) => {
    const idea = db.ideas.find((i) => i.id === id);
    if (!idea) throw new Error("Idea not found");
    fn(idea);
    idea.updatedAt = new Date().toISOString();
    if (history) idea.history.unshift({ ...history, id: uid("h"), at: idea.updatedAt });
    out = idea;
  });
  return out!;
}

export async function updateIntake(id: string, patch: Partial<IntakeInput>, history?: Omit<HistoryEntry, "id" | "at">): Promise<Idea> {
  return updateIdea(id, (idea) => {
    idea.intake = { ...idea.intake, ...patch };
  }, history);
}

export async function deleteIdea(id: string): Promise<void> {
  await delay(200);
  mutateDb((db) => {
    db.ideas = db.ideas.filter((i) => i.id !== id);
  });
}

/** Create a prefilled draft from an alternative direction. */
export async function createFromAlternative(ideaId: string, altId: string): Promise<Idea> {
  const src = readDb().ideas.find((i) => i.id === ideaId);
  const alt = src?.analysis?.alternatives.find((a) => a.id === altId);
  if (!src || !alt) throw new Error("Alternative not found");
  const intake: IntakeInput = { ...src.intake, ...alt.intakePatch, oneLiner: alt.oneLiner };
  return saveDraft(null, intake, 0);
}

export async function resetDemoData(): Promise<Idea[]> {
  await delay(200);
  return resetDb().ideas;
}
