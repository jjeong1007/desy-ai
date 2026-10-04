import "server-only";
import { soloReadingFor } from "@/config/criteria";
import { computeReport } from "@/services/scoring";
import type { HistoryEntry, Idea, Report } from "@/types";

/** Same report the client renders (see reportFor in src/lib/hooks.ts), computed on the server. */
export function serverReport(idea: Idea, weights: Report["weights"]): Report | null {
  return computeReport({ idea, weights, buildReading: (d) => soloReadingFor(d, idea.intake.buildPath) });
}

/** Score fields for a history entry, from reports before and after a change. Empty when either is missing. */
export function scoreChange(before: Report | null, after: Report | null): Pick<HistoryEntry, "scoreBefore" | "scoreAfter" | "bandBefore" | "bandAfter"> {
  if (!before || !after) return {};
  return { scoreBefore: before.score.overall, scoreAfter: after.score.overall, bandBefore: before.score.band, bandAfter: after.score.band };
}
