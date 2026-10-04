"use client";
import { ArrowDownRight, ArrowUpRight, Check, CircleHelp, Gauge, HelpCircle, Lock, Minus, OctagonX, TrendingDown, TrendingUp, X } from "lucide-react";
import { BAND_LABEL, BAND_SHORT } from "@/config/scoring";
import { cn } from "@/lib/utils";
import { RichTip } from "@/components/ui/overlay";
import { FILTER_SHORT } from "@/config/criteria";
import type { Confidence, PursuitBand, RwwAnswer, RwwNet, ScoreResult, Sentiment } from "@/types";

// Every semantic color is paired with an icon and a text label.

export const BAND_STYLE: Record<PursuitBand, { text: string; bg: string; bar: string; Icon: typeof TrendingUp }> = {
  strong: { text: "text-strong", bg: "bg-strong-tint", bar: "bg-strong", Icon: TrendingUp },
  promising: { text: "text-promising", bg: "bg-promising-tint", bar: "bg-promising", Icon: Minus },
  weak: { text: "text-weak", bg: "bg-weak-tint", bar: "bg-weak", Icon: TrendingDown },
};

export function BandBadge({ band, capped, score, size = "md", full }: { band: PursuitBand; capped?: boolean; score?: ScoreResult; size?: "sm" | "md"; full?: boolean }) {
  const s = BAND_STYLE[band];
  const isCapped = capped ?? (score ? score.band !== score.uncappedBand : false);
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-flex items-center gap-1 rounded font-medium", s.bg, s.text, size === "sm" ? "px-1.5 py-0.5 text-xs [&_svg]:size-3" : "px-2 py-1 text-[13px] [&_svg]:size-3.5")}>
        <s.Icon aria-hidden />
        {full ? BAND_LABEL[band] : BAND_SHORT[band]}
      </span>
      {isCapped ? <CappedMarker size={size} score={score} /> : null}
    </span>
  );
}

/** Pairs each applied cap with what it takes to lift it. Order matches score.capReasons. */
function capGuidance(score: ScoreResult): { reason: string; fix: string }[] {
  return score.capReasons.map((reason) => {
    if (reason.includes("= No:")) return { reason, fix: "Resolve the failing question: add evidence that answers it, or change the idea so the answer becomes Yes or Maybe." };
    if (reason.startsWith("Not enough evidence in ")) {
      const id = score.lowConfidenceFilters.find((f) => reason.includes(FILTER_SHORT[f]));
      return { reason, fix: `Add more sources for ${id ? FILTER_SHORT[id] : "that area"}, or re-run the agent that came back partial.` };
    }
    if (reason.includes("scored too low")) {
      const id = score.knockoutFilters.find((f) => reason.startsWith(FILTER_SHORT[f]));
      return { reason, fix: `Raise ${id ? FILTER_SHORT[id] : "that score"} by reworking the idea or finding evidence that changes it. Until then it can't rate as Strong.` };
    }
    return { reason, fix: "Address this gate to lift the cap." };
  });
}

export function CappedMarker({ size = "md", score }: { size?: "sm" | "md"; score?: ScoreResult }) {
  const marker = (
    <span
      tabIndex={score ? 0 : undefined}
      className={cn("inline-flex items-center gap-1 rounded border border-dashed border-capped/60 font-medium text-capped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus", score && "cursor-help", size === "sm" ? "px-1.5 py-[1px] text-xs [&_svg]:size-3" : "px-2 py-[3px] text-[13px] [&_svg]:size-3.5")}
    >
      <Lock aria-hidden />
      Capped
    </span>
  );
  if (!score) return marker;
  const items = capGuidance(score);
  return (
    <RichTip
      content={
        <div className="space-y-2.5">
          <p className="font-medium">
            Score alone: {BAND_LABEL[score.uncappedBand]}. Held to {BAND_LABEL[score.band]}.
          </p>
          {items.length ? (
            <ul className="space-y-2.5">
              {items.map((i) => (
                <li key={i.reason} className="space-y-0.5">
                  <p className="text-fg-secondary">
                    <span className="font-medium text-fg">Why: </span>
                    {i.reason}
                  </p>
                  <p className="text-fg-secondary">
                    <span className="font-medium text-fg">To resolve: </span>
                    {i.fix}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-fg-tertiary">Caps change the band, never the score.</p>
        </div>
      }
    >
      {marker}
    </RichTip>
  );
}

const NET: Record<RwwNet, { label: string; cls: string; Icon: typeof Check }> = {
  yes: { label: "Yes", cls: "bg-strong-tint text-strong", Icon: Check },
  probably: { label: "Probably", cls: "bg-promising-tint text-promising", Icon: HelpCircle },
  no: { label: "No", cls: "bg-weak-tint text-weak", Icon: X },
};
const ANS: Record<RwwAnswer, { label: string; cls: string; Icon: typeof Check }> = {
  yes: { label: "Yes", cls: "bg-strong-tint text-strong", Icon: Check },
  maybe: { label: "Maybe", cls: "bg-promising-tint text-promising", Icon: HelpCircle },
  no: { label: "No", cls: "bg-weak-tint text-weak", Icon: X },
};

export function NetPill({ net, size = "md" }: { net: RwwNet; size?: "sm" | "md" }) {
  const n = NET[net];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded font-medium", n.cls, size === "sm" ? "px-1.5 py-0.5 text-xs [&_svg]:size-3" : "px-2 py-0.5 text-[13px] [&_svg]:size-3.5")}>
      <n.Icon aria-hidden />
      {n.label}
    </span>
  );
}

export function AnswerPill({ answer }: { answer: RwwAnswer | null }) {
  if (!answer)
    return (
      <span className="inline-flex items-center gap-1 rounded border border-dashed border-line-strong px-1.5 py-0.5 text-xs font-medium text-fg-tertiary [&_svg]:size-3">
        <CircleHelp aria-hidden />
        Unanswered
      </span>
    );
  const a = ANS[answer];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium [&_svg]:size-3", a.cls)}>
      <a.Icon aria-hidden />
      {a.label}
    </span>
  );
}

export function NeedsEvidence({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border border-dashed border-line-strong bg-canvas px-1.5 py-0.5 text-xs font-medium text-ink-2 [&_svg]:size-3", className)}>
      <CircleHelp aria-hidden />
      Needs evidence
    </span>
  );
}

export function LowConfidence({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded bg-lowconf-tint px-1.5 py-0.5 text-xs font-medium text-lowconf [&_svg]:size-3", className)}>
      <Gauge aria-hidden />
      Low confidence
    </span>
  );
}

export function Knockout({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded bg-weak-tint px-1.5 py-0.5 text-xs font-medium text-weak [&_svg]:size-3", className)}>
      <OctagonX aria-hidden />
      Knockout
    </span>
  );
}

export function ConfidenceText({ c }: { c: Confidence }) {
  return <span className={cn("font-medium", c === "low" ? "text-lowconf" : "text-ink")}>{c === "high" ? "High" : c === "medium" ? "Medium" : "Low"}</span>;
}

export function SentimentTag({ s }: { s: Sentiment }) {
  if (s === "neutral") return <span className="inline-flex items-center gap-1 text-xs text-fg-tertiary">Neutral</span>;
  return s === "supports" ? (
    <span className="inline-flex items-center gap-0.5 rounded bg-strong-tint px-1.5 py-0.5 text-xs font-medium text-strong [&_svg]:size-3">
      <ArrowUpRight aria-hidden />
      Supports
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 rounded bg-weak-tint px-1.5 py-0.5 text-xs font-medium text-weak [&_svg]:size-3">
      <ArrowDownRight aria-hidden />
      Weakens
    </span>
  );
}

export function CriterionDots({ score }: { score: number | null }) {
  if (score == null) return <NeedsEvidence />;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Score ${score} of 4`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={cn("h-2.5 w-2 rounded-[1px]", n <= score ? (score <= 1 ? "bg-weak" : score === 2 ? "bg-promising" : "bg-strong") : "bg-surface-2")} />
        ))}
      </span>
      <span className="tnum text-xs font-medium text-ink">{score}/4</span>
    </span>
  );
}
