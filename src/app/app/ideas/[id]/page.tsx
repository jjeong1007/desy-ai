"use client";
import { ChevronLeft, ClipboardCopy, Download, MoreHorizontal, Pencil, Printer, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/app/app-shell";
import { ResearchPlanner } from "@/components/planner/research-planner";
import { Overview } from "@/components/report/overview";
import { DataSources } from "@/components/sources/data-sources";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlay";
import { PillTabs } from "@/components/ui/tabs";
import { useIdea, useReport } from "@/lib/hooks";
import { reportMarkdown } from "@/lib/markdown";
import { copyText, downloadText, relTime } from "@/lib/utils";
import { startAnalysis } from "@/services/analysis";
import { deleteIdea } from "@/services/ideas";
import { useDesy } from "@/store/desy";

type Tab = "overview" | "sources" | "planner";

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
  const tab: Tab = tabParam === "sources" || tabParam === "planner" ? tabParam : "overview";

  useEffect(() => {
    if (!idea) return;
    if (idea.status === "running") router.replace(`/app/ideas/${idea.id}/run`);
  }, [idea, router]);

  useEffect(() => {
    if (tab !== "overview" || typeof window === "undefined" || !window.location.hash) return;
    const t = setTimeout(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" }), 120);
    return () => clearTimeout(t);
  }, [tab]);

  if (!hydrated) return <PageSkeleton />;
  if (!idea)
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Idea not found</h1>
        <p className="mt-1 text-sm text-ink-2">It may have been deleted.</p>
        <Button asChild className="mt-4"><Link href="/app">Back to dashboard</Link></Button>
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

  const setTab = (t: Tab) => router.replace(`/app/ideas/${idea.id}?tab=${t}`, { scroll: false });
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
  const copyMd = async () => ((await copyText(reportMarkdown(idea, report))) ? toast.success("Report copied as Markdown") : toast.error("Couldn't copy. Use Download instead."));

  return (
    <div className="mx-auto w-full max-w-[1178px] px-4 py-6 md:px-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/app" className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden /> Back to all ideas
        </Link>
        <PillTabs
          idBase="ws"
          label="Idea workspace"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "sources", label: "Data Sources", count: idea.analysis?.findings.length },
            { id: "planner", label: "Research Planner" },
          ]}
        />
      </div>
      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[32px] font-semibold leading-tight">{idea.intake.name}</h1>
          <p className="mt-2 max-w-[70ch] text-sm font-medium text-ink-2">{idea.intake.oneLiner}</p>
          <p className="mt-1 text-xs text-muted">
            {idea.seed ? "Example idea with sample data · " : ""}Last run {relTime(idea.lastRunAt)}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={rerun} disabled={rerunning}><RefreshCw /> {rerunning ? "Starting…" : "Re-run analysis"}</Button>
          <Button size="sm" asChild><Link href={`/app/ideas/new?edit=${idea.id}`}><Pencil /> Edit inputs</Link></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" aria-label="Export and more"><Download /> Export <MoreHorizontal className="ml-0.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => router.push(`/app/ideas/${idea.id}/print?doc=report`)}><Printer /> Print-friendly view</DropdownMenuItem>
              <DropdownMenuItem onSelect={copyMd}><ClipboardCopy /> Copy as Markdown</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { downloadText(`${idea.intake.name.replace(/\W+/g, "-").toLowerCase()}-desy-report.md`, reportMarkdown(idea, report)); toast.success("Markdown downloaded"); }}><Download /> Download .md</DropdownMenuItem>
              <DropdownMenuSeparator />
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
          router.push("/app");
        }}
      />
      <div className="mt-6" role="tabpanel" id={`ws-panel-${tab}`} aria-labelledby={`ws-tab-${tab}`}>
        {tab === "overview" ? <Overview idea={idea} report={report} /> : tab === "sources" ? <DataSources idea={idea} report={report} /> : <ResearchPlanner idea={idea} report={report} />}
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
