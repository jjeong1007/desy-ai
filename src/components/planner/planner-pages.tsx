"use client";
import { ArrowUpRight, ChevronLeft, FileText, FlaskConical, MessagesSquare, Presentation } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageSkeleton } from "@/components/app/app-shell";
import { BandBadge } from "@/components/report/markers";
import { Button } from "@/components/ui/button";
import { reportFor, useIdea, useReport, useWeights } from "@/lib/hooks";
import { relTime } from "@/lib/utils";
import { useDesy } from "@/store/desy";
import type { Idea } from "@/types";
import { ResearchPlanner } from "./research-planner";

function planStatus(idea: Idea) {
  const plan = idea.plan;
  if (!plan) return { label: "No plan yet", icon: FlaskConical };
  const notes = plan.notes.length;
  const kind = plan.goal === "discovery" ? "Discovery plan" : "Pitch plan";
  return { label: `${kind}${notes ? ` · ${notes} interview${notes === 1 ? "" : "s"} logged` : ""}`, icon: plan.goal === "discovery" ? MessagesSquare : Presentation };
}

/** Research Planner landing: pick which idea to plan research for. */
export function PlannerIndex() {
  const hydrated = useDesy((s) => s.hydrated);
  const ideas = useDesy((s) => s.ideas);
  const weights = useWeights();
  const scored = useMemo(() => ideas.filter((i) => i.status === "complete").map((idea) => ({ idea, report: reportFor(idea, weights) })), [ideas, weights]);
  const unscored = ideas.length - scored.length;

  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1178px] px-4 py-6 md:px-6">
      <h1 className="text-page-title font-semibold">Research Planner</h1>
      <p className="mt-2 max-w-[68ch] text-sm font-medium text-ink-2">
        Turn an idea&apos;s riskiest assumptions into a customer discovery script or a pitch. Interview notes you log come back as evidence and update the score. Choose an idea to start.
      </p>

      {scored.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-line-strong p-8 text-center">
          <p className="text-sm font-medium">No scored ideas yet</p>
          <p className="mt-1 text-[13px] text-ink-2">The planner works from a Desy Score, so run an analysis first.</p>
          <Button asChild variant="primary" size="sm" className="mt-4">
            <Link href="/app/ideas/new">Validate an idea</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {scored.map(({ idea, report }) => {
            const st = planStatus(idea);
            return (
              <li key={idea.id}>
                <Link href={`/app/planner/${idea.id}`} className="flex h-full flex-col gap-3 rounded-lg border border-line bg-canvas p-4 transition-colors hover:border-line-strong hover:bg-surface">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-ink">{idea.intake.name}</span>
                      <span className="mt-1 line-clamp-2 block text-[13px] text-ink-2">{idea.intake.oneLiner}</span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
                  </span>
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                      <st.icon className="size-3.5" aria-hidden />
                      {st.label}
                    </span>
                    {report ? (
                      <span className="flex items-center gap-2">
                        <span className="tnum text-sm font-semibold text-ink">{report.score.overall}</span>
                        <BandBadge band={report.score.band} score={report.score} size="sm" />
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {unscored > 0 && scored.length > 0 ? (
        <p className="mt-4 text-xs text-ink-2">
          {unscored} draft or running idea{unscored === 1 ? " isn't" : "s aren't"} shown. Finish the analysis to plan research for {unscored === 1 ? "it" : "them"}.
        </p>
      ) : null}
    </div>
  );
}

/** The research plan for one idea. */
export function PlannerForIdea({ id }: { id: string }) {
  const hydrated = useDesy((s) => s.hydrated);
  const idea = useIdea(id);
  const report = useReport(idea);
  if (!hydrated) return <PageSkeleton />;
  if (!idea || idea.status !== "complete")
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-xl font-semibold">{idea ? `${idea.intake.name || "This idea"} isn't scored yet` : "Idea not found"}</h1>
        <p className="mt-1 text-sm text-ink-2">{idea ? "Finish the analysis first. The plan is built from the score." : "It may have been deleted."}</p>
        <Button asChild className="mt-4">
          <Link href="/app/planner">Choose another idea</Link>
        </Button>
      </div>
    );
  if (!report) return <PageSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1178px] px-4 py-6 md:px-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/planner" className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden /> All ideas
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" asChild>
            <Link href={`/app/ideas/${idea.id}`}>
              <FileText /> View report
            </Link>
          </Button>
        </div>
      </div>
      <header className="mt-4">
        <h1 className="text-page-title font-semibold">{idea.intake.name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-ink-2">
          <span className="tnum text-ink">Desy Score {report.score.overall}</span>
          <BandBadge band={report.score.band} score={report.score} size="sm" />
          <span className="text-xs text-fg-tertiary">Last run {relTime(idea.lastRunAt)}</span>
        </p>
      </header>
      <div className="mt-6">
        <ResearchPlanner idea={idea} report={report} />
      </div>
    </div>
  );
}
