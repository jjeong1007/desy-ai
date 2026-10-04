"use client";
import { ChevronLeft, FlaskConical, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/app/app-shell";
import { FiltersView, IDEA_TABS, OverviewDashboard, RwwView, type IdeaTab } from "@/components/report/idea-pages";
import { ChannelList, PathToMrr, Recommendations } from "@/components/report/planning";
import { DataSources } from "@/components/sources/data-sources";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlay";
import { PillTabs } from "@/components/ui/tabs";
import { useIdea, useReport } from "@/lib/hooks";
import { relTime } from "@/lib/utils";
import { startAnalysis } from "@/services/analysis";
import { deleteIdea } from "@/services/ideas";
import { useDesy } from "@/store/desy";
import type { FilterId, PillarId } from "@/types";

const TAB_IDS = new Set<string>(IDEA_TABS.map((t) => t.id));

function Workspace() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const idea = useIdea(id);
  const report = useReport(idea);
  const upsert = useDesy((s) => s.upsertIdea);
  const remove = useDesy((s) => s.removeIdea);
  const hydrated = useDesy((s) => s.hydrated);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const tabParam = params.get("tab");
  const tab: IdeaTab = tabParam && TAB_IDS.has(tabParam) ? (tabParam as IdeaTab) : "overview";

  useEffect(() => {
    if (!idea) return;
    if (idea.status === "running") router.replace(`/app/ideas/${idea.id}/run`);
  }, [idea, router]);

  // The planner moved to its own section; keep old links working.
  useEffect(() => {
    if (tabParam === "planner") router.replace(`/app/planner/${id}`);
  }, [tabParam, id, router]);

  if (!hydrated) return <PageSkeleton />;
  if (!idea)
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Idea not found</h1>
        <p className="mt-1 text-sm text-ink-2">It may have been deleted.</p>
        <Button asChild className="mt-4"><Link href="/app/ideas">Back to ideas</Link></Button>
      </div>
    );
  if (idea.status === "draft")
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-xl font-semibold">{idea.intake.name || "Untitled draft"} is still a draft</h1>
        <p className="mt-1 text-sm text-ink-2">Finish the intake to run the analysis and get a Desy Score.</p>
        <Button asChild variant="primary" className="mt-4"><Link href={`/app/ideas/new?draft=${idea.id}`}>Continue intake</Link></Button>
      </div>
    );
  if (!report) return <PageSkeleton />;

  const go = (t: IdeaTab, extra?: Record<string, string>) => {
    const q = new URLSearchParams({ tab: t, ...extra });
    router.replace(`/app/ideas/${idea.id}?${q}`, { scroll: false });
  };
  const filterParam = params.get("filter");
  const pillarParam = params.get("pillar");
  const filter = report.filters.some((f) => f.id === filterParam) ? (filterParam as FilterId) : report.filters[0].id;
  const pillar = report.pillars.some((p) => p.id === pillarParam) ? (pillarParam as PillarId) : report.pillars[0].id;
  const rerun = async () => {
    setRerunning(true);
    try {
      const it = await startAnalysis(idea.id);
      upsert(it);
      router.push(`/app/ideas/${idea.id}/run`);
    } catch {
      toast.error("Couldn't start the analysis. Try again.");
      setRerunning(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1178px] px-4 py-6 md:px-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/ideas" className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden /> Back to all ideas
        </Link>
      </div>
      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-page-title font-semibold">{idea.intake.name}</h1>
          <p className="mt-2 max-w-[70ch] text-sm font-medium text-ink-2">{idea.intake.oneLiner}</p>
          <p className="mt-1 text-xs text-fg-tertiary">
            {idea.seed ? "Example idea with sample data · " : ""}Last run {relTime(idea.lastRunAt)}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={rerun} disabled={rerunning}><RefreshCw /> {rerunning ? "Starting…" : "Re-run analysis"}</Button>
          <Button size="sm" asChild><Link href={`/app/planner/${idea.id}`}><FlaskConical /> Research plan</Link></Button>
          <Button size="sm" asChild><Link href={`/app/ideas/new?edit=${idea.id}`}><Pencil /> Edit inputs</Link></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" aria-label="More actions"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-weak data-[highlighted]:bg-weak-tint data-[highlighted]:text-weak"><Trash2 /> Delete idea</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${idea.intake.name}"?`}
        description="The report, findings, research plan and interview notes are removed. This can't be undone."
        confirmLabel="Delete idea"
        onConfirm={async () => {
          await deleteIdea(idea.id);
          remove(idea.id);
          toast.success("Idea deleted");
          router.push("/app/ideas");
        }}
      />
      <PillTabs
        idBase="ws"
        label="Idea sections"
        value={tab}
        onChange={(t) => go(t)}
        className="no-print -mx-1 mt-6 border-b border-line px-1 pb-2"
        tabs={IDEA_TABS.map((t) => (t.id === "sources" ? { ...t, count: idea.analysis?.findings.length } : t))}
      />
      <div className="mt-6" role="tabpanel" id={`ws-panel-${tab}`} aria-labelledby={`ws-tab-${tab}`}>
        {tab === "overview" ? <OverviewDashboard idea={idea} report={report} go={go} /> : null}
        {tab === "filters" ? <FiltersView idea={idea} report={report} selected={filter} onSelect={(f) => go("filters", { filter: f })} /> : null}
        {tab === "rww" ? <RwwView idea={idea} report={report} selected={pillar} onSelect={(p) => go("rww", { pillar: p })} /> : null}
        {tab === "mrr" ? (
          <div className="space-y-3">
            <p className="max-w-[72ch] text-[13px] text-ink-2">How many paying customers you need at your price, compared with the obtainable market. Adjust price or goal and the whole report recalculates.</p>
            <PathToMrr idea={idea} report={report} />
          </div>
        ) : null}
        {tab === "channels" ? (
          <div className="space-y-3">
            <p className="max-w-[72ch] text-[13px] text-ink-2">Distribution channels ranked by fit. This is the evidence behind the Channel filter.</p>
            <ChannelList idea={idea} />
          </div>
        ) : null}
        {tab === "next" ? <Recommendations idea={idea} report={report} /> : null}
        {tab === "sources" ? <DataSources idea={idea} report={report} /> : null}
      </div>
    </div>
  );
}

export default function IdeaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Workspace />
    </Suspense>
  );
}
