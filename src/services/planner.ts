/**
 * Research Planner service. Plan generation and synthesis run on the server (src/engine/planner.ts),
 * which recomputes the report itself, so callers pass only the idea.
 */
import * as actions from "@/server/actions/planner";
import type { Idea, PlanGoal } from "@/types";

export { deleteNote, saveNote, savePlan } from "@/server/actions/planner";

export const createPlan = (idea: Idea, goal: PlanGoal): Promise<Idea> => actions.createPlan(idea.id, goal);
export const synthesize = (idea: Idea): Promise<Idea> => actions.synthesize(idea.id);
export const applySynthesis = (idea: Idea): Promise<Idea> => actions.applySynthesis(idea.id);
