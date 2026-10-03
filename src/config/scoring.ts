import type { FilterId } from "@/types";

/**
 * Every threshold, weight and cap rule in Desy's scoring model.
 * None of these come from the course frameworks; they are Desy's initial
 * assumptions and need calibration. Components must read them from here.
 */
export const SCORING_CONFIG = {
  defaultWeights: { customer: 20, economic: 20, competition: 20, channel: 20, timing: 20 } as Record<FilterId, number>,
  bands: { strongMin: 70, promisingMin: 45 },
  knockoutBelow: 40,
  lowConfidenceUnscoredMin: 3,
  /** Filter confidence by number of unscored criteria (of 5). */
  filterConfidence: { highMaxUnscored: 0, mediumMaxUnscored: 2 },
  /** Overall confidence: share of 25 criteria with at least one visible finding, and distinct sources. */
  overallConfidence: {
    high: { minCoverage: 0.85, minSources: 8 },
    medium: { minCoverage: 0.65, minSources: 5 },
  },
  consistency: { realNeedsCustomerAtLeast: 50, winNeedsCompetitionAtLeast: 40 },
  /** A score of 4 needs at least this many independent sources among visible findings. */
  multiSourceForTop: 2,
  derived: {
    /** obtainable customers ÷ customers needed → criterion score */
    sizableRatio: [
      { min: 10, score: 4 },
      { min: 4, score: 3 },
      { min: 2, score: 2 },
      { min: 1, score: 1 },
    ],
    /** gross margin % → criterion score */
    margin: [
      { min: 85, score: 4 },
      { min: 70, score: 3 },
      { min: 50, score: 2 },
      { min: 30, score: 1 },
    ],
    /** CAC payback months → criterion score (lower is better) */
    cacPayback: [
      { max: 3, score: 4 },
      { max: 6, score: 3 },
      { max: 12, score: 2 },
      { max: 24, score: 1 },
    ],
    /** obtainable ÷ needed → "Will it make money?" */
    money: { yesMin: 3, maybeMin: 1 },
  },
} as const;

export const BAND_LABEL = {
  strong: "Strong pursuit",
  promising: "Promising, needs work",
  weak: "Weak pursuit",
} as const;

export const BAND_SHORT = { strong: "Strong", promising: "Promising", weak: "Weak" } as const;
export const BAND_ORDER = { weak: 0, promising: 1, strong: 2 } as const;
