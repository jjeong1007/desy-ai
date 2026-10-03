"use client";
import { ArrowRight, Check, MessagesSquare, Search, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FILTERS } from "@/config/criteria";
import { BAND_LABEL, SCORING_CONFIG } from "@/config/scoring";
import { PUBLIC_CATEGORIES, publicSources } from "@/config/sources";
import { MarketingShell } from "@/components/marketing/site-chrome";
import { FilterCard } from "@/components/report/sections";
import { FilterChart, RwwStrip, ScoreHeader, ScoreRail } from "@/components/report/score-header";
import { BandBadge, SentimentTag } from "@/components/report/markers";
import { FrameworkTag } from "@/components/report/framework-tag";
import { SourceLabel } from "@/components/sources/data-sources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { SAMPLE_IDEA, SAMPLE_REPORT } from "@/lib/sample";
import { money } from "@/lib/utils";

const FAQ = [
  {
    q: "How accurate is a Desy Score?",
    a: "The score is only as solid as the evidence behind it. Each of 25 criteria is scored 0–4 from findings, or left as Needs evidence when nothing supports it. Thin evidence lowers confidence and can cap the pursuit band. This demo replays realistic sample findings, so treat a score here as a worked example of the method.",
  },
  {
    q: "Which sources does Desy use?",
    a: "The product is built to read community forums, open-source repositories, product directories and review sites, search-trend data, and startup and funding news. Paid or licensed databases are not named until access is confirmed. This demo does not call those sources.",
  },
  {
    q: "Who is it for?",
    a: "Solo founders and very small teams who want a small, profitable SaaS, enough monthly revenue to eventually leave a job. You can write the code, use AI or no-code tools, or hire a developer. The intake asks which, and the Economic filter and the Win and Worth It checks use that answer.",
  },
  {
    q: "How are the score and the bands calculated?",
    a: `Five filters — Customer, Economic, Competition, Channel, and Timing — each score 0–100. The Desy Score is their weighted average, equal weights by default. Strong pursuit is ${SCORING_CONFIG.bands.strongMin}–100, Promising is ${SCORING_CONFIG.bands.promisingMin}–${SCORING_CONFIG.bands.strongMin - 1}, and Weak is 0–${SCORING_CONFIG.bands.promisingMin - 1}. Real / Win / Worth It is a separate gate. It never changes the number. A No caps the band at Weak. A filter below ${SCORING_CONFIG.knockoutBelow}, or one with too little evidence, caps it at Promising.`,
  },
  {
    q: "What do I do after I get a score?",
    a: "The report lists the next three things to do, a few narrower directions, and the assumptions that still need evidence. The Research Planner turns those into a customer-discovery script or a pitch. After you talk to people, you paste notes, synthesize them, and apply an update that recalculates the score.",
  },
  {
    q: "Can a decent score still be a weak pursuit?",
    a: "Yes. That is what the gate is for. One of the sample ideas, a generic AI note-taking app, lands in the Promising range on the number because Timing and Customer look fine. Competition is a knockout and Win is No, so the band is capped at Weak. The score alone would have been misleading.",
  },
  {
    q: "What happens to my data?",
    a: "In this demo there is no account server. Ideas, notes, and settings stay in your browser. Signing out keeps them on this device. Clearing site data removes them. A future backend can replace the service layer without changing the screens.",
  },
];

function SampleBody({ idPrefix, onFilter }: { idPrefix: string; onFilter?: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <ScoreHeader report={SAMPLE_REPORT} compact headingId={`${idPrefix}score`} onFilter={onFilter} />
      <div className="grid gap-3">
        {SAMPLE_REPORT.filters.map((f) => (
          <FilterCard key={f.id} f={f} idea={SAMPLE_IDEA} idPrefix={idPrefix} />
        ))}
      </div>
      <p className="text-xs text-muted">Sample idea: {SAMPLE_IDEA.intake.name}. Evidence is simulated and stored with the app.</p>
    </div>
  );
}

export function LandingPage() {
  const [preview, setPreview] = useState(false);
  const named = publicSources();
  const findings = (SAMPLE_IDEA.analysis?.findings ?? []).slice(0, 3);

  return (
    <MarketingShell>
      <section className="border-b border-line">
        <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
          <div>
            <p className="text-[13px] font-medium text-accent-strong">For solo founders building a small SaaS</p>
            <h1 className="mt-3 max-w-[18ch] text-4xl font-semibold leading-[1.05] text-balance md:text-5xl">Know whether your idea is worth building before you build it.</h1>
            <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-ink-2">
              You want reliable monthly revenue, enough to leave a 9-to-5, whether you write the code or not. Desy gathers evidence, scores the opportunity, and tells you what to test before you spend months building.
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="primary" size="lg">
                <Link href="/sign-up">
                  Validate an idea <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" onClick={() => setPreview(true)}>
                See a sample report
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-canvas p-4 md:p-5">
            <p className="text-[13px] font-medium text-ink-2">Desy Score</p>
            <p className="tnum mt-1 text-[48px] font-semibold leading-none" aria-label={`Sample Desy Score ${SAMPLE_REPORT.score.overall} out of 100`}>
              {SAMPLE_REPORT.score.overall}
            </p>
            <div className="mt-3">
              <BandBadge band={SAMPLE_REPORT.score.band} full />
            </div>
            <div className="mt-5">
              <ScoreRail score={SAMPLE_REPORT.score.overall} band={SAMPLE_REPORT.score.band} uncappedBand={SAMPLE_REPORT.score.uncappedBand} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink">{SAMPLE_REPORT.score.reason}</p>
            <div className="mt-4">
              <RwwStrip report={SAMPLE_REPORT} size="sm" />
            </div>
            <p className="mt-4 text-xs text-muted">{SAMPLE_IDEA.intake.name}</p>
          </div>
        </div>
      </section>

      <section id="problem" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6">
          <h2 className="text-2xl font-semibold md:text-3xl">Guessing is the expensive part</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Weeks picking an idea", "There is no shortage of things you could build. There is a shortage of a way to judge them before you commit."],
              ["Money spent on something nobody wants", "Ads, landing pages, and tools add up while you are still unsure anyone will pay."],
              ["The answer arrives after the MVP", "You find out the problem is rare, the market is owned, or the price doesn't work only once the product exists."],
            ].map(([title, body]) => (
              <article key={title} className="rounded-lg border border-line p-5">
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6">
          <h2 className="text-2xl font-semibold md:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["1", "Describe the idea", "The customer, the workaround, the price, your MRR goal, and how it will get built."],
              ["2", "Agents research it", "They read public discussions, product listings, search trends, funding news, and a library of validation frameworks. In this demo, that run is simulated."],
              ["3", "Get a score and a plan", "A Desy Score, a pursuit band, the evidence behind both, and a plan for the assumptions that could change the answer."],
            ].map(([n, title, body]) => (
              <li key={n} className="rounded-lg border border-line bg-canvas p-5">
                <span className="tnum text-[13px] font-medium text-accent-strong">Step {n}</span>
                <h3 className="mt-2 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="scoring" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6">
          <div className="max-w-[68ch]">
            <h2 className="text-2xl font-semibold md:text-3xl">How Desy scores an idea</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Two frameworks do different jobs. The five filters score the opportunity. Real / Win / Worth It asks whether you should pursue it. The gate can cap the band. It never changes the score, so the filter cards still add up to the headline number.
            </p>
            <p className="mt-2 text-xs text-muted">The filter names and the 25 criteria come from the course. The 0–4 anchors, the weights, the band cutoffs, and the cap rules are Desy&apos;s, and they need calibration.</p>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <li key={f.id} className="rounded border border-line px-2.5 py-1 text-[13px]">
                <span className="font-medium">{f.short}.</span> <span className="text-ink-2">{f.question}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
            {(Object.keys(BAND_LABEL) as (keyof typeof BAND_LABEL)[]).map((b) => (
              <span key={b} className="inline-flex items-center gap-2">
                <BandBadge band={b} full />
                <span className="text-muted">
                  {b === "strong" ? `${SCORING_CONFIG.bands.strongMin}–100` : b === "promising" ? `${SCORING_CONFIG.bands.promisingMin}–${SCORING_CONFIG.bands.strongMin - 1}` : `0–${SCORING_CONFIG.bands.promisingMin - 1}`}
                </span>
              </span>
            ))}
          </div>
          <div className="mt-8">
            <ScoreHeader report={SAMPLE_REPORT} />
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6">
          <h2 className="text-2xl font-semibold md:text-3xl">What you get</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <article className="flex flex-col rounded-lg border border-line bg-canvas p-4">
              <Search className="size-4 text-accent-strong" aria-hidden />
              <h3 className="mt-3 text-base font-semibold">Idea de-risking</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">One score, five filters, and a gate that catches a fatal flaw a good average can hide.</p>
              <div className="mt-4 rounded border border-line p-3">
                <FilterChart report={SAMPLE_REPORT} compact />
              </div>
            </article>
            <article className="flex flex-col rounded-lg border border-line bg-canvas p-4">
              <MessagesSquare className="size-4 text-accent-strong" aria-hidden />
              <h3 className="mt-3 text-base font-semibold">Data sources</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">Every finding the agents used, with the criterion it supports or weakens. You can pin, note, or hide one and see the score move.</p>
              <ul className="mt-4 divide-y divide-line rounded border border-line">
                {findings.map((f) => (
                  <li key={f.id} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <SourceLabel sourceId={f.sourceId} />
                      <SentimentTag s={f.sentiment} />
                    </div>
                    <p className="mt-1 text-[13px] font-medium leading-snug">{f.title}</p>
                  </li>
                ))}
              </ul>
            </article>
            <article className="flex flex-col rounded-lg border border-line bg-canvas p-4">
              <ClipboardList className="size-4 text-accent-strong" aria-hidden />
              <h3 className="mt-3 text-base font-semibold">Research planner</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">A discovery script or a pitch aimed at the weakest evidence. Questions ask about past behavior, and the pitch comes last.</p>
              <div className="mt-4 rounded border border-line p-3">
                <p className="text-xs font-medium text-muted">Tests Customer → Frequently experienced problem</p>
                <p className="mt-1 text-sm">How many times did that come up in the last month?</p>
                <div className="mt-2">
                  <FrameworkTag id="discovery" />
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="sources" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6">
          <h2 className="text-2xl font-semibold md:text-3xl">Where the evidence comes from</h2>
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-ink-2">Categories only, until a real integration is confirmed. Named vendors appear here when their access flag is turned on.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {PUBLIC_CATEGORIES.map((c) => (
              <li key={c.category} className="rounded-lg border border-line p-4">
                <h3 className="text-sm font-semibold">{c.category}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{c.description}</p>
              </li>
            ))}
          </ul>
          {named.length ? (
            <p className="mt-4 text-sm text-ink-2">
              Confirmed sources: {named.map((s) => s.name).join(", ")}.
            </p>
          ) : (
            <p className="mt-4 text-sm text-ink-2">No third-party source is named yet. Licensed databases stay off this page until access is confirmed.</p>
          )}
        </div>
      </section>

      <section id="sample" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-[62ch]">
              <h2 className="text-2xl font-semibold md:text-3xl">Sample report</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">Invoice reminders for freelance designers. Open a filter to read the criteria, the solo-founder reading, and the evidence.</p>
            </div>
            <Button onClick={() => setPreview(true)}>Open larger preview</Button>
          </div>
          <div className="mt-6 max-h-[720px] overflow-y-auto rounded-lg border border-line bg-canvas p-3 md:p-5">
            <SampleBody idPrefix="sample-" onFilter={(id) => document.getElementById(`sample-filter-${id}`)?.scrollIntoView({ block: "start" })} />
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-16 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold md:text-3xl">Pricing</h2>
            <Link href="/pricing" className="text-sm font-medium text-accent-strong hover:underline">
              See pricing
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-line p-5">
              <h3 className="text-base font-semibold">Free</h3>
              <p className="tnum mt-2 text-3xl font-medium">{money(0)}</p>
              <ul className="mt-4 space-y-2 text-sm text-ink-2">
                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-strong" aria-hidden /> 1 idea</li>
                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-strong" aria-hidden /> Sample report</li>
              </ul>
            </article>
            <article className="rounded-lg border border-line p-5">
              <h3 className="text-base font-semibold">Pro</h3>
              <p className="tnum mt-2 text-3xl font-medium">{money(29)}<span className="text-base font-normal text-muted">/month</span></p>
              <ul className="mt-4 space-y-2 text-sm text-ink-2">
                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-strong" aria-hidden /> Unlimited ideas</li>
                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-strong" aria-hidden /> Re-runs and the research planner</li>
              </ul>
            </article>
          </div>
          <p className="mt-3 text-xs text-muted">Placeholder prices. Billing is not connected.</p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto w-full max-w-[760px] px-4 py-16 md:px-6">
          <h2 className="text-2xl font-semibold md:text-3xl">Questions</h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-muted group-open:rotate-45" aria-hidden>+</span>
                  </span>
                </summary>
                <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ink-2">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-start gap-4 px-4 py-16 md:px-6">
          <h2 className="max-w-[20ch] text-3xl font-semibold">Put a number on the idea before you build it.</h2>
          <Button asChild variant="primary" size="lg">
            <Link href="/sign-up">
              Validate an idea <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent title="Sample report" description={`${SAMPLE_IDEA.intake.name}. A strong-pursuit example from the demo data.`} wide className="max-w-5xl">
          <SampleBody idPrefix="dlg-" onFilter={(id) => document.getElementById(`dlg-filter-${id}`)?.scrollIntoView({ block: "start" })} />
          <div className="mt-4">
            <Button
              size="sm"
              onClick={() => {
                setPreview(false);
                document.getElementById("sample")?.scrollIntoView({ block: "start" });
              }}
            >
              Keep reading on the page
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MarketingShell>
  );
}
