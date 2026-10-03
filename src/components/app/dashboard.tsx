"use client";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpDown, FolderOpen, LayoutGrid, Plus, Rows3, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FILTERS, FILTER_SHORT, PILLAR_BY_ID } from "@/config/criteria";
import { SCORING_CONFIG } from "@/config/scoring";
import { PageSkeleton } from "@/components/app/app-shell";
import { BandBadge, NetPill } from "@/components/report/markers";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Segmented } from "@/components/ui/tabs";
import { reportFor, useWeights } from "@/lib/hooks";
import { cn, relTime } from "@/lib/utils";
import { deleteIdea, resetDemoData } from "@/services/ideas";
import { useDesy } from "@/store/desy";
import type { Idea, PursuitBand, Report } from "@/types";

type SortKey = "score-desc" | "score-asc" | "recent" | "name";
type BandFilter = "all" | PursuitBand;

const BAR_COLORS = ["#df5732", "#3d6b1e", "#2f5578"];

function hrefFor(idea: Idea) {
  if (idea.status === "draft") return `/app/ideas/new?draft=${idea.id}`;
  if (idea.status === "running") return `/app/ideas/${idea.id}/run`;
  return `/app/ideas/${idea.id}`;
}

export function Dashboard() {
  const hydrated = useDesy((s) => s.hydrated);
  const ideas = useDesy((s) => s.ideas);
  const remove = useDesy((s) => s.removeIdea);
  const setIdeas = useDesy((s) => s.setIdeas);
  const weights = useWeights();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [sort, setSort] = useState<SortKey>("score-desc");
  const [band, setBand] = useState<BandFilter>("all");
  const [cappedOnly, setCappedOnly] = useState(false);
  const [rwwNo, setRwwNo] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Idea | null>(null);
  const [restoring, setRestoring] = useState(false);

  const reports = useMemo(() => {
    const map = new Map<string, Report | null>();
    for (const idea of ideas) map.set(idea.id, idea.status === "complete" ? reportFor(idea, weights) : null);
    return map;
  }, [ideas, weights]);

  const filtered = useMemo(() => {
    const list = ideas.filter((idea) => {
      const r = reports.get(idea.id);
      if (band !== "all" && r?.score.band !== band) return false;
      if (cappedOnly && !(r && r.score.band !== r.score.uncappedBand)) return false;
      if (rwwNo && !r?.pillars.some((p) => p.net === "no")) return false;
      return true;
    });
    const scoreOf = (idea: Idea) => reports.get(idea.id)?.score.overall ?? -1;
    list.sort((a, b) => {
      if (sort === "name") return (a.intake.name || "Untitled").localeCompare(b.intake.name || "Untitled");
      if (sort === "recent") return +new Date(b.lastRunAt || b.updatedAt) - +new Date(a.lastRunAt || a.updatedAt);
      const d = scoreOf(b) - scoreOf(a);
      return sort === "score-asc" ? -d : d;
    });
    return list;
  }, [ideas, reports, band, cappedOnly, rwwNo, sort]);

  const compared = ideas.filter((i) => selected.includes(i.id) && reports.get(i.id));
  const filtersOn = band !== "all" || cappedOnly || rwwNo;

  const toggle = (id: string) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 3) {
        toast.error("Compare up to 3 ideas");
        return cur;
      }
      return [...cur, id];
    });
  };

  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1178px] px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] font-semibold leading-none">Ideas</h1>
        <Button asChild variant="ghost" className="text-ink-2">
          <Link href="/app/ideas/new">
            <Plus /> New idea
          </Link>
        </Button>
      </div>

      {ideas.length === 0 ? (
        <div className="mt-16 flex flex-col items-center px-6 text-center">
          <FolderOpen className="size-8 text-muted" strokeWidth={1.25} aria-hidden />
          <h2 className="mt-4 text-[32px] font-medium leading-none">No ideas just yet.</h2>
          <p className="mt-3 max-w-md text-sm font-medium text-ink-2">The samples cover a strong pursuit, a promising one, and a weak pursuit that is capped. They show how the gate works.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild variant="primary">
              <Link href="/app/ideas/new">New idea</Link>
            </Button>
            <Button
              disabled={restoring}
              onClick={async () => {
                setRestoring(true);
                try {
                  setIdeas(await resetDemoData());
                  toast.success("Sample ideas restored");
                } catch {
                  toast.error("Couldn't restore the samples.");
                } finally {
                  setRestoring(false);
                }
              }}
            >
              {restoring ? "Restoring…" : "Restore sample ideas"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Segmented
              label="Dashboard layout"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { id: "cards", label: "Cards", icon: <LayoutGrid /> },
                { id: "table", label: "Table", icon: <Rows3 /> },
              ]}
            />
            <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
              <ArrowUpDown className="size-3.5" aria-hidden />
              <span className="sr-only">Sort</span>
              <Select aria-label="Sort ideas" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="score-desc">Highest score</option>
                <option value="score-asc">Lowest score</option>
                <option value="recent">Recently run</option>
                <option value="name">Name</option>
              </Select>
            </label>
            <Select aria-label="Filter by pursuit band" value={band} onChange={(e) => setBand(e.target.value as BandFilter)}>
              <option value="all">All bands</option>
              <option value="strong">Strong</option>
              <option value="promising">Promising</option>
              <option value="weak">Weak</option>
            </Select>
            <label className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[13px]">
              <input type="checkbox" checked={cappedOnly} onChange={(e) => setCappedOnly(e.target.checked)} />
              Capped
            </label>
            <label className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[13px]">
              <input type="checkbox" checked={rwwNo} onChange={(e) => setRwwNo(e.target.checked)} />
              Any RWW pillar = No
            </label>
            {filtersOn ? (
              <Button size="sm" variant="ghost" onClick={() => { setBand("all"); setCappedOnly(false); setRwwNo(false); }}>
                Clear filters
              </Button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed border-line-strong p-8 text-center" role="status">
              <p className="text-sm font-medium">No ideas match these filters</p>
              <p className="mt-1 text-[13px] text-ink-2">Capped ideas are held back by a gate or thin evidence, not only by a low score.</p>
              <Button size="sm" className="mt-3" onClick={() => { setBand("all"); setCappedOnly(false); setRwwNo(false); }}>
                Clear filters
              </Button>
            </div>
          ) : view === "cards" ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((idea) => (
                <li key={idea.id}>
                  <IdeaCard idea={idea} report={reports.get(idea.id) ?? null} selected={selected.includes(idea.id)} onToggle={() => toggle(idea.id)} onDelete={() => setPendingDelete(idea)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Your ideas</caption>
                <thead className="border-b border-line bg-surface text-xs text-ink-2">
                  <tr>
                    <th className="px-3 py-2 font-medium" scope="col"><span className="sr-only">Compare</span></th>
                    <th className="px-3 py-2 font-medium" scope="col">Idea</th>
                    <th className="px-3 py-2 font-medium" scope="col">Score</th>
                    <th className="px-3 py-2 font-medium" scope="col">Band</th>
                    <th className="px-3 py-2 font-medium" scope="col">Real / Win / Worth It</th>
                    <th className="px-3 py-2 font-medium" scope="col">Last run</th>
                    <th className="px-3 py-2 font-medium" scope="col">Status</th>
                    <th className="px-3 py-2 font-medium" scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((idea) => {
                    const r = reports.get(idea.id) ?? null;
                    return (
                      <tr key={idea.id} className="border-b border-line last:border-0">
                        <td className="px-3 py-2">
                          <CompareBox idea={idea} enabled={!!r} checked={selected.includes(idea.id)} onToggle={() => toggle(idea.id)} />
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <Link href={hrefFor(idea)} className="hover:underline">{idea.intake.name || "Untitled draft"}</Link>
                        </td>
                        <td className="tnum px-3 py-2">{r ? r.score.overall : "—"}</td>
                        <td className="px-3 py-2">{r ? <BandBadge band={r.score.band} capped={r.score.band !== r.score.uncappedBand} size="sm" /> : "—"}</td>
                        <td className="px-3 py-2">{r ? <RwwRow report={r} /> : "—"}</td>
                        <td className="px-3 py-2 text-ink-2">{idea.lastRunAt ? relTime(idea.lastRunAt) : "—"}</td>
                        <td className="px-3 py-2 capitalize text-ink-2">{idea.status}</td>
                        <td className="px-3 py-2">
                          <Button size="icon" variant="ghost" aria-label={`Delete ${idea.intake.name || "idea"}`} onClick={() => setPendingDelete(idea)}>
                            <Trash2 />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {compared.length >= 2 ? <ComparePanel ideas={compared} reports={reports} /> : null}
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => { if (!v) setPendingDelete(null); }}
        title={pendingDelete ? `Delete "${pendingDelete.intake.name || "Untitled draft"}"?` : "Delete idea?"}
        description="The report, findings, research plan and interview notes are removed. This can't be undone."
        confirmLabel="Delete idea"
        onConfirm={async () => {
          if (!pendingDelete) return;
          const id = pendingDelete.id;
          await deleteIdea(id);
          remove(id);
          setSelected((s) => s.filter((x) => x !== id));
          setPendingDelete(null);
          toast.success("Idea deleted");
        }}
      />
    </div>
  );
}

function RwwRow({ report }: { report: Report }) {
  return (
    <span className="flex flex-wrap gap-1">
      {report.pillars.map((p) => (
        <span key={p.id} className="inline-flex items-center gap-1 text-xs text-ink-2">
          {PILLAR_BY_ID[p.id].label}
          <NetPill net={p.net} size="sm" />
        </span>
      ))}
    </span>
  );
}

function CompareBox({ idea, enabled, checked, onToggle }: { idea: Idea; enabled: boolean; checked: boolean; onToggle: () => void }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={!enabled}
      onChange={onToggle}
      aria-label={`Compare ${idea.intake.name || "untitled idea"}`}
      title={enabled ? "Include in comparison" : "Run the analysis before comparing"}
    />
  );
}

function IdeaCard({ idea, report, selected, onToggle, onDelete }: { idea: Idea; report: Report | null; selected: boolean; onToggle: () => void; onDelete: () => void }) {
  const capped = !!report && report.score.band !== report.score.uncappedBand;
  return (
    <article className={cn("flex h-full flex-col overflow-hidden rounded-lg border bg-canvas", selected ? "border-accent" : "border-line")}>
      <div className="relative flex h-[105px] items-center justify-center bg-[rgb(var(--well))]">
        <p className="tnum text-[32px] font-semibold leading-none text-ink">{report ? report.score.overall : "—"}</p>
        <div className="absolute left-2 top-2">
          <CompareBox idea={idea} enabled={!!report} checked={selected} onToggle={onToggle} />
        </div>
        <div className="absolute right-1 top-1">
          <Button size="icon" variant="ghost" aria-label={`Delete ${idea.intake.name || "idea"}`} onClick={onDelete}>
            <Trash2 />
          </Button>
        </div>
      </div>
      <Link href={hrefFor(idea)} className="flex flex-1 flex-col p-3 outline-offset-4">
        <h2 className="text-base font-semibold leading-snug">{idea.intake.name || "Untitled draft"}</h2>
        <p className="mt-1 line-clamp-2 text-xs font-medium text-ink-2">{idea.intake.oneLiner || "No description yet."}</p>
        <div className="mt-3">{report ? <BandBadge band={report.score.band} capped={capped} size="sm" /> : <span className="text-xs font-medium text-muted">{idea.status === "draft" ? "Finish intake to score it" : "Analysis in progress"}</span>}</div>
        {report ? <div className="mt-2"><RwwRow report={report} /></div> : null}
        <p className="mt-auto pt-3 text-xs font-medium text-muted">Last run {relTime(idea.lastRunAt)}</p>
      </Link>
    </article>
  );
}

function ComparePanel({ ideas, reports }: { ideas: Idea[]; reports: Map<string, Report | null> }) {
  const data = FILTERS.map((f) => {
    const row: Record<string, string | number | null> = { filter: f.short };
    for (const idea of ideas) {
      const score = reports.get(idea.id)?.filters.find((x) => x.id === f.id)?.score;
      row[idea.id] = score ?? null;
    }
    return row;
  });
  return (
    <section aria-labelledby="compare-h" className="mt-8 rounded-lg border border-line p-4 md:p-5">
      <h2 id="compare-h" className="text-lg font-semibold">Compare</h2>
      <p className="mt-1 text-[13px] text-ink-2">Five filter scores. The dashed line is the knockout threshold ({SCORING_CONFIG.knockoutBelow}). A missing bar means the filter has no scored criteria.</p>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
            <XAxis dataKey="filter" tick={{ fontSize: 12, fill: "rgb(var(--ink-2))" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "rgb(var(--muted))" }} width={32} />
            <Tooltip contentStyle={{ background: "rgb(var(--canvas))", border: "1px solid rgb(var(--line))", borderRadius: 6, fontSize: 12, color: "rgb(var(--ink))" }} />
            <ReferenceLine y={SCORING_CONFIG.knockoutBelow} stroke="rgb(var(--weak))" strokeDasharray="4 4" />
            {ideas.map((idea, i) => (
              <Bar key={idea.id} dataKey={idea.id} name={idea.intake.name} fill={BAR_COLORS[i] ?? "#171716"} radius={[2, 2, 0, 0]} />
            ))}
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Filter scores for the selected ideas. Knockout threshold is {SCORING_CONFIG.knockoutBelow}.</caption>
          <thead>
            <tr className="border-b border-line text-xs text-ink-2">
              <th className="py-2 pr-3 font-medium" scope="col">Idea</th>
              <th className="py-2 pr-3 font-medium" scope="col">Score</th>
              <th className="py-2 pr-3 font-medium" scope="col">Band</th>
              {FILTERS.map((f) => (
                <th key={f.id} className="py-2 pr-3 font-medium" scope="col">{FILTER_SHORT[f.id]}</th>
              ))}
              <th className="py-2 font-medium" scope="col">RWW</th>
            </tr>
          </thead>
          <tbody>
            {ideas.map((idea) => {
              const r = reports.get(idea.id)!;
              return (
                <tr key={idea.id} className="border-b border-line last:border-0">
                  <th className="py-2 pr-3 text-left font-medium" scope="row">{idea.intake.name}</th>
                  <td className="tnum py-2 pr-3">{r.score.overall}</td>
                  <td className="py-2 pr-3"><BandBadge band={r.score.band} capped={r.score.band !== r.score.uncappedBand} size="sm" /></td>
                  {r.filters.map((f) => (
                    <td key={f.id} className="tnum py-2 pr-3">{f.score ?? "—"}</td>
                  ))}
                  <td className="py-2"><RwwRow report={r} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
