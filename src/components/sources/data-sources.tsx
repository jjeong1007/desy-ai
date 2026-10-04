"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Blocks, Database, EyeOff, Eye, ExternalLink, GitBranch, LayoutList, MessagesSquare, Mic, Newspaper, Pin, PinOff, Search, StickyNote, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AGENTS, AGENT_NAME } from "@/config/agents";
import { CRITERIA, FILTERS, FILTER_SHORT, PILLAR_BY_ID, RWW_QUESTIONS } from "@/config/criteria";
import { BAND_SHORT } from "@/config/scoring";
import { getSource } from "@/config/sources";
import { AnswerPill, BandBadge, ConfidenceText, CriterionDots, SentimentTag } from "@/components/report/markers";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Dialog, DialogClose, DialogContent, SheetContent } from "@/components/ui/overlay";
import { Segmented } from "@/components/ui/tabs";
import { useWeights } from "@/lib/hooks";
import { cn, fmtDate } from "@/lib/utils";
import { EMPTY_QUERY, FINDING_TYPE_LABEL, previewHide, queryFindings, setFindingState, usedIn, type FindingQuery } from "@/services/sources";
import { useDesy } from "@/store/desy";
import type { Finding, FindingType, Idea, Report, SourceCategory } from "@/types";
import { Artifacts } from "./artifacts";

const CAT_ICON: Record<SourceCategory, typeof Search> = {
  "Community forums": MessagesSquare,
  "Open-source repositories": GitBranch,
  "Product directories and review sites": LayoutList,
  "Search-trend data": TrendingUp,
  "Startup and funding news": Newspaper,
  "Licensed market databases": Database,
  "Builder platforms": Blocks,
  "Founder research": Mic,
};

export function SourceLabel({ sourceId, className }: { sourceId: string; className?: string }) {
  const s = getSource(sourceId);
  const Icon = CAT_ICON[s.category] ?? Search;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-ink-2", className)}>
      <Icon className="size-3.5 text-fg-tertiary" aria-hidden />
      {s.name}
    </span>
  );
}

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
  const open = findings.find((f) => f.id === openId) ?? null;

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
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
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
              <Select aria-label="Filter" value={q.filter} onChange={(e) => setQ({ ...q, filter: e.target.value as FindingQuery["filter"], criterionId: "all" })}>
                <option value="all">All filters</option>
                {FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>{f.short}</option>
                ))}
              </Select>
              <Select aria-label="Criterion" value={q.criterionId} onChange={(e) => setQ({ ...q, criterionId: e.target.value })}>
                <option value="all">All criteria</option>
                {FILTERS.filter((f) => q.filter === "all" || f.id === q.filter).map((f) => (
                  <optgroup key={f.id} label={f.short}>
                    {CRITERIA.filter((c) => c.filter === f.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <Select aria-label="RWW question" value={q.rwwId} onChange={(e) => setQ({ ...q, rwwId: e.target.value })}>
                <option value="all">All RWW questions</option>
                {(["real", "win", "worthIt"] as const).map((p) => (
                  <optgroup key={p} label={PILLAR_BY_ID[p].label}>
                    {RWW_QUESTIONS.filter((x) => x.pillar === p).map((x) => (
                      <option key={x.id} value={x.id}>{x.text.split(" (")[0]}</option>
                    ))}
                  </optgroup>
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

      <DialogPrimitive.Root open={!!open} onOpenChange={(o) => !o && closeDrawer()}>
        {open ? (
          <SheetContent title={open.title} description="Finding detail">
            <FindingDetail f={open} idea={idea} />
          </SheetContent>
        ) : null}
      </DialogPrimitive.Root>
    </div>
  );
}

function FindingRow({ f, idea, onOpen }: { f: Finding; idea: Idea; onOpen: () => void }) {
  const st = idea.findingState[f.id];
  return (
    <li className={cn(st?.hidden && "bg-surface/60")}>
      <button type="button" onClick={onOpen} className="block w-full px-4 py-3.5 text-left hover:bg-surface">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
          Confidence <ConfidenceText c={f.confidence} /> · cited by {f.criterionIds.length + f.rwwIds.length} score item{f.criterionIds.length + f.rwwIds.length === 1 ? "" : "s"}
        </p>
      </button>
    </li>
  );
}

function FindingDetail({ f, idea }: { f: Finding; idea: Idea }) {
  const upsert = useDesy((s) => s.upsertIdea);
  const weights = useWeights();
  const st = idea.findingState[f.id] ?? { pinned: false, hidden: false, note: "" };
  const [note, setNote] = useState(st.note);
  const [preview, setPreview] = useState(false);
  const used = usedIn(f, idea);
  useEffect(() => setNote(idea.findingState[f.id]?.note ?? ""), [f.id, idea.findingState]);

  const pin = async () => {
    upsert(await setFindingState(idea.id, f.id, { pinned: !st.pinned }));
    toast.success(st.pinned ? "Unpinned" : "Pinned to the top");
  };
  const saveNote = async () => {
    upsert(await setFindingState(idea.id, f.id, { note }));
    toast.success("Note saved");
  };

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <SourceLabel sourceId={f.sourceId} />
        <span className="text-xs text-fg-tertiary">{FINDING_TYPE_LABEL[f.type]}</span>
        <span className="text-xs text-fg-tertiary">Found by {AGENT_NAME[f.agentId]}</span>
        <SentimentTag s={f.sentiment} />
      </div>
      <div>
        <p className="text-[15px] font-semibold leading-snug">{f.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink">{f.summary}</p>
        {f.excerpt ? <blockquote className="mt-3 border-l-2 border-accent/50 pl-3 text-sm italic leading-relaxed text-ink-2">&ldquo;{f.excerpt}&rdquo;</blockquote> : null}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-[13px]">
        <div><dt className="text-xs text-fg-tertiary">Retrieved</dt><dd>{fmtDate(f.retrievedAt)}</dd></div>
        <div><dt className="text-xs text-fg-tertiary">Confidence</dt><dd><ConfidenceText c={f.confidence} /></dd></div>
        <div className="col-span-2"><dt className="text-xs text-fg-tertiary">Link (mock URL)</dt><dd><a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-accent-strong hover:underline">{f.url}<ExternalLink className="size-3 shrink-0" aria-hidden /></a></dd></div>
      </dl>

      <div>
        <p className="text-sm font-semibold">Used in</p>
        {used.criteria.length + used.rww.length === 0 ? <p className="mt-1 text-[13px] text-ink-2">Not cited by any criterion or RWW answer. Hiding it won&apos;t change the score.</p> : null}
        {used.criteria.length ? (
          <ul className="mt-2 space-y-1">
            {used.criteria.map((c) => (
              <li key={c.id}>
                <Link href={`/app/ideas/${idea.id}?tab=overview#filter-${CRITERIA.find((x) => x.id === c.id)?.filter}`} className="text-[13px] text-ink hover:underline">
                  <span className="text-fg-tertiary">{c.filter} criterion: </span>{c.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {used.rww.length ? (
          <ul className="mt-2 space-y-1">
            {used.rww.map((r) => (
              <li key={r.id} className="text-[13px]"><span className="text-fg-tertiary">{r.pillar}: </span>{r.text}</li>
            ))}
          </ul>
        ) : null}
        {used.sections.length ? <p className="mt-2 text-xs text-ink-2">Report sections: {used.sections.join(", ")}</p> : null}
      </div>

      <div>
        <label htmlFor="finding-note" className="text-sm font-semibold">Your note</label>
        <Textarea id="finding-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this matters, or what to check" className="mt-1.5" />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={saveNote} disabled={note === st.note}>Save note</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button size="sm" onClick={pin}>{st.pinned ? <><PinOff /> Unpin</> : <><Pin /> Pin</>}</Button>
        <Button size="sm" variant={st.hidden ? "secondary" : "ghost"} onClick={() => setPreview(true)}>
          {st.hidden ? <><Eye /> Unhide and re-score</> : <><EyeOff /> Hide from scoring</>}
        </Button>
      </div>
      <HidePreview open={preview} onOpenChange={setPreview} idea={idea} finding={f} hide={!st.hidden} weights={weights} />
    </div>
  );
}

function HidePreview({ open, onOpenChange, idea, finding, hide, weights }: { open: boolean; onOpenChange: (v: boolean) => void; idea: Idea; finding: Finding; hide: boolean; weights: Report["weights"] }) {
  const upsert = useDesy((s) => s.upsertIdea);
  const pv = open ? previewHide(idea, finding.id, { weights }, hide) : null;
  const d = pv?.diff;
  const confirm = async () => {
    if (!pv) return;
    const saved = await setFindingState(idea.id, finding.id, { hidden: hide }, { kind: hide ? "hidden" : "unhidden", text: `${hide ? "Hid" : "Unhid"} finding: ${finding.title}`, scoreBefore: pv.before.score.overall, scoreAfter: pv.after.score.overall, bandBefore: pv.before.score.band, bandAfter: pv.after.score.band });
    upsert(saved);
    onOpenChange(false);
    toast.success(hide ? "Finding hidden and report re-scored" : "Finding restored and report re-scored", { description: d?.changed ? `Desy Score ${pv.before.score.overall} → ${pv.after.score.overall}` : "No scores changed." });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={hide ? "Hide this finding?" : "Restore this finding?"} description={hide ? "Hidden findings are excluded from scoring. Here's what would change:" : "Restoring includes it in scoring again. Here's what would change:"} wide>
        {!d ? null : !d.changed ? (
          <p className="rounded bg-surface p-3 text-sm text-ink-2">No scores change. Either nothing cites this finding, or other evidence still supports those items.</p>
        ) : (
          <div className="space-y-4 text-[13px]">
            <div className="flex flex-wrap items-center gap-4 rounded bg-surface p-3">
              <div>
                <p className="text-xs text-fg-tertiary">Desy Score</p>
                <p className="tnum text-xl font-medium">{d.score.before} → {d.score.after}</p>
              </div>
              <div>
                <p className="text-xs text-fg-tertiary">Pursuit band</p>
                <p className="flex items-center gap-1.5"><BandBadge band={d.band.before} size="sm" /> → <BandBadge band={d.band.after} size="sm" capped={pv!.after.score.band !== pv!.after.score.uncappedBand} /></p>
              </div>
            </div>
            {d.criteria.length ? (
              <DiffBlock title="Criteria">
                {d.criteria.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2"><span>{c.label}</span><span className="flex items-center gap-2"><CriterionDots score={c.before} /> → <CriterionDots score={c.after} /></span></li>)}
              </DiffBlock>
            ) : null}
            {d.filters.length ? (
              <DiffBlock title="Filters">
                {d.filters.map((f) => <li key={f.id} className="flex justify-between gap-2"><span>{FILTER_SHORT[f.id]}</span><span className="tnum">{f.before ?? "—"} → {f.after ?? "—"}{f.confBefore !== f.confAfter ? `, confidence ${f.confBefore} → ${f.confAfter}` : ""}</span></li>)}
              </DiffBlock>
            ) : null}
            {d.rww.length || d.pillars.length ? (
              <DiffBlock title="Real / Win / Worth It">
                {d.rww.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2"><span>{r.text.split(" (")[0]}</span><span className="flex items-center gap-1.5"><AnswerPill answer={r.before} /> → <AnswerPill answer={r.after} /></span></li>)}
                {d.pillars.map((p) => <li key={p.id} className="flex justify-between gap-2 font-medium"><span>{PILLAR_BY_ID[p.id].label} net answer</span><span>{p.before} → {p.after}</span></li>)}
              </DiffBlock>
            ) : null}
            {d.caps.before.join() !== d.caps.after.join() ? (
              <DiffBlock title="Band caps">
                <li className="text-ink-2">Before: {d.caps.before.length ? d.caps.before.join(" ") : "none"}</li>
                <li>After: {d.caps.after.length ? d.caps.after.join(" ") : "none"}</li>
              </DiffBlock>
            ) : null}
            <p className="text-xs text-fg-tertiary">Band labels: {BAND_SHORT[d.band.before]} before, {BAND_SHORT[d.band.after]} after.</p>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild><Button>Cancel</Button></DialogClose>
          <Button variant="primary" onClick={confirm}>{hide ? "Hide finding" : "Restore finding"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiffBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-ink">{title}</p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}
