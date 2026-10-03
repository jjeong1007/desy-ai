"use client";
import { useMemo } from "react";
import { soloReadingFor } from "@/config/criteria";
import { SCORING_CONFIG } from "@/config/scoring";
import { computeReport } from "@/services/scoring";
import { useDesy } from "@/store/desy";
import type { Idea, Report } from "@/types";

export function useWeights() {
  return useDesy((s) => s.settings?.weights) ?? SCORING_CONFIG.defaultWeights;
}

export function reportFor(idea: Idea | null | undefined, weights: Report["weights"]): Report | null {
  if (!idea) return null;
  return computeReport({ idea, weights, buildReading: (d) => soloReadingFor(d, idea.intake.buildPath) });
}

export function useReport(idea: Idea | null | undefined): Report | null {
  const weights = useWeights();
  return useMemo(() => reportFor(idea, weights), [idea, weights]);
}

export function useIdea(id: string | undefined): Idea | null {
  return useDesy((s) => (id ? s.ideas.find((i) => i.id === id) ?? null : null));
}
