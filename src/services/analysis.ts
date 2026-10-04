/**
 * Analysis service. The server computes the analysis and a replayable run plan (src/engine/analysis.ts);
 * the run view replays it, then calls completeAnalysis.
 */
export { completeAnalysis, startAnalysis } from "@/server/actions/analysis";
