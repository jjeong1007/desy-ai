"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { cn, money } from "@/lib/utils";
import { startAnalysis } from "@/services/analysis";
import { EMPTY_INTAKE, saveDraft, updateIntake } from "@/services/ideas";
import { useDesy } from "@/store/desy";
import type { BuildPath, Familiarity, IntakeInput } from "@/types";

const STEPS = [
  { id: "idea", title: "The idea", blurb: "A name and one sentence a stranger could repeat." },
  { id: "problem", title: "The problem", blurb: "Who has it, and what they do today." },
  { id: "offer", title: "Offer and price", blurb: "What you'd sell, and the path to monthly revenue." },
  { id: "founder", title: "You", blurb: "Hours, budget, and how this gets built." },
  { id: "reach", title: "Reach and review", blurb: "Optional context, then run the analysis." },
] as const;

const BUILD: { id: BuildPath; label: string; hint: string }[] = [
  { id: "selfCoded", label: "I'll code it myself", hint: "Judged on your weekly hours." },
  { id: "aiNoCode", label: "AI or no-code tools", hint: "Judged on whether the features fit those tools." },
  { id: "hiredDeveloper", label: "I'll hire a developer", hint: "Judged on the build budget versus your total budget." },
  { id: "notSure", label: "Not sure yet", hint: "Low development costs stays Needs evidence." },
];

const FAMILIAR: { id: Familiarity; label: string }[] = [
  { id: "iAmOne", label: "I am one" },
  { id: "workedWith", label: "I've worked with them" },
  { id: "talkedToFew", label: "I've talked to a few" },
  { id: "outsideView", label: "Outside view" },
];

function validate(intake: IntakeInput, step: number): Record<string, string> {
  const e: Record<string, string> = {};
  const bad = (key: string, msg: string) => {
    e[key] = msg;
  };
  const check = (s: number) => {
    if (s === 0) {
      if (intake.name.trim().length < 2) bad("name", "Name the idea in a few words.");
      if (intake.oneLiner.trim().length < 8) bad("oneLiner", "Write one sentence, at least a few words.");
    }
    if (s === 1) {
      if (intake.targetCustomer.trim().length < 3) bad("targetCustomer", "Name the customer: a role and a kind of company.");
      if (intake.problem.trim().length < 8) bad("problem", "State the problem as a job they need done.");
      if (intake.currentSolution.trim().length < 3) bad("currentSolution", "Say how they handle it today, even if the answer is a spreadsheet or nothing.");
    }
    if (s === 2) {
      if (intake.solution.trim().length < 8) bad("solution", "Describe the product in a sentence or two.");
      if (intake.keyFeatures.trim().length < 3) bad("keyFeatures", "List the few features that make the core job work.");
      if (!(intake.price > 0)) bad("price", "Enter a monthly price above zero.");
      if (!(intake.mrrGoal > 0)) bad("mrrGoal", "Enter the monthly revenue you want.");
      if (!(intake.timelineMonths >= 1 && intake.timelineMonths <= 60)) bad("timelineMonths", "Use a timeline between 1 and 60 months.");
      if (intake.runningCost != null && intake.runningCost < 0) bad("runningCost", "Running cost can't be negative.");
    }
    if (s === 3) {
      if (intake.skills.trim().length < 3) bad("skills", "Name a skill, a past job, or an audience you already have.");
      if (!(intake.weeklyHours >= 1 && intake.weeklyHours <= 80)) bad("weeklyHours", "Enter between 1 and 80 hours a week.");
      if (!(intake.budget >= 0)) bad("budget", "Enter a budget of zero or more.");
      if (!intake.buildPath) bad("buildPath", "Choose how this will get built.");
      if (!intake.familiarity) bad("familiarity", "Say how well you know these customers.");
      if (intake.buildPath === "hiredDeveloper" && intake.buildBudget != null && intake.buildBudget < 0) bad("buildBudget", "Build budget can't be negative.");
    }
  };
  if (step >= STEPS.length - 1) for (let i = 0; i < STEPS.length - 1; i++) check(i);
  else check(step);
  return e;
}

function firstBadStep(intake: IntakeInput) {
  for (let i = 0; i < STEPS.length - 1; i++) if (Object.keys(validate(intake, i)).length) return i;
  return STEPS.length - 1;
}

export function IntakeForm() {
  const params = useSearchParams();
  const paramId = params.get("draft") || params.get("edit");
  const editing = !!params.get("edit");
  const router = useRouter();
  const hydrated = useDesy((s) => s.hydrated);
  const upsert = useDesy((s) => s.upsertIdea);
  const [intake, setIntake] = useState<IntakeInput>({ ...EMPTY_INTAKE });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const loaded = useRef<string | null>(null);
  const idRef = useRef<string | null>(paramId);

  useEffect(() => {
    if (!hydrated) return;
    const key = paramId ?? "new";
    if (loaded.current === key) return;
    loaded.current = key;
    idRef.current = paramId;
    if (!paramId) {
      setIntake({ ...EMPTY_INTAKE });
      setStep(0);
      setMissing(false);
      return;
    }
    const idea = useDesy.getState().ideas.find((i) => i.id === paramId);
    if (!idea) {
      setMissing(true);
      return;
    }
    setIntake({ ...idea.intake });
    setStep(idea.status === "draft" ? Math.min(idea.draftStep ?? 0, STEPS.length - 1) : 0);
    setMissing(false);
  }, [hydrated, paramId]);

  const set = (patch: Partial<IntakeInput>) => setIntake((cur) => ({ ...cur, ...patch }));

  const persist = async (nextStep: number) => {
    const existing = idRef.current ? useDesy.getState().ideas.find((i) => i.id === idRef.current) : null;
    if (existing && existing.status !== "draft") {
      const saved = await updateIntake(existing.id, intake, { kind: "edited", summary: "Idea inputs updated" });
      upsert(saved);
      return saved;
    }
    const saved = await saveDraft(existing?.id ?? null, intake, nextStep);
    idRef.current = saved.id;
    upsert(saved);
    if (!existing) router.replace(`/app/ideas/new?draft=${saved.id}`);
    return saved;
  };

  const save = async () => {
    setSaving(true);
    try {
      await persist(step);
      toast.success(editing ? "Inputs saved" : "Draft saved");
    } catch {
      toast.error("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const go = (next: number) => {
    if (next > step) {
      for (let i = step; i < next && i < STEPS.length - 1; i++) {
        const e = validate(intake, i);
        if (Object.keys(e).length) {
          setErrors(e);
          setStep(i);
          return;
        }
      }
    }
    setErrors({});
    setStep(Math.max(0, next));
  };

  const submit = async () => {
    const bad = firstBadStep(intake);
    const e = validate(intake, STEPS.length - 1);
    setErrors(e);
    if (Object.keys(e).length) {
      setStep(bad);
      toast.error("A few answers are still missing.");
      return;
    }
    setRunning(true);
    try {
      const saved = await persist(STEPS.length - 1);
      const started = await startAnalysis(saved.id);
      upsert(started);
      router.push(`/app/ideas/${started.id}/run`);
    } catch {
      toast.error("Couldn't start the analysis. Try again.");
      setRunning(false);
    }
  };

  if (!hydrated) return <PageSkeleton />;
  if (missing) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Draft not found</h1>
        <p className="mt-1 text-sm text-ink-2">It may have been deleted.</p>
        <Button asChild className="mt-4" variant="primary"><Link href="/app/ideas/new">Start a new idea</Link></Button>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
      <p className="text-[13px] font-medium text-accent-strong">{editing ? "Edit inputs" : "New idea"}</p>
      <h1 className="mt-1 text-page-title font-semibold">{STEPS[step].title}</h1>
      <p className="mt-1 text-sm text-ink-2">{STEPS[step].blurb}</p>
      {editing ? <p className="mt-2 text-xs text-fg-tertiary">Saving keeps the current report. Running the analysis replaces the findings.</p> : null}

      <div className="mt-5" aria-hidden>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <ol className="mt-3 flex gap-1 overflow-x-auto" aria-label="Intake progress">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn("rounded px-2 py-1 text-xs font-medium", i === step ? "bg-accent-tint text-accent-strong" : "text-fg-tertiary hover:bg-surface hover:text-ink")}
            >
              {i + 1}. {s.title}
            </button>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">Step {step + 1} of {STEPS.length}: {STEPS[step].title}</p>

      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === STEPS.length - 1) void submit();
          else go(step + 1);
        }}
        noValidate
      >
        {step === 0 ? (
          <>
            <Field id="name" label="Idea name" example="Invoice reminders for freelance designers" error={errors.name}>
              <Input id="name" value={intake.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={described("name", errors)} />
            </Field>
            <Field id="oneLiner" label="One-line description" example="Automatic, polite payment reminders designers set once and forget." error={errors.oneLiner}>
              <Textarea id="oneLiner" value={intake.oneLiner} onChange={(e) => set({ oneLiner: e.target.value })} aria-invalid={!!errors.oneLiner} aria-describedby={described("oneLiner", errors)} />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Field id="targetCustomer" label="Who has this problem?" usedIn="Customer filter" example="Solo brand and UI designers billing 3–15 clients a month" error={errors.targetCustomer}>
              <Textarea id="targetCustomer" value={intake.targetCustomer} onChange={(e) => set({ targetCustomer: e.target.value })} aria-invalid={!!errors.targetCustomer} aria-describedby={described("targetCustomer", errors)} />
            </Field>
            <Field id="problem" label="The problem" usedIn="Customer filter, Real" example="They lose hours chasing late invoices and feel awkward following up." error={errors.problem}>
              <Textarea id="problem" value={intake.problem} onChange={(e) => set({ problem: e.target.value })} aria-invalid={!!errors.problem} aria-describedby={described("problem", errors)} />
            </Field>
            <Field id="currentSolution" label="How they solve it today" usedIn="Customer filter, Competition filter" example="Calendar reminders and manual follow-up emails." error={errors.currentSolution}>
              <Textarea id="currentSolution" value={intake.currentSolution} onChange={(e) => set({ currentSolution: e.target.value })} aria-invalid={!!errors.currentSolution} aria-describedby={described("currentSolution", errors)} />
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field id="solution" label="Proposed solution" usedIn="Real" example="Connects to their invoicing tool and sends escalating, on-brand reminders." error={errors.solution}>
              <Textarea id="solution" value={intake.solution} onChange={(e) => set({ solution: e.target.value })} aria-invalid={!!errors.solution} aria-describedby={described("solution", errors)} />
            </Field>
            <Field id="keyFeatures" label="Key features" example="Invoice sync, reminder sequences, late-fee rules" error={errors.keyFeatures}>
              <Textarea id="keyFeatures" value={intake.keyFeatures} onChange={(e) => set({ keyFeatures: e.target.value })} aria-invalid={!!errors.keyFeatures} aria-describedby={described("keyFeatures", errors)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="price" label="Monthly price per customer" usedIn="Economic filter, Path to MRR, Worth It" example="$12" error={errors.price}>
                <Input id="price" inputMode="decimal" type="number" min={1} step={1} value={intake.price || ""} onChange={(e) => set({ price: Number(e.target.value) })} aria-invalid={!!errors.price} aria-describedby={described("price", errors)} />
              </Field>
              <Field id="mrrGoal" label="MRR goal" usedIn="Customer → Sizable customer base, Worth It" example="$3,000, $5,000, or $10,000 a month" error={errors.mrrGoal}>
                <Input id="mrrGoal" inputMode="decimal" type="number" min={1} step={100} value={intake.mrrGoal || ""} onChange={(e) => set({ mrrGoal: Number(e.target.value) })} aria-invalid={!!errors.mrrGoal} aria-describedby={described("mrrGoal", errors)} />
              </Field>
              <Field id="timelineMonths" label="Timeline (months)" usedIn="Worth It" example="12" error={errors.timelineMonths}>
                <Input id="timelineMonths" inputMode="numeric" type="number" min={1} max={60} value={intake.timelineMonths || ""} onChange={(e) => set({ timelineMonths: Number(e.target.value) })} aria-invalid={!!errors.timelineMonths} aria-describedby={described("timelineMonths", errors)} />
              </Field>
              <Field id="runningCost" label="Running cost per customer / month" usedIn="Economic → Low variable costs" hint="Optional. AI API usage, hosting, no-code fees." error={errors.runningCost}>
                <Input id="runningCost" inputMode="decimal" type="number" min={0} step="0.1" value={intake.runningCost ?? ""} placeholder="0.60" onChange={(e) => set({ runningCost: e.target.value === "" ? null : Number(e.target.value) })} aria-invalid={!!errors.runningCost} aria-describedby={described("runningCost", errors)} />
              </Field>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field id="skills" label="Relevant skills or unfair advantage" usedIn="Win" example="You freelanced in this field, or you already have an audience there." error={errors.skills}>
              <Textarea id="skills" value={intake.skills} onChange={(e) => set({ skills: e.target.value })} aria-invalid={!!errors.skills} aria-describedby={described("skills", errors)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="weeklyHours" label="Weekly hours available" usedIn="Win, Worth It" error={errors.weeklyHours}>
                <Input id="weeklyHours" inputMode="numeric" type="number" min={1} max={80} value={intake.weeklyHours || ""} onChange={(e) => set({ weeklyHours: Number(e.target.value) })} aria-invalid={!!errors.weeklyHours} aria-describedby={described("weeklyHours", errors)} />
              </Field>
              <Field id="budget" label="Budget (USD)" usedIn="Worth It" hint="Tools, ads, and any contractor, for the whole attempt." error={errors.budget}>
                <Input id="budget" inputMode="decimal" type="number" min={0} step={100} value={intake.budget} onChange={(e) => set({ budget: Number(e.target.value) })} aria-invalid={!!errors.budget} aria-describedby={described("budget", errors)} />
              </Field>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">How will this get built?</legend>
              <p className="mt-1 text-xs text-fg-tertiary">Required. <span className="rounded bg-surface px-1.5 py-0.5 font-medium text-ink-2">Used in: Economic filter, Win, Worth It</span></p>
              <div className="mt-2 grid gap-2" role="radiogroup" aria-invalid={!!errors.buildPath} aria-describedby={errors.buildPath ? "buildPath-err" : undefined}>
                {BUILD.map((b) => (
                  <label key={b.id} className={cn("flex cursor-pointer gap-3 rounded border px-3 py-2", intake.buildPath === b.id ? "border-accent bg-accent-tint/40" : "border-line")}>
                    <input type="radio" name="buildPath" className="mt-1" checked={intake.buildPath === b.id} onChange={() => set({ buildPath: b.id, buildBudget: b.id === "hiredDeveloper" ? intake.buildBudget : null })} />
                    <span>
                      <span className="block text-sm font-medium">{b.label}</span>
                      <span className="block text-xs text-ink-2">{b.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              {errors.buildPath ? <p id="buildPath-err" className="mt-1 text-xs text-weak">{errors.buildPath}</p> : null}
            </fieldset>
            {intake.buildPath === "hiredDeveloper" ? (
              <Field id="buildBudget" label="Estimated build budget" usedIn="Worth It" hint="Optional. Drag a range or type a number." error={errors.buildBudget}>
                <div className="flex flex-col gap-2">
                  <input
                    type="range"
                    min={500}
                    max={50000}
                    step={500}
                    value={intake.buildBudget ?? 5000}
                    onChange={(e) => set({ buildBudget: Number(e.target.value) })}
                    aria-label="Build budget range"
                    className="w-full accent-[rgb(var(--accent-strong))]"
                  />
                  <Input id="buildBudget" inputMode="decimal" type="number" min={0} step={500} value={intake.buildBudget ?? ""} placeholder="5000" onChange={(e) => set({ buildBudget: e.target.value === "" ? null : Number(e.target.value) })} aria-invalid={!!errors.buildBudget} aria-describedby={described("buildBudget", errors)} />
                  <p className="text-xs text-fg-tertiary">{intake.buildBudget != null ? money(intake.buildBudget) : "Leave blank if you don't have a quote yet."}</p>
                </div>
              </Field>
            ) : null}
            <fieldset>
              <legend className="text-sm font-medium">How well do you know these customers?</legend>
              <p className="mt-1 text-xs text-fg-tertiary"><span className="rounded bg-surface px-1.5 py-0.5 font-medium text-ink-2">Used in: Win</span></p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-describedby={errors.familiarity ? "familiarity-err" : undefined}>
                {FAMILIAR.map((f) => (
                  <label key={f.id} className={cn("flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm", intake.familiarity === f.id ? "border-accent bg-accent-tint/40" : "border-line")}>
                    <input type="radio" name="familiarity" checked={intake.familiarity === f.id} onChange={() => set({ familiarity: f.id })} />
                    {f.label}
                  </label>
                ))}
              </div>
              {errors.familiarity ? <p id="familiarity-err" className="mt-1 text-xs text-weak">{errors.familiarity}</p> : null}
            </fieldset>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Field id="whyNow" label="Why now?" usedIn="Timing filter" hint="Optional. What changed that makes this possible or needed.">
              <Textarea id="whyNow" value={intake.whyNow} onChange={(e) => set({ whyNow: e.target.value })} aria-describedby="whyNow-hint" />
            </Field>
            <Field id="regulatory" label="Regulatory or compliance concerns" usedIn="Timing → No regulatory gotchas" hint="Optional. Licensing, privacy, or platform rules.">
              <Textarea id="regulatory" value={intake.regulatory} onChange={(e) => set({ regulatory: e.target.value })} aria-describedby="regulatory-hint" />
            </Field>
            <Field id="distributionIdeas" label="Where can you reach them?" usedIn="Channel filter" hint="Optional. Communities, search terms, partners, or lists.">
              <Textarea id="distributionIdeas" value={intake.distributionIdeas} onChange={(e) => set({ distributionIdeas: e.target.value })} aria-describedby="distributionIdeas-hint" />
            </Field>
            <Review intake={intake} onJump={(i) => { setErrors({}); setStep(i); }} />
          </>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={step === 0 || running}>
            <ChevronLeft /> Back
          </Button>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void save()} disabled={saving || running}>
              {saving ? "Saving…" : editing ? "Save inputs" : "Save draft"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="submit" variant="primary">
                Next <ChevronRight />
              </Button>
            ) : (
              <Button type="submit" variant="primary" disabled={running}>
                {running ? "Starting agents…" : "Run analysis"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function described(id: string, errors: Record<string, string>) {
  return [errors[id] ? `${id}-err` : null, `${id}-hint`].filter(Boolean).join(" ") || undefined;
}

function Field({ id, label, hint, example, usedIn, error, children }: { id: string; label: string; hint?: string; example?: string; usedIn?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {usedIn ? <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-2">Used in: {usedIn}</span> : null}
      </div>
      <p id={`${id}-hint`} className="mt-1 text-xs leading-relaxed text-fg-tertiary">
        {hint}{hint && example ? " " : ""}{example ? <>Example: {example}</> : null}
      </p>
      <div className="mt-1.5">{children}</div>
      {error ? <p id={`${id}-err`} className="mt-1 text-xs text-weak">{error}</p> : null}
    </div>
  );
}

function Review({ intake, onJump }: { intake: IntakeInput; onJump: (step: number) => void }) {
  const build = BUILD.find((b) => b.id === intake.buildPath)?.label ?? "Not chosen";
  const fam = FAMILIAR.find((f) => f.id === intake.familiarity)?.label ?? "Not chosen";
  const rows: { step: number; label: string; value: string }[] = [
    { step: 0, label: "Idea", value: `${intake.name} — ${intake.oneLiner}` },
    { step: 1, label: "Customer", value: intake.targetCustomer },
    { step: 1, label: "Problem", value: intake.problem },
    { step: 2, label: "Price and goal", value: `${money(intake.price)}/mo toward ${money(intake.mrrGoal)} in ${intake.timelineMonths} months` },
    { step: 3, label: "Build path", value: build },
    { step: 3, label: "Customer familiarity", value: fam },
    { step: 3, label: "Hours and budget", value: `${intake.weeklyHours} h/week, ${money(intake.budget)} budget` },
  ];
  return (
    <section aria-labelledby="review-h" className="rounded-lg border border-line p-4">
      <h2 id="review-h" className="text-sm font-semibold">Review</h2>
      <dl className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-3">
            <div>
              <dt className="text-xs text-fg-tertiary">{r.label}</dt>
              <dd className="text-sm text-ink">{r.value || "—"}</dd>
            </div>
            <button type="button" onClick={() => onJump(r.step)} className="shrink-0 text-xs font-medium text-accent-strong hover:underline">
              Edit
            </button>
          </div>
        ))}
      </dl>
    </section>
  );
}
