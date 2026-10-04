"use client";
import { ClipboardCopy, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CRITERION_BY_ID, FILTER_SHORT, PILLAR_BY_ID, RWW_BY_ID } from "@/config/criteria";
import { EvidenceLinks } from "@/components/report/sections";
import { Button } from "@/components/ui/button";
import { Skeleton, Textarea } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/overlay";
import { planTargets } from "@/lib/insights";
import { cn, copyText, fmtDate, uid } from "@/lib/utils";
import { createPlan, savePlan } from "@/services/planner";
import { useDesy } from "@/store/desy";
import type { Idea, PlanGoal, Report, ResearchPlan } from "@/types";
import { InlineText, ReorderList } from "./editable";

/** The area a question tests: a scoring filter or a Real / Win / Worth It pillar. */
const areaLabel = (id: string) => (RWW_BY_ID[id] ? PILLAR_BY_ID[RWW_BY_ID[id].pillar].label : FILTER_SHORT[CRITERION_BY_ID[id]?.filter ?? "customer"]);

function TestsTag({ id }: { id: string }) {
  return <span className="inline-flex max-w-full items-center truncate rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-2">Tests {areaLabel(id)}</span>;
}

function usePlanEditor(idea: Idea) {
  const upsert = useDesy((s) => s.upsertIdea);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (fn: (p: ResearchPlan) => void) => {
    if (!idea.plan) return;
    const next: ResearchPlan = JSON.parse(JSON.stringify(idea.plan));
    fn(next);
    upsert({ ...idea, plan: next });
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => upsert(await savePlan(idea.id, next)), 600);
  };
  return update;
}

/** Goal tabs, what the plan tests, and the generated plan, all on one page. */
export function ResearchPlanner({ idea, report }: { idea: Idea; report: Report }) {
  const upsert = useDesy((s) => s.upsertIdea);
  const plan = idea.plan;
  const [busy, setBusy] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [goal, setGoal] = useState<PlanGoal>(plan?.goal ?? "discovery");
  const update = usePlanEditor(idea);
  const targets = plan?.targets ?? planTargets(report);

  const generate = async (g: PlanGoal) => {
    setBusy(true);
    try {
      upsert(await createPlan(idea, report, g));
      toast.success(g === "discovery" ? "Discovery plan ready" : "Pitch plan ready");
    } catch {
      toast.error("Couldn't generate the plan. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchGoal = (g: PlanGoal) => {
    setGoal(g);
    if (!plan) return;
    // Both halves are generated together; the goal only changes which one opens.
    update((p) => { p.goal = g; });
  };

  return (
    <div className="space-y-8">
      <PillTabs
        label="Plan type"
        idBase="goal"
        value={goal}
        onChange={switchGoal}
        tabs={[
          { id: "discovery", label: "Interview" },
          { id: "pitch", label: "Pitch" },
        ]}
      />

      <div role="tabpanel" id={`goal-panel-${goal}`} aria-labelledby={`goal-tab-${goal}`} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{goal === "discovery" ? "Interview plan" : "Pitch plan"}</h2>
          <p className="mt-0.5 max-w-[68ch] text-[13px] text-ink-2">
            {goal === "discovery"
              ? "Turn your riskiest assumptions into conversations: personas, a screener, an interview script and outreach. Answers you collect come back as evidence and update the score."
              : "Present your idea to customers, partners or investors: a script backed by your evidence and answers to the objections you're likely to hear."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plan ? (
            <>
              <Button onClick={() => setConfirmRegen(true)} disabled={busy}><RefreshCw /> {busy ? "Generating plan…" : "Regenerate"}</Button>
              <span className="text-xs text-fg-tertiary">Generated {fmtDate(plan.generatedAt)}</span>
            </>
          ) : (
            <Button variant="primary" onClick={() => generate(goal)} disabled={busy}>
              <Sparkles /> {busy ? "Generating plan…" : "Generate plan"}
            </Button>
          )}
        </div>
        <ConfirmDialog open={confirmRegen} onOpenChange={setConfirmRegen} title="Regenerate the plan?" description="This replaces your edited personas, questions and pitch with a fresh plan based on the current report. Interview notes are kept." confirmLabel="Regenerate" onConfirm={() => generate(goal)} />
      </div>

      <section aria-labelledby="testing-h" className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="testing-h" className="text-sm font-semibold">{goal === "discovery" ? "What these interviews will test" : "What this pitch needs to prove"}</h3>
        </div>
        <p className="mt-0.5 text-xs text-ink-2">The biggest open questions come first.</p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {targets.map((t, i) => (
            <li key={t.id} className="flex items-start gap-2 rounded bg-canvas px-3 py-2 text-[13px]">
              <span className="tnum mt-px text-xs font-medium text-fg-tertiary">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-ink">{t.label}</span>
                <span className="text-xs text-ink-2">{t.why}</span>
              </span>
            </li>
          ))}
          {targets.length === 0 ? <li className="text-[13px] text-ink-2">No open assumptions. Use discovery to confirm willingness to pay anyway.</li> : null}
        </ol>
      </section>

      {plan ? (
        <section aria-label={goal === "discovery" ? "Interview plan" : "Pitch plan"}>
          <p className="mb-4 text-xs text-fg-tertiary">Edit anything; changes save automatically.</p>
          {goal === "discovery" ? <DiscoveryPlan idea={idea} plan={plan} update={update} /> : <PitchPlan idea={idea} plan={plan} update={update} />}
        </section>
      ) : null}

      {busy && !plan ? (
        <div className="space-y-3" role="status" aria-label="Generating plan">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32" />
        </div>
      ) : null}
    </div>
  );
}

type Update = (fn: (p: ResearchPlan) => void) => void;

function DiscoveryPlan({ idea, plan, update }: { idea: Idea; plan: ResearchPlan; update: Update }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Personas</h4>
          <Button size="sm" variant="ghost" onClick={() => update((p) => p.personas.push({ id: uid("p"), name: "New persona", who: "", where: "", why: "" }))}><Plus /> Add persona</Button>
        </div>
        <ReorderList
          label="Personas"
          items={plan.personas}
          onChange={(items) => update((p) => (p.personas = items))}
          className="mt-2 grid gap-3 lg:grid-cols-2"
          itemClassName="rounded-lg border border-line bg-canvas p-3"
          render={(per, i) => (
            <div className="space-y-1 text-[13px]">
              <InlineText label="Persona name" value={per.name} onChange={(v) => update((p) => (p.personas[i].name = v))} className="text-sm font-semibold" />
              <Field label="Who they are" value={per.who} onChange={(v) => update((p) => (p.personas[i].who = v))} />
              <Field label="Where to find them" value={per.where} onChange={(v) => update((p) => (p.personas[i].where = v))} />
              <Field label="Why they matter" value={per.why} onChange={(v) => update((p) => (p.personas[i].why = v))} />
            </div>
          )}
        />
        {plan.personas.length === 0 ? <p className="mt-2 text-[13px] text-fg-tertiary">No personas. Add one so you know who to talk to.</p> : null}
      </div>

      <QuestionBlock title="Screener questions" description="Qualify people before the call." items={plan.screener} onChange={(items) => update((p) => (p.screener = items))} />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Interview script</h4>
            <p className="text-xs text-ink-2">Ask about specific past behavior, avoid leading questions, and save the pitch for the end.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => update((p) => p.script.push({ id: uid("s"), title: "New section", items: [] }))}><Plus /> Add section</Button>
          </div>
        </div>
        <ReorderList
          label="Script sections"
          items={plan.script}
          onChange={(items) => update((p) => (p.script = items))}
          className="mt-3 space-y-3"
          itemClassName="rounded-lg border border-line bg-canvas p-3"
          render={(sec, si) => (
            <div>
              <InlineText label="Section title" value={sec.title} onChange={(v) => update((p) => (p.script[si].title = v))} className="text-sm font-semibold" />
              <QuestionBlock bare items={sec.items} onChange={(items) => update((p) => (p.script[si].items = items))} />
            </div>
          )}
        />
      </div>

      <div>
        <h4 className="text-sm font-semibold">Outreach message</h4>
        <Textarea aria-label="Outreach message" value={plan.outreach} onChange={(e) => update((p) => (p.outreach = e.target.value))} className="mt-2 min-h-[180px] font-normal" />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={async () => ((await copyText(plan.outreach)) ? toast.success("Outreach copied") : toast.error("Couldn't copy"))}><ClipboardCopy /> Copy message</Button>
        </div>
      </div>
      <p className="text-xs text-fg-tertiary">Each question is tagged with the area it tests, so synthesized answers can update the score. Idea: {idea.intake.name}.</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[11px] text-fg-tertiary">{label}</p>
      <InlineText multiline label={label} value={value} onChange={onChange} className="text-[13px]" />
    </div>
  );
}

function QuestionBlock({ title, description, items, onChange, bare }: { title?: string; description?: string; items: ResearchPlan["screener"]; onChange: (i: ResearchPlan["screener"]) => void; bare?: boolean }) {
  return (
    <div className={bare ? "mt-1" : ""}>
      {title ? (
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          {description ? <p className="text-xs text-ink-2">{description}</p> : null}
        </div>
      ) : null}
      <ReorderList
        label={title ?? "Questions"}
        items={items}
        onChange={onChange}
        className={cn("space-y-1", !bare && "mt-2 rounded-lg border border-line bg-canvas p-3")}
        itemClassName="py-1"
        render={(q, i) => (
          <div>
            <InlineText multiline label="Question" value={q.text} onChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, text: v } : x)))} className="text-sm" />
            <div className="flex flex-wrap items-center gap-2 pl-0">
              <span className="text-xs text-ink-2">Learns: {q.learn}</span>
              <TestsTag id={q.tests} />
            </div>
          </div>
        )}
      />
      <button type="button" onClick={() => onChange([...items, { id: uid("q"), text: "New question about a specific past event", learn: "What you want to learn", tests: items[items.length - 1]?.tests ?? "cust.problem" }])} className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <Plus className="size-3.5" aria-hidden /> Add question
      </button>
    </div>
  );
}

function PitchPlan({ idea, plan, update }: { idea: Idea; plan: ResearchPlan; update: Update }) {
  const pillarLabel = (p: string) => (p === "timing" ? "Timing filter" : PILLAR_BY_ID[p as "real"].label);
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Pitch script</h4>
            <p className="text-xs text-ink-2">Tell the story from the problem to the ask.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => update((p) => p.pitch.push({ id: uid("p"), title: "New section", pillar: "real", body: "", findingIds: [] }))}><Plus /> Add section</Button>
          </div>
        </div>
        <ReorderList
          label="Pitch sections"
          items={plan.pitch}
          onChange={(items) => update((p) => (p.pitch = items))}
          className="mt-3 space-y-3"
          itemClassName="rounded-lg border border-line bg-canvas p-3"
          render={(s, i) => (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <InlineText label="Section title" value={s.title} onChange={(v) => update((p) => (p.pitch[i].title = v))} className="w-auto max-w-[260px] text-sm font-semibold" />
                <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-2">{pillarLabel(s.pillar)}</span>
              </div>
              <InlineText multiline label={`${s.title} text`} value={s.body} onChange={(v) => update((p) => (p.pitch[i].body = v))} className="text-sm" />
              {s.findingIds.length ? <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-fg-tertiary">Backed by</span><EvidenceLinks ids={s.findingIds} idea={idea} /></div> : <p className="mt-1 text-[11px] text-fg-tertiary">No supporting finding yet.</p>}
            </div>
          )}
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Likely objections</h4>
            <p className="text-xs text-ink-2">Generated from your weakest filters, active band caps, and Maybe/No answers.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => update((p) => p.objections.push({ id: uid("o"), objection: "New objection", response: "", source: "Added by you", findingIds: [] }))}><Plus /> Add objection</Button>
        </div>
        <ReorderList
          label="Objections"
          items={plan.objections}
          onChange={(items) => update((p) => (p.objections = items))}
          className="mt-3 space-y-3"
          itemClassName="rounded-lg border border-line bg-canvas p-3"
          render={(o, i) => (
            <div>
              <InlineText multiline label="Objection" value={o.objection} onChange={(v) => update((p) => (p.objections[i].objection = v))} className="text-sm font-medium" />
              <InlineText multiline label="Suggested response" value={o.response} onChange={(v) => update((p) => (p.objections[i].response = v))} className="text-[13px] text-ink-2" />
              <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-fg-tertiary">From: {o.source}</span><EvidenceLinks ids={o.findingIds} idea={idea} /></div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
