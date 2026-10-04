import type { IntakeInput } from "@/types";

/** A blank intake form. */
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
