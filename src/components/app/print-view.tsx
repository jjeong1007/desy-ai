"use client";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageSkeleton } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { useIdea } from "@/lib/hooks";
import { useDesy } from "@/store/desy";
import type { Idea } from "@/types";

export function PrintView() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useDesy((s) => s.hydrated);
  const idea = useIdea(id);

  if (!hydrated) return <PageSkeleton />;
  if (!idea) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Idea not found</h1>
        <Button asChild className="mt-4"><Link href="/app/ideas">Back to ideas</Link></Button>
      </div>
    );
  }

  return (
    <div className="print-doc mx-auto w-full max-w-[900px] px-4 py-6 md:px-6">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button asChild size="sm" variant="ghost"><Link href={`/app/planner/${idea.id}`}>Back to plan</Link></Button>
        <Button size="sm" variant="primary" onClick={() => window.print()}><Printer /> Print</Button>
      </div>
      <p className="text-xs text-fg-tertiary">Desy · Research plan</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{idea.intake.name}</h1>
      <p className="mt-1 text-sm text-ink-2">{idea.intake.oneLiner}</p>
      <PlanPrint idea={idea} />
    </div>
  );
}

function PlanPrint({ idea }: { idea: Idea }) {
  const plan = idea.plan;
  if (!plan) {
    return (
      <p className="mt-6 text-sm text-ink-2">
        No research plan yet. <Link href={`/app/planner/${idea.id}`} className="font-medium text-accent-strong hover:underline">Create one in the Research Planner</Link>.
      </p>
    );
  }
  return (
    <div className="mt-6 space-y-8 text-sm">
      <p>Goal: {plan.goal === "discovery" ? "Customer discovery" : "Pitch"}</p>
      <section>
        <h2 className="text-xl font-semibold">What this plan is testing</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {plan.targets.map((t) => (
            <li key={t.id}><span className="font-medium">{t.label}.</span> {t.why}</li>
          ))}
        </ul>
      </section>
      {plan.goal === "discovery" ? (
        <>
          <section>
            <h2 className="text-xl font-semibold">Personas</h2>
            <ul className="mt-3 space-y-3">
              {plan.personas.map((p) => (
                <li key={p.id}>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-ink-2">{p.who}</p>
                  <p className="text-ink-2">Where: {p.where}</p>
                  <p className="text-ink-2">Why they matter: {p.why}</p>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Screener</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {plan.screener.map((q) => <li key={q.id}>{q.text}</li>)}
            </ol>
          </section>
          {plan.script.map((s) => (
            <section key={s.id}>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <ul className="mt-2 space-y-2">
                {s.items.map((q) => (
                  <li key={q.id}>
                    <p>{q.text}</p>
                    <p className="text-xs text-ink-2">Learn: {q.learn} · tests {q.tests}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section>
            <h2 className="text-xl font-semibold">Outreach</h2>
            <p className="mt-2 whitespace-pre-wrap text-ink-2">{plan.outreach}</p>
          </section>
        </>
      ) : (
        <>
          {plan.pitch.map((s) => (
            <section key={s.id}>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-ink-2">{s.body}</p>
            </section>
          ))}
          <section>
            <h2 className="text-xl font-semibold">Likely objections</h2>
            <ul className="mt-2 space-y-3">
              {plan.objections.map((o) => (
                <li key={o.id}>
                  <p className="font-medium">{o.objection}</p>
                  <p className="text-ink-2">{o.response}</p>
                  <p className="text-xs text-fg-tertiary">From: {o.source}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      {plan.notes.length ? (
        <section>
          <h2 className="text-xl font-semibold">Interview notes</h2>
          <ul className="mt-2 space-y-3">
            {plan.notes.map((n) => (
              <li key={n.id}>
                <p className="font-medium">{n.interviewee} · {n.date}</p>
                <p className="whitespace-pre-wrap text-ink-2">{n.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {plan.synthesis ? (
        <section>
          <h2 className="text-xl font-semibold">Synthesis</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {plan.synthesis.themes.map((t) => <li key={t.theme}>{t.theme} ({t.count})</li>)}
          </ul>
          <ul className="mt-3 space-y-1">
            {plan.synthesis.assumptions.map((a) => (
              <li key={a.id}><span className="font-medium">{a.label}:</span> {a.status}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-ink-2">No synthesis yet.</p>
      )}
    </div>
  );
}
