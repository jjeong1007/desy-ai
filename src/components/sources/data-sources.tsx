"use client";
import { EyeOff, Pin, Search, StickyNote, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AGENTS } from "@/config/agents";
import { FILTERS, PILLARS } from "@/config/criteria";
import { getSource } from "@/config/sources";
import { ConfidenceText, SentimentTag } from "@/components/report/markers";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/tabs";
import { cn, fmtDate } from "@/lib/utils";
import { EMPTY_QUERY, FINDING_TYPE_LABEL, queryFindings, type FindingQuery } from "@/services/sources";
import type { Finding, FindingType, Idea, Report } from "@/types";
import { Artifacts } from "./artifacts";
import { FindingSheet, SourceLabel, findingNumber } from "./finding-sheet";

export { SourceLabel } from "./finding-sheet";

export function DataSources({ idea, report }: { idea: Idea; report: Report }) {
  const params = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<"findings" | "artifacts">("findings");
  const [q, setQ] = useState<FindingQuery>(EMPTY_QUERY);
  const findingParam = params.get("finding");
  const [openId, setOpenId] = useState<string | null>(findingParam);
  useEffect(() => {
    if (findingParam) {
      setOpenId(findingParam);
      setView("findings");
    }
  }, [findingParam]);

  const findings = useMemo(() => idea.analysis?.findings ?? [], [idea.analysis]);
  const results = useMemo(() => queryFindings(findings, idea.findingState, q), [findings, idea.findingState, q]);
  const sources = Array.from(new Set(findings.map((f) => f.sourceId)));
  const types = Array.from(new Set(findings.map((f) => f.type)));
  const hiddenCount = findings.filter((f) => idea.findingState[f.id]?.hidden).length;
  const pinnedCount = findings.filter((f) => idea.findingState[f.id]?.pinned).length;
  const dirty = JSON.stringify(q) !== JSON.stringify(EMPTY_QUERY);

  const closeDrawer = () => {
    setOpenId(null);
    if (findingParam) router.replace(`/app/ideas/${idea.id}?tab=sources`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Data Sources</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {findings.length} findings from {sources.length} sources{pinnedCount ? `, ${pinnedCount} pinned` : ""}{hiddenCount ? `, ${hiddenCount} hidden from scoring` : ""}. Source names are labels for a simulated demo.
          </p>
        </div>
        <Segmented label="Data Sources view" value={view} onChange={setView} options={[{ id: "findings", label: `Findings (${findings.length})` }, { id: "artifacts", label: "Artifacts (5)" }]} />
      </div>

      {view === "artifacts" ? (
        <Artifacts idea={idea} report={report} />
      ) : (
        <>
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary" aria-hidden />
                <Input value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value })} placeholder="Search findings, excerpts and notes" aria-label="Search findings" className="pl-8" />
              </div>
              <Select aria-label="Show" value={q.show} onChange={(e) => setQ({ ...q, show: e.target.value as FindingQuery["show"] })}>
                <option value="visible">Visible</option>
                <option value="pinned">Pinned</option>
                <option value="hidden">Hidden</option>
                <option value="all">All</option>
              </Select>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
              <Select aria-label="Source" value={q.sourceId} onChange={(e) => setQ({ ...q, sourceId: e.target.value })}>
                <option value="all">All sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{getSource(s).name}</option>
                ))}
              </Select>
              <Select aria-label="Agent" value={q.agentId} onChange={(e) => setQ({ ...q, agentId: e.target.value as FindingQuery["agentId"] })}>
                <option value="all">All agents</option>
                {AGENTS.filter((a) => a.id !== "framework" || findings.some((f) => f.agentId === "framework")).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
              <Select aria-label="Finding type" value={q.type} onChange={(e) => setQ({ ...q, type: e.target.value as FindingType | "all" })}>
                <option value="all">All types</option>
                {types.map((t) => (
                  <option key={t} value={t}>{FINDING_TYPE_LABEL[t]}</option>
                ))}
              </Select>
              <Select aria-label="Filter" value={q.filter} onChange={(e) => setQ({ ...q, filter: e.target.value as FindingQuery["filter"] })}>
                <option value="all">All filters</option>
                {FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>{f.short}</option>
                ))}
              </Select>
              <Select aria-label="Opportunity Assessment" value={q.pillar} onChange={(e) => setQ({ ...q, pillar: e.target.value as FindingQuery["pillar"] })}>
                <option value="all">Real, Win and Worth It</option>
                {PILLARS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </Select>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-ink-2">
              <span role="status" aria-live="polite">{results.length} of {findings.length} findings</span>
              {dirty ? (
                <button type="button" onClick={() => setQ(EMPTY_QUERY)} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium hover:bg-canvas">
                  <X className="size-3" aria-hidden /> Clear filters
                </button>
              ) : null}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line-strong p-10 text-center">
              <p className="text-sm font-medium">No findings match these filters</p>
              <p className="mt-1 text-[13px] text-ink-2">{q.show === "hidden" ? "You haven't hidden any findings." : q.show === "pinned" ? "Pin findings to keep them at the top." : "Try a broader search or clear the filters."}</p>
              {dirty ? <Button size="sm" className="mt-3" onClick={() => setQ(EMPTY_QUERY)}>Clear filters</Button> : null}
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-canvas">
              {results.map((f) => (
                <FindingRow key={f.id} f={f} idea={idea} onOpen={() => setOpenId(f.id)} />
              ))}
            </ul>
          )}
        </>
      )}

      <FindingSheet idea={idea} findingId={openId} onClose={closeDrawer} />
    </div>
  );
}

function FindingRow({ f, idea, onOpen }: { f: Finding; idea: Idea; onOpen: () => void }) {
  const st = idea.findingState[f.id];
  return (
    <li className={cn(st?.hidden && "bg-surface/60")}>
      <button type="button" onClick={onOpen} className="block w-full px-4 py-3.5 text-left hover:bg-surface">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="tnum inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-surface-2 px-1 text-[11px] font-semibold text-ink-2">{findingNumber(idea, f.id)}</span>
          <SourceLabel sourceId={f.sourceId} />
          <span className="text-xs text-fg-tertiary">{FINDING_TYPE_LABEL[f.type]}</span>
          <span className="text-xs text-fg-tertiary">{fmtDate(f.retrievedAt, { month: "short", day: "numeric" })}</span>
          <span className="ml-auto flex items-center gap-2">
            {st?.pinned ? <Pin className="size-3.5 text-accent-strong" aria-label="Pinned" /> : null}
            {st?.note ? <StickyNote className="size-3.5 text-fg-tertiary" aria-label="Has a note" /> : null}
            {st?.hidden ? <span className="inline-flex items-center gap-1 text-xs text-fg-tertiary"><EyeOff className="size-3.5" aria-hidden />Hidden</span> : null}
            <SentimentTag s={f.sentiment} />
          </span>
        </div>
        <p className={cn("mt-1.5 text-sm font-medium text-ink", st?.hidden && "line-through decoration-muted")}>{f.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-2">{f.summary}</p>
        {f.excerpt ? <p className="mt-1.5 line-clamp-1 border-l-2 border-line pl-2 text-[13px] italic text-ink-2">&ldquo;{f.excerpt}&rdquo;</p> : null}
        <p className="mt-1.5 text-xs text-fg-tertiary">
          Confidence <ConfidenceText c={f.confidence} />
        </p>
      </button>
    </li>
  );
}
