import { soloReadingFor } from "@/config/criteria";
import { SCORING_CONFIG } from "@/config/scoring";
import { invoiceIdea } from "@/mock/seeds";
import { computeReport } from "@/services/scoring";
import type { Idea, Report } from "@/types";

/** Seeded strong-pursuit idea used for the public sample report. Deterministic. */
export const SAMPLE_IDEA: Idea = invoiceIdea;

export const SAMPLE_REPORT: Report = computeReport({
  idea: SAMPLE_IDEA,
  weights: SCORING_CONFIG.defaultWeights,
  buildReading: (d) => soloReadingFor(d, SAMPLE_IDEA.intake.buildPath),
})!;
