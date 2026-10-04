import "server-only";
import { z } from "zod";

/** Input validation for server actions. Shapes mirror src/types; text fields get generous caps. */

const text = (max = 4000) => z.string().max(max);
const money = z.number().finite().min(0).max(1e9);

export const id = z.string().min(1).max(100);

export const intakeSchema = z.object({
  name: text(200),
  oneLiner: text(500),
  problem: text(),
  targetCustomer: text(1000),
  currentSolution: text(),
  solution: text(),
  keyFeatures: text(),
  price: money,
  mrrGoal: money,
  timelineMonths: z.number().int().min(0).max(240),
  runningCost: money.nullable(),
  whyNow: text(),
  regulatory: text(),
  skills: text(),
  weeklyHours: z.number().min(0).max(168),
  budget: money,
  buildPath: z.enum(["selfCoded", "aiNoCode", "hiredDeveloper", "notSure"]).nullable(),
  buildBudget: money.nullable(),
  familiarity: z.enum(["iAmOne", "workedWith", "talkedToFew", "outsideView"]).nullable(),
  distributionIdeas: text(),
});

export const intakePatchSchema = intakeSchema.partial();

export const historyInputSchema = z.object({
  kind: z.enum(["created", "run", "pathToMrr", "hidden", "unhidden", "synthesis", "edited", "weights"]),
  summary: text(500),
});

export const findingStatePatchSchema = z.object({
  pinned: z.boolean().optional(),
  hidden: z.boolean().optional(),
  note: text(4000).optional(),
});

export const settingsPatchSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  profile: z.object({ name: text(200), email: text(320), role: text(200) }).optional(),
});

export const interviewNoteSchema = z.object({
  id,
  interviewee: text(200),
  personaId: text(100),
  date: text(40),
  text: text(50_000),
});

/**
 * Research plans are edited freely in the planner and written back whole. Check the top-level shape
 * and size; the nested items are display content owned by the user.
 */
export const planSchema = z
  .object({
    goal: z.enum(["discovery", "pitch"]),
    generatedAt: text(40),
    targets: z.array(z.unknown()),
    personas: z.array(z.unknown()),
    screener: z.array(z.unknown()),
    script: z.array(z.unknown()),
    outreach: text(20_000),
    pitch: z.array(z.unknown()),
    objections: z.array(z.unknown()),
    notes: z.array(z.unknown()),
    synthesis: z.unknown().nullable(),
  })
  .refine((p) => JSON.stringify(p).length < 500_000, "Plan is too large");

export const chatTextSchema = z.string().trim().min(1).max(8000);

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new Error(`Invalid input: ${r.error.issues[0]?.message ?? "unknown"}`);
  return r.data;
}
