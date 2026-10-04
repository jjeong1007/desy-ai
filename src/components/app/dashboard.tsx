"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpDown, FolderOpen, LayoutGrid, Plus, Rows3, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FILTERS, FILTER_SHORT, PILLAR_BY_ID } from "@/config/criteria";
import { PageSkeleton } from "@/components/app/app-shell";
import { BandBadge, NetPill } from "@/components/report/markers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  }, [ideas, reports, band, cappedOnly, sort]);

  const compared = ideas.filter((i) => selected.includes(i.id) && reports.get(i.id));
  const filtersOn = band !== "all" || cappedOnly;

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
        <h1 className="text-page-title font-semibold">Ideas</h1>
        <Button asChild variant="quiet">
          <Link href="/app/ideas/new">
            <Plus /> New idea
          </Link>
        </Button>
      </div>

      {ideas.length === 0 ? (
        <div className="mt-16 flex flex-col items-center px-6 text-center">
          <FolderOpen className="size-8 text-fg-tertiary" strokeWidth={1.25} aria-hidden />
          <h2 className="mt-4 text-page-title font-medium">No ideas just yet.</h2>
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
            {filtersOn ? (
              <Button size="sm" variant="ghost" onClick={() => { setBand("all"); setCappedOnly(false); }}>
                Clear filters
              </Button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed border-line-strong p-8 text-center" role="status">
              <p className="text-sm font-medium">No ideas match these filters</p>
              <p className="mt-1 text-[13px] text-ink-2">Capped ideas are held back by a gate or thin evidence, not only by a low score.</p>
              <Button size="sm" className="mt-3" onClick={() => { setBand("all"); setCappedOnly(false); }}>
                Clear filters
              </Button>
            </div>
          ) : view === "cards" ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((idea) => (
                <li key={idea.id}>
                  <IdeaCard idea={idea} report={reports.get(idea.id) ?? null} selected={selected.includes(idea.id)} />
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
                        <td className="px-3 py-2">{r ? <BandBadge band={r.score.band} score={r.score} size="sm" /> : "—"}</td>
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

function IdeaCard({ idea, report, selected }: { idea: Idea; report: Report | null; selected: boolean }) {
  const name = idea.intake.name || "Untitled draft";
  return (
    <Link href={hrefFor(idea)} className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
    <Card
      className={cn("h-full transition-colors group-hover:border-line-strong group-hover:bg-muted", selected && "border-brand")}
      title={name}
      description={
        <span className="flex flex-col gap-2">
          <span className="line-clamp-2 text-fg-secondary">{idea.intake.oneLiner || "No description yet."}</span>
          <span>{report ? <BandBadge band={report.score.band} score={report.score} size="sm" /> : <span>{idea.status === "draft" ? "Finish intake to score it" : "Analysis in progress"}</span>}</span>
          <span>Last run {relTime(idea.lastRunAt)}</span>
        </span>
      }
      media={
        report ? (
          <span className="flex items-center gap-4 border-b border-line bg-canvas px-3">
            <span className="flex shrink-0 flex-col">
              <span className="tnum text-page-title font-semibold text-fg">{report.score.overall}</span>
              <span className="text-caption font-medium text-fg-tertiary">Desy Score</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              {report.filters.map((f) => (
                <span key={f.id} className="flex items-center gap-2 text-caption text-fg-secondary">
                  <span className="w-[60px] shrink-0 truncate">{FILTER_SHORT[f.id]}</span>
                  <span className="h-1 flex-1 rounded-sm bg-subtle" aria-hidden>
                    <span className="block h-full rounded-sm bg-brand" style={{ width: `${f.score ?? 0}%` }} />
                  </span>
                  <span className="tnum w-5 text-right">{f.score ?? "—"}</span>
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span className="flex items-center justify-center border-b border-line bg-canvas text-small text-fg-tertiary">Not scored yet</span>
        )
      }
    />
    </Link>
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
      <p className="mt-1 text-[13px] text-ink-2">Scores by area. A missing bar means there isn&apos;t enough evidence yet.</p>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
            <XAxis dataKey="filter" tick={{ fontSize: 12, fill: "rgb(var(--ink-2))" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "rgb(var(--muted))" }} width={32} />
            <Tooltip contentStyle={{ background: "rgb(var(--canvas))", border: "1px solid rgb(var(--line))", borderRadius: 6, fontSize: 12, color: "rgb(var(--ink))" }} />
            {ideas.map((idea, i) => (
              <Bar key={idea.id} dataKey={idea.id} name={idea.intake.name} fill={BAR_COLORS[i] ?? "#171716"} radius={[2, 2, 0, 0]} />
            ))}
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Filter scores for the selected ideas.</caption>
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
                  <td className="py-2 pr-3"><BandBadge band={r.score.band} score={r.score} size="sm" /></td>
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
