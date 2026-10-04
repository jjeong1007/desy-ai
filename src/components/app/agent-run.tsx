"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AGENTS, AGENT_NAME } from "@/config/agents";
import { SourceLabel } from "@/components/sources/finding-sheet";
import { PageSkeleton } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { completeAnalysis } from "@/services/analysis";
import { useDesy } from "@/store/desy";
import type { RunAgentPlan } from "@/types";

export type Status = "queued" | "running" | "done" | "failed";

function clock(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function viewOf(agent: RunAgentPlan, elapsed: number): { status: Status; progress: number; logCount: number; findings: number } {
  if (elapsed < agent.startDelayMs) return { status: "queued", progress: 0, logCount: 0, findings: 0 };
  const t = elapsed - agent.startDelayMs;
  if (t >= agent.durationMs) {
    return { status: agent.outcome === "partial" ? "failed" : "done", progress: 100, logCount: agent.logs.length, findings: agent.findings };
  }
  const p = t / agent.durationMs;
  return {
    status: "running",
    progress: Math.round(p * 100),
    logCount: Math.max(1, Math.ceil(p * agent.logs.length)),
    findings: Math.round(p * agent.findings),
  };
}

const STATUS_LABEL: Record<Status, string> = { queued: "Queued", running: "Running", done: "Done", failed: "Partial" };

export function AgentRun() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const idea = useDesy((s) => s.ideas.find((i) => i.id === id) ?? null);
  const hydrated = useDesy((s) => s.hydrated);
  const upsert = useDesy((s) => s.upsertIdea);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const finishing = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const finish = async () => {
    if (!idea || finishing.current) return;
    finishing.current = true;
    try {
      const done = await completeAnalysis(idea.id);
      upsert(done);
      router.push(`/app/ideas/${idea.id}`);
    } catch {
      finishing.current = false;
      setError("The run finished, but the report couldn't be saved.");
      toast.error("Couldn't open the report. Try again.");
    }
  };

  useEffect(() => {
    if (!hydrated || !idea) return;
    if (idea.status === "complete") router.replace(`/app/ideas/${idea.id}`);
    if (idea.status === "draft") router.replace(`/app/ideas/new?draft=${idea.id}`);
  }, [hydrated, idea, router]);

  const plan = idea?.run;
  const elapsed = plan ? now - new Date(plan.startedAt).getTime() : 0;
  const overall = plan ? Math.max(0, Math.min(100, (elapsed / plan.totalMs) * 100)) : 0;
  const views = plan ? plan.agents.map((a) => ({ agent: a, ...viewOf(a, elapsed) })) : [];
  const finished = !!plan && elapsed >= plan.totalMs;

  useEffect(() => {
    if (!finished || finishing.current) return;
    const t = setTimeout(() => { void finish(); }, 900);
    return () => clearTimeout(t);
    // finish closes over the latest idea; re-running when finished flips is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, idea?.id]);

  if (!hydrated) return <PageSkeleton />;
  if (!idea) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Idea not found</h1>
        <Button asChild className="mt-4"><Link href="/app/ideas">Back to ideas</Link></Button>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-xl font-semibold">This run has no plan</h1>
        <p className="mt-1 text-sm text-ink-2">Start the analysis again from the idea.</p>
        <Button asChild className="mt-4" variant="primary"><Link href={`/app/ideas/${idea.id}`}>Back to the idea</Link></Button>
      </div>
    );
  }

  const partial = views.find((v) => v.status === "failed");

  return (
    <div className="mx-auto w-full max-w-[1178px] px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-accent-strong">Research run</p>
          <h1 className="mt-1 text-page-title font-semibold">{idea.intake.name || "Untitled idea"}</h1>
          <p className="mt-1 text-sm text-ink-2">
            Agents work in parallel, then the framework agent scores the findings. About {Math.round(plan.totalMs / 1000)} seconds.
            <span className="tnum ml-2 text-ink">{clock(Math.min(elapsed, plan.totalMs))} / {clock(plan.totalMs)}</span>
          </p>
        </div>
        <Button variant="primary" onClick={() => void finish()} disabled={finishing.current}>
          {finishing.current ? "Opening report…" : "Skip to results"}
        </Button>
      </div>
      <div className="mt-4">
        <Progress value={overall} label="Overall analysis progress" />
      </div>
      {error ? (
        <p role="alert" className="mt-3 rounded border border-weak/40 bg-weak-tint px-3 py-2 text-sm text-weak">{error}</p>
      ) : null}
      {partial ? (
        <p role="status" className="mt-3 rounded border border-lowconf/30 bg-lowconf-tint px-3 py-2 text-sm text-lowconf">
          {AGENT_NAME[partial.agent.id]} returned partial results. Some areas will show Needs evidence.
        </p>
      ) : null}
      <ul className="mt-6 grid gap-3 lg:grid-cols-2">
        {views.map(({ agent, status, progress, logCount, findings }) => {
          const meta = AGENTS.find((a) => a.id === agent.id);
          const logs = agent.logs.slice(0, logCount);
          return (
            <li key={agent.id} className={cn("rounded-lg border bg-canvas p-4", status === "failed" ? "border-lowconf/40" : "border-line")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{meta?.name ?? agent.id}</h2>
                  <p className="mt-0.5 text-xs text-ink-2">{meta?.job}</p>
                </div>
                <StatusBadge status={status} />
              </div>
              {meta && meta.sourceIds.length ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-tertiary">
                  {meta.sourceIds.map((s) => (
                    <SourceLabel key={s} sourceId={s} className="font-normal text-fg-tertiary" />
                  ))}
                </p>
              ) : (
                <p className="mt-2 text-xs text-fg-tertiary">Runs after the research agents</p>
              )}
              <div className="mt-3">
                <Progress value={progress} label={`${meta?.name ?? "Agent"} progress`} tone={status === "failed" ? "weak" : status === "done" ? "strong" : "accent"} />
              </div>
              <p className="tnum mt-2 text-xs text-ink-2">{findings} finding{findings === 1 ? "" : "s"}</p>
              <ol className="mt-3 space-y-1.5" aria-live="polite" aria-relevant="additions">
                {logs.length === 0 ? <li className="text-xs text-fg-tertiary">Waiting…</li> : null}
                {logs.slice(-4).map((line, i) => (
                  <li key={`${agent.id}-${logCount}-${i}`} className="font-mono text-[12px] leading-relaxed text-ink-2">{line}</li>
                ))}
              </ol>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const cls = {
    queued: "bg-surface text-ink-2",
    running: "bg-accent-tint text-accent-strong",
    done: "bg-strong-tint text-strong",
    failed: "bg-lowconf-tint text-lowconf",
  }[status];
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", cls)}>{STATUS_LABEL[status]}</span>;
}
