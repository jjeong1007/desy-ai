"use client";
import { CheckCircle2, CircleHelp, ClipboardCopy, Download, FileText, MessagesSquare, Plus, Presentation, Printer, RefreshCw, Sparkles, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CRITERION_BY_ID, FILTER_SHORT, PILLAR_BY_ID, RWW_BY_ID } from "@/config/criteria";
import { BAND_SHORT } from "@/config/scoring";
import { FrameworkTag } from "@/components/report/framework-tag";
import { AnswerPill, BandBadge, CriterionDots, NetPill } from "@/components/report/markers";
import { EvidenceLinks } from "@/components/report/sections";
import { Button } from "@/components/ui/button";
import { Input, Select, Skeleton, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useWeights } from "@/lib/hooks";
import { planTargets } from "@/lib/insights";
import { planMarkdown } from "@/lib/markdown";
import { cn, copyText, downloadText, fmtDate, uid } from "@/lib/utils";
import { applySynthesis, createPlan, deleteNote, generatePlan, previewSynthesis, sampleNotes, saveNote, savePlan, synthesize } from "@/services/planner";
import { useDesy } from "@/store/desy";
import type { AssumptionStatus, Idea, InterviewNote, PlanGoal, Report, ResearchPlan } from "@/types";
import { InlineText, ReorderList } from "./editable";

const tagLabel = (id: string) => CRITERION_BY_ID[id]?.label ?? RWW_BY_ID[id]?.text.split(" (")[0] ?? id;

function TestsTag({ id }: { id: string }) {
  const isRww = !!RWW_BY_ID[id];
  return (
    <span className="inline-flex max-w-full items-center gap-1 truncate rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-2">
      <span className="text-fg-tertiary">{isRww ? PILLAR_BY_ID[RWW_BY_ID[id].pillar].label : FILTER_SHORT[CRITERION_BY_ID[id]?.filter ?? "customer"]}:</span>
      <span className="truncate">{tagLabel(id)}</span>
    </span>
  );
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

export function ResearchPlanner({ idea, report }: { idea: Idea; report: Report }) {
  const upsert = useDesy((s) => s.upsertIdea);
  const plan = idea.plan;
  const [goal, setGoal] = useState<PlanGoal>(plan?.goal ?? "discovery");
  const [busy, setBusy] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
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
    // Keep edits: switching only changes which half of the plan is shown.
    update((p) => {
      p.goal = g;
      if (g === "pitch" && p.pitch.length === 0) Object.assign(p, { pitch: generatePlan(idea, report, g).pitch, objections: generatePlan(idea, report, g).objections });
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Research Planner</h2>
          <p className="mt-0.5 max-w-[68ch] text-[13px] text-ink-2">Turn your riskiest assumptions into conversations. Answers you collect come back as evidence and update the score.</p>
        </div>
        {plan ? <PlanExport idea={idea} plan={plan} /> : null}
      </div>

      <section aria-labelledby="testing-h" className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="testing-h" className="text-sm font-semibold">What this plan is testing</h3>
          <FrameworkTag id="discovery" />
        </div>
        <p className="mt-0.5 text-xs text-ink-2">Active band caps, No answers, Low confidence filters, Needs evidence criteria, and Maybe answers come first.</p>
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

      <section aria-labelledby="step1-h">
        <h3 id="step1-h" className="text-base font-semibold"><span className="text-fg-tertiary">Step 1</span> Choose a goal</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plan goal">
          {(
            [
              ["discovery", "Customer discovery", "Learn from potential users: personas, screener, interview script, outreach.", MessagesSquare],
              ["pitch", "Pitch", "Present to customers, partners or investors: script with evidence, likely objections.", Presentation],
            ] as const
          ).map(([id, title, desc, Icon]) => (
            <button key={id} type="button" role="radio" aria-checked={goal === id} onClick={() => switchGoal(id)} className={cn("flex items-start gap-3 rounded-lg border p-4 text-left transition-colors", goal === id ? "border-accent bg-accent-tint/50" : "border-line hover:bg-surface")}>
              <Icon className={cn("mt-0.5 size-5 shrink-0", goal === id ? "text-accent-strong" : "text-fg-tertiary")} aria-hidden />
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="mt-0.5 block text-[13px] text-ink-2">{desc}</span>
              </span>
            </button>
          ))}
        </div>
        {!plan ? (
          <div className="mt-4">
            <Button variant="primary" onClick={() => generate(goal)} disabled={busy}>
              <Sparkles /> {busy ? "Generating plan…" : "Generate plan"}
            </Button>
          </div>
        ) : null}
      </section>

      {busy && !plan ? (
        <div className="space-y-3" role="status" aria-label="Generating plan">
          <Skeleton className="h-6 w-48" />
          <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
          <Skeleton className="h-64" />
        </div>
      ) : null}

      {plan ? (
        <>
          <section aria-labelledby="step2-h">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="step2-h" className="text-base font-semibold"><span className="text-fg-tertiary">Step 2</span> Your plan <span className="text-xs font-normal text-fg-tertiary">Generated {fmtDate(plan.generatedAt)}. Edit anything; changes save automatically.</span></h3>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRegen(true)} disabled={busy}><RefreshCw /> Regenerate</Button>
            </div>
            <ConfirmDialog open={confirmRegen} onOpenChange={setConfirmRegen} title="Regenerate the plan?" description="This replaces your edited personas, questions and pitch with a fresh plan based on the current report. Interview notes are kept." confirmLabel="Regenerate" onConfirm={() => generate(goal)} />
            <div className="mt-4">{plan.goal === "discovery" ? <DiscoveryPlan idea={idea} plan={plan} update={update} /> : <PitchPlan idea={idea} plan={plan} update={update} />}</div>
          </section>
          <Synthesis idea={idea} report={report} plan={plan} />
        </>
      ) : null}
    </div>
  );
}

function PlanExport({ idea, plan }: { idea: Idea; plan: ResearchPlan }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={async () => ((await copyText(planMarkdown(idea, plan))) ? toast.success("Plan copied as Markdown") : toast.error("Couldn't copy. Use Download instead."))}><ClipboardCopy /> Copy</Button>
      <Button size="sm" onClick={() => { downloadText(`${idea.intake.name.replace(/\W+/g, "-").toLowerCase()}-plan.md`, planMarkdown(idea, plan)); toast.success("Markdown downloaded"); }}><Download /> Markdown</Button>
      <Button size="sm" asChild><Link href={`/app/ideas/${idea.id}/print?doc=plan`}><Printer /> Print view</Link></Button>
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
            <FrameworkTag id="discovery" />
            <FrameworkTag id="jtbd" />
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
      <p className="text-xs text-fg-tertiary">Every question is tagged with the criterion or RWW sub-question it tests, so synthesized answers can update the score. Idea: {idea.intake.name}.</p>
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
            <p className="text-xs text-ink-2">Problem and who has it map to Real; why now to Timing; why you to Win; the ask to Worth It.</p>
          </div>
          <div className="flex gap-2">
            <FrameworkTag id="pitch" />
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
              <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-fg-tertiary">From: {o.source}</span><EvidenceLinks ids={o.findingIds} idea={idea} max={2} /></div>
            </div>
          )}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Step 3

const STATUS: Record<AssumptionStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  validated: { label: "Validated", cls: "bg-strong-tint text-strong", Icon: CheckCircle2 },
  invalidated: { label: "Invalidated", cls: "bg-weak-tint text-weak", Icon: XCircle },
  unclear: { label: "Unclear", cls: "border border-dashed border-line-strong text-ink-2", Icon: CircleHelp },
};

function Synthesis({ idea, report, plan }: { idea: Idea; report: Report; plan: ResearchPlan }) {
  const upsert = useDesy((s) => s.upsertIdea);
  const weights = useWeights();
  const [busy, setBusy] = useState<"syn" | "apply" | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [draft, setDraft] = useState<InterviewNote>(() => ({ id: uid("n"), interviewee: "", personaId: plan.personas[0]?.id ?? "", date: new Date().toISOString().slice(0, 10), text: "" }));
  const [errors, setErrors] = useState<{ interviewee?: string; text?: string }>({});
  const syn = plan.synthesis;
  const preview = syn && !syn.appliedAt ? previewSynthesis(idea, syn, { weights }) : null;

  useEffect(() => {
    if (!draft.personaId && plan.personas[0]) setDraft((d) => ({ ...d, personaId: plan.personas[0].id }));
  }, [plan.personas, draft.personaId]);

  const addNote = async () => {
    const e: typeof errors = {};
    if (!draft.interviewee.trim()) e.interviewee = "Add who you talked to.";
    if (draft.text.trim().length < 20) e.text = "Paste at least a few sentences of notes.";
    setErrors(e);
    if (Object.keys(e).length) return;
    upsert(await saveNote(idea.id, draft));
    toast.success("Interview notes added");
    setDraft({ id: uid("n"), interviewee: "", personaId: plan.personas[0]?.id ?? "", date: new Date().toISOString().slice(0, 10), text: "" });
  };

  const useSamples = async () => {
    let last = idea;
    for (const n of sampleNotes(idea)) last = await saveNote(idea.id, { ...n, id: uid("n") });
    upsert(last);
    toast.success("Added 3 sample interviews", { description: "Sample notes are for trying the flow; replace them with real interviews." });
  };

  const runSyn = async () => {
    setBusy("syn");
    try {
      upsert(await synthesize(idea, report));
      toast.success("Synthesis ready");
    } finally {
      setBusy(null);
    }
  };
  const apply = async () => {
    setBusy("apply");
    try {
      const saved = await applySynthesis(idea, { weights });
      upsert(saved);
      toast.success("Score updated from your interviews", { description: preview ? `Desy Score ${preview.before.score.overall} → ${preview.after.score.overall}` : undefined });
    } catch {
      toast.error("Couldn't apply the update.");
    } finally {
      setBusy(null);
    }
  };

  const personaName = (id: string) => plan.personas.find((p) => p.id === id)?.name ?? "Unassigned persona";

  return (
    <section aria-labelledby="step3-h" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="step3-h" className="text-base font-semibold"><span className="text-fg-tertiary">Step 3</span> Synthesis</h3>
        {plan.notes.length === 0 ? <Button size="sm" variant="ghost" onClick={useSamples}><FileText /> Use sample notes</Button> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-lg border border-line bg-canvas p-4">
          <p className="text-sm font-semibold">Add interview notes</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="n-who" className="text-xs font-medium">Interviewee</label>
              <Input id="n-who" value={draft.interviewee} onChange={(e) => setDraft({ ...draft, interviewee: e.target.value })} aria-invalid={!!errors.interviewee} aria-describedby={errors.interviewee ? "n-who-err" : undefined} placeholder="e.g. Maya R." className="mt-1" />
              {errors.interviewee ? <p id="n-who-err" className="mt-1 text-xs text-weak">{errors.interviewee}</p> : null}
            </div>
            <div>
              <label htmlFor="n-persona" className="text-xs font-medium">Persona</label>
              <Select id="n-persona" value={draft.personaId} onChange={(e) => setDraft({ ...draft, personaId: e.target.value })} className="mt-1 w-full">
                {plan.personas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="">Other</option>
              </Select>
            </div>
            <div>
              <label htmlFor="n-date" className="text-xs font-medium">Date</label>
              <Input id="n-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1" />
            </div>
          </div>
          <label htmlFor="n-text" className="mt-3 block text-xs font-medium">Notes</label>
          <Textarea id="n-text" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} aria-invalid={!!errors.text} aria-describedby="n-text-help" placeholder={'Paste notes or a transcript. Put direct quotes in "double quotes" so they show up as snippets.'} className="mt-1 min-h-[140px]" />
          <p id="n-text-help" className={cn("mt-1 text-xs", errors.text ? "text-weak" : "text-fg-tertiary")}>{errors.text ?? "Quotes in double quotes are pulled out as representative snippets."}</p>
          <div className="mt-3 flex justify-end">
            <Button variant="primary" size="sm" onClick={addNote}><Plus /> Add notes</Button>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-canvas">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Interviews <span className="tnum font-normal text-fg-tertiary">({plan.notes.length})</span></p>
            <Button size="sm" variant="primary" onClick={runSyn} disabled={plan.notes.length === 0 || busy !== null}>
              <Sparkles /> {busy === "syn" ? "Synthesizing…" : syn ? "Synthesize again" : "Synthesize"}
            </Button>
          </div>
          {plan.notes.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-medium">No interviews yet</p>
              <p className="mt-1 text-[13px] text-ink-2">Add notes after each conversation. When you have a few, synthesize them to update the score.</p>
            </div>
          ) : (
            <ul className="max-h-[360px] divide-y divide-line overflow-y-auto">
              {plan.notes.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-medium">{n.interviewee}</p>
                      <p className="text-xs text-fg-tertiary">{personaName(n.personaId)} · {fmtDate(n.date)}</p>
                    </div>
                    <button type="button" onClick={() => setDel(n.id)} className="rounded p-1 text-fg-tertiary hover:bg-weak-tint hover:text-weak" aria-label={`Delete notes from ${n.interviewee}`}><Trash2 className="size-3.5" /></button>
                  </div>
                  <p className="mt-1 line-clamp-3 text-[13px] text-ink-2">{n.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete these notes?"
        description="The notes are removed permanently. Any applied score update stays until you re-synthesize."
        confirmLabel="Delete notes"
        onConfirm={async () => {
          if (!del) return;
          upsert(await deleteNote(idea.id, del));
          toast.success("Notes deleted");
        }}
      />

      {busy === "syn" ? (
        <div className="grid gap-3 md:grid-cols-2" role="status" aria-label="Synthesizing"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : !syn ? (
        <div className="rounded-lg border border-dashed border-line-strong p-6 text-center text-[13px] text-ink-2">Not synthesized yet. Themes, quotes, and an assumption tracker will appear here.</div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-fg-tertiary">Synthesized {fmtDate(syn.at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} from {plan.notes.length} interview{plan.notes.length === 1 ? "" : "s"}. Synthesize again after adding notes.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-line bg-canvas p-4">
              <p className="text-sm font-semibold">Recurring themes</p>
              <ul className="mt-3 space-y-2.5">
                {syn.themes.map((t) => (
                  <li key={t.theme}>
                    <div className="flex justify-between text-[13px]"><span>{t.theme}</span><span className="tnum text-fg-tertiary">{t.count} of {plan.notes.length}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-ink/70" style={{ width: `${(t.count / Math.max(1, plan.notes.length)) * 100}%` }} /></div>
                  </li>
                ))}
                {syn.themes.length === 0 ? <li className="text-[13px] text-fg-tertiary">No recurring themes found.</li> : null}
              </ul>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-4">
              <p className="text-sm font-semibold">Representative quotes</p>
              <ul className="mt-3 space-y-2">
                {syn.quotes.map((q) => <li key={q.text} className="border-l-2 border-accent/40 pl-2 text-[13px] italic text-ink-2">&ldquo;{q.text}&rdquo; <span className="not-italic text-fg-tertiary">({q.interviewee})</span></li>)}
                {syn.quotes.length === 0 ? <li className="text-[13px] text-fg-tertiary">No quoted lines. Put direct quotes in double quotes.</li> : null}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-canvas">
            <p className="border-b border-line px-4 py-3 text-sm font-semibold">Assumption tracker</p>
            <ul className="divide-y divide-line">
              {syn.assumptions.map((a) => {
                const s = STATUS[a.status];
                return (
                  <li key={a.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{a.label}</p>
                      <p className="text-xs text-fg-tertiary">{a.refKind === "criterion" ? `${FILTER_SHORT[CRITERION_BY_ID[a.refId].filter]} criterion` : `${PILLAR_BY_ID[RWW_BY_ID[a.refId].pillar].label} sub-question`}</p>
                      {a.evidence.length ? (
                        <ul className="mt-1.5 space-y-1">{a.evidence.map((e, i) => <li key={i} className="text-xs text-ink-2">&ldquo;{e.snippet}&rdquo; <span className="text-fg-tertiary">({plan.notes.find((n) => n.id === e.noteId)?.interviewee ?? "note"})</span></li>)}</ul>
                      ) : <p className="mt-1 text-xs text-fg-tertiary">No notes speak to this yet.</p>}
                    </div>
                    <span className={cn("inline-flex h-fit w-fit items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium sm:justify-self-end [&_svg]:size-3", s.cls)}><s.Icon aria-hidden />{s.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {syn.appliedAt ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-strong/30 bg-strong-tint p-4 text-[13px] text-strong">
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4" aria-hidden /> Applied {fmtDate(syn.appliedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. The report now cites your interviews as evidence.</span>
              <Link href={`/app/ideas/${idea.id}?tab=overview`} className="font-medium underline">View updated report</Link>
            </div>
          ) : preview ? (
            <ScoreImpact preview={preview} onApply={apply} busy={busy === "apply"} />
          ) : null}
        </div>
      )}
    </section>
  );
}

function ScoreImpact({ preview, onApply, busy }: { preview: NonNullable<ReturnType<typeof previewSynthesis>>; onApply: () => void; busy: boolean }) {
  const { before, after, diff: d } = preview;
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid gap-1 border-t border-line py-3 first:border-t-0 sm:grid-cols-[180px_minmax(0,1fr)]">
      <p className="text-xs font-semibold text-ink-2">{label}</p>
      <div className="space-y-1.5 text-[13px]">{children}</div>
    </div>
  );
  return (
    <div className="rounded-lg border border-accent/40 bg-canvas p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">How this would change the score</p>
          <p className="text-xs text-ink-2">Before and after at every level. Nothing changes until you apply it.</p>
        </div>
        <Button variant="primary" onClick={onApply} disabled={busy || !d.changed}>{busy ? "Applying…" : d.changed ? "Apply update" : "No changes to apply"}</Button>
      </div>
      <div className="mt-3">
        <Row label="1. Criteria">
          {d.criteria.length ? d.criteria.map((c) => <div key={c.id} className="flex flex-wrap items-center justify-between gap-2"><span>{c.label}</span><span className="flex items-center gap-2"><CriterionDots score={c.before} /> → <CriterionDots score={c.after} /></span></div>) : <span className="text-fg-tertiary">No criterion changes</span>}
        </Row>
        <Row label="2. Filters and confidence">
          {d.filters.length ? d.filters.map((f) => <div key={f.id} className="flex justify-between gap-2"><span>{FILTER_SHORT[f.id]}</span><span className="tnum">{f.before ?? "—"} → {f.after ?? "—"} <span className="text-fg-tertiary">({f.confBefore} → {f.confAfter} confidence)</span></span></div>) : <span className="text-fg-tertiary">No filter changes</span>}
        </Row>
        <Row label="3. Real / Win / Worth It">
          {d.rww.map((r) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2"><span>{r.text.split(" (")[0]}</span><span className="flex items-center gap-1.5"><AnswerPill answer={r.before} /> → <AnswerPill answer={r.after} /></span></div>)}
          {d.pillars.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 font-medium"><span>{PILLAR_BY_ID[p.id].label} net</span><span className="flex items-center gap-1.5"><NetPill net={p.before} size="sm" /> → <NetPill net={p.after} size="sm" /></span></div>)}
          {!d.rww.length && !d.pillars.length ? <span className="text-fg-tertiary">No answer changes</span> : null}
        </Row>
        <Row label="4. Desy Score">
          <span className="tnum text-lg font-medium">{d.score.before} → {d.score.after}</span>
        </Row>
        <Row label="5. Pursuit band and caps">
          <div className="flex flex-wrap items-center gap-1.5"><BandBadge band={before.score.band} capped={before.score.band !== before.score.uncappedBand} size="sm" /> → <BandBadge band={after.score.band} capped={after.score.band !== after.score.uncappedBand} size="sm" /></div>
          <p className="text-xs text-ink-2">Caps before: {before.score.capReasons.length ? before.score.capReasons.join(" ") : "none"}</p>
          <p className="text-xs text-ink-2">Caps after: {after.score.capReasons.length ? after.score.capReasons.join(" ") : "none"}</p>
          <p className="text-xs text-fg-tertiary">{BAND_SHORT[before.score.band]} → {BAND_SHORT[after.score.band]}</p>
        </Row>
      </div>
    </div>
  );
}
