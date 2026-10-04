"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FrameworkTag } from "@/components/report/framework-tag";
import { getSource } from "@/config/sources";
import { compact, money } from "@/lib/utils";
import type { Idea, Report } from "@/types";

function Artifact({ title, feeds, children, tag }: { title: string; feeds: string; children: React.ReactNode; tag?: string }) {
  return (
    <section className="rounded-lg border border-line bg-canvas" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="flex items-center gap-2">
          <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-2">Feeds {feeds}</span>
          {tag ? <FrameworkTag id={tag} /> : null}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Artifacts({ idea, report }: { idea: Idea; report: Report }) {
  const a = idea.analysis!;
  const p = report.pathToMrr;
  return (
    <div className="grid gap-4">
      <Artifact title="Competitor matrix" feeds="Competition filter">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="text-xs text-fg-tertiary">
              <tr>{["Name", "Pricing", "Target segment", "Strengths", "Gaps", "Funding"].map((h) => <th key={h} scope="col" className="pb-2 pr-4 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {a.competitors.map((c) => (
                <tr key={c.name} className="align-top">
                  <th scope="row" className="py-2 pr-4 font-medium text-ink">{c.name}</th>
                  <td className="tnum py-2 pr-4 text-ink-2">{c.pricing}</td>
                  <td className="py-2 pr-4 text-ink-2">{c.segment}</td>
                  <td className="py-2 pr-4 text-ink-2">{c.strengths}</td>
                  <td className="py-2 pr-4 text-ink-2">{c.gaps}</td>
                  <td className="py-2 text-ink-2">{c.funding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-fg-tertiary">Competitor names are fictional in this demo.</p>
      </Artifact>

      <Artifact title="Market-sizing worksheet" feeds="Customer → Sizable customer base" tag="market-sizing">
        <div className="grid gap-4 md:grid-cols-2">
          {(["topDown", "bottomUp"] as const).map((k) => {
            const m = a.market[k];
            return (
              <div key={k}>
                <p className="text-[13px] font-medium">{k === "topDown" ? "Top-down" : "Bottom-up"}</p>
                <dl className="mt-2 grid grid-cols-3 gap-2">
                  {(["tam", "sam", "som"] as const).map((x) => (
                    <div key={x} className="rounded bg-surface p-2">
                      <dt className="text-[11px] text-fg-tertiary">{x.toUpperCase()}</dt>
                      <dd className="tnum text-lg font-medium">{compact(m[x])}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-2 space-y-1 text-xs text-ink-2">
                  {m.assumptions.map((s) => <li key={s} className="border-l-2 border-line pl-2">{s}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] text-ink-2">
          Obtainable customers used in Path to MRR: <strong className="tnum text-ink">{a.market.obtainableCustomers.toLocaleString()}</strong> {a.market.unit}. Units are paying customers, not dollars.
        </p>
      </Artifact>

      <Artifact title={`Search trend: "${a.trend.term}"`} feeds="Timing filter">
        {a.trend.points.length === 0 ? (
          <p className="rounded border border-dashed border-line-strong p-6 text-center text-[13px] text-ink-2">No trend data: the Market Agent returned partial results. Timing criteria that depend on it show Needs evidence.</p>
        ) : (
          <>
            <div className="h-48 w-full" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={a.trend.points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
                  <Tooltip contentStyle={{ background: "rgb(var(--canvas))", border: "1px solid rgb(var(--line))", borderRadius: 6, fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} name="Search index" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Monthly search index for {a.trend.term}</caption>
              <tbody>{a.trend.points.map((pt) => <tr key={pt.month}><th scope="row">{pt.month}</th><td>{pt.value}</td></tr>)}</tbody>
            </table>
            <p className="mt-2 text-xs text-ink-2">12-month index moved from {a.trend.points[0].value} to {a.trend.points[a.trend.points.length - 1].value}.</p>
          </>
        )}
      </Artifact>

      <Artifact title="Community pain points" feeds="Customer filter" tag="jtbd">
        <ul className="space-y-4">
          {a.painPoints.map((pp) => (
            <li key={pp.theme}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium">{pp.theme}</p>
                <span className="tnum text-xs text-fg-tertiary">{pp.mentions} mentions</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-ink/70" style={{ width: `${Math.min(100, (pp.mentions / Math.max(...a.painPoints.map((x) => x.mentions))) * 100)}%` }} /></div>
              <ul className="mt-2 space-y-1">
                {pp.quotes.map((qq) => (
                  <li key={qq.text} className="border-l-2 border-accent/40 pl-2 text-[13px] italic text-ink-2">
                    &ldquo;{qq.text}&rdquo; <span className="not-italic text-fg-tertiary">({getSource(qq.sourceId).name})</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Artifact>

      <Artifact title="Unit economics" feeds="Economic and Channel filters" tag="wtp">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Price", `${money(p.price)}/mo`],
            ["Running cost", `${money(p.variableCost, { cents: true })}/mo`],
            ["Gross margin", `${Math.round(p.marginPct)}%`],
            ["CAC estimate", money(p.cac)],
            ["CAC payback", p.cacPaybackMonths != null ? `${p.cacPaybackMonths.toFixed(1)} mo` : "Never"],
            ["Build cost", idea.intake.buildPath === "hiredDeveloper" ? (a.unit.buildCost != null ? money(a.unit.buildCost) : "Not given") : "Your time"],
          ].map(([k, v]) => (
            <div key={k} className="rounded bg-surface p-2.5">
              <dt className="text-[11px] text-fg-tertiary">{k}</dt>
              <dd className="tnum text-base font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-ink-2">Support load ≈ {a.unit.supportHoursPerCustomer} h per customer per month. Price comes from Path to MRR; change it there to update this sheet.</p>
      </Artifact>
    </div>
  );
}
