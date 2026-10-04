"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Blocks, Database, EyeOff, Eye, ExternalLink, GitBranch, LayoutList, MessagesSquare, Mic, Newspaper, Pin, PinOff, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AGENT_NAME } from "@/config/agents";
import { CRITERION_BY_ID, FILTER_SHORT, PILLAR_BY_ID, RWW_BY_ID } from "@/config/criteria";
import { BAND_SHORT } from "@/config/scoring";
import { getSource } from "@/config/sources";
import { BandBadge, ConfidenceText, SentimentTag } from "@/components/report/markers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Dialog, DialogClose, DialogContent, SheetContent } from "@/components/ui/overlay";
import { useWeights } from "@/lib/hooks";
import { cn, fmtDate } from "@/lib/utils";
import { FINDING_TYPE_LABEL, previewHide, setFindingState, usedIn } from "@/services/sources";
import { useDesy } from "@/store/desy";
import type { FilterId, Finding, Idea, PillarId, Report, SourceCategory } from "@/types";

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
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-ink-2", className)}>
      {s.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logo} alt="" aria-hidden className={cn("size-4 shrink-0 object-contain", s.logoMono && "dark:invert")} />
      ) : (
        <Icon className="size-3.5 text-fg-tertiary" aria-hidden />
      )}
      {s.name}
    </span>
  );
}

/** A finding's citation number: its position in the idea's findings, so it reads the same everywhere. */
export function findingNumber(idea: Idea, id: string): number {
  return (idea.analysis?.findings.findIndex((f) => f.id === id) ?? -1) + 1;
}

/** Right-hand drawer with a finding's full detail. Opens in place over whatever page cites it. */
export function FindingSheet({ idea, findingId, onClose }: { idea: Idea; findingId: string | null; onClose: () => void }) {
  const f = findingId ? idea.analysis?.findings.find((x) => x.id === findingId) ?? null : null;
  return (
    <DialogPrimitive.Root open={!!f} onOpenChange={(o) => !o && onClose()}>
      {f ? (
        <SheetContent title={`[${findingNumber(idea, f.id)}] ${f.title}`} description="Finding detail">
          <FindingDetail f={f} idea={idea} />
        </SheetContent>
      ) : null}
    </DialogPrimitive.Root>
  );
}

function FindingDetail({ f, idea }: { f: Finding; idea: Idea }) {
  const upsert = useDesy((s) => s.upsertIdea);
  const weights = useWeights();
  const st = idea.findingState[f.id] ?? { pinned: false, hidden: false, note: "" };
  const [note, setNote] = useState(st.note);
  const [preview, setPreview] = useState(false);
  const used = usedIn(f, idea);
  const filterIds = Array.from(new Set(f.criterionIds.map((id) => CRITERION_BY_ID[id]?.filter).filter((x): x is FilterId => !!x)));
  const pillarIds = Array.from(new Set(f.rwwIds.map((id) => RWW_BY_ID[id]?.pillar).filter((x): x is PillarId => !!x)));
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
        {filterIds.length + pillarIds.length === 0 ? <p className="mt-1 text-[13px] text-ink-2">Not used in the score. Hiding it won&apos;t change anything.</p> : null}
        {filterIds.length || pillarIds.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filterIds.map((id) => (
              <DialogPrimitive.Close key={id} asChild>
                <Link href={`/app/ideas/${idea.id}?tab=filters&filter=${id}`} className="rounded bg-surface px-2 py-0.5 text-[13px] text-ink hover:bg-surface-2">
                  {FILTER_SHORT[id]}
                </Link>
              </DialogPrimitive.Close>
            ))}
            {pillarIds.map((id) => (
              <DialogPrimitive.Close key={id} asChild>
                <Link href={`/app/ideas/${idea.id}?tab=rww&pillar=${id}`} className="rounded bg-surface px-2 py-0.5 text-[13px] text-ink hover:bg-surface-2">
                  {PILLAR_BY_ID[id].label}
                </Link>
              </DialogPrimitive.Close>
            ))}
          </div>
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
                <p className="flex items-center gap-1.5"><BandBadge band={d.band.before} size="sm" /> → <BandBadge band={d.band.after} size="sm" score={pv!.after.score} /></p>
              </div>
            </div>
            {d.filters.length ? (
              <DiffBlock title="Scoring">
                {d.filters.map((f) => <li key={f.id} className="flex justify-between gap-2"><span>{FILTER_SHORT[f.id]}</span><span className="tnum">{f.before ?? "—"} → {f.after ?? "—"}{f.confBefore !== f.confAfter ? `, confidence ${f.confBefore} → ${f.confAfter}` : ""}</span></li>)}
              </DiffBlock>
            ) : null}
            {d.pillars.length ? (
              <DiffBlock title="Opportunity Assessment">
                {d.pillars.map((p) => <li key={p.id} className="flex justify-between gap-2"><span>{PILLAR_BY_ID[p.id].label}</span><span>{p.before} → {p.after}</span></li>)}
              </DiffBlock>
            ) : null}
            {d.caps.before.join() !== d.caps.after.join() ? (
              <DiffBlock title="What's holding the rating back">
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
