"use client";
import { ClipboardList, FileText, Home, MessageCircle, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SCORING_CONFIG } from "@/config/scoring";
import { MarketingShell } from "@/components/marketing/site-chrome";
import { CitedFindingVisual, IdeaScoreVisual } from "@/components/marketing/scoring-visuals";
import { Container, DemoFrame, FeatureRow, Reveal, SectionHeader, useInView } from "@/components/marketing/layout";
import { Accordion } from "@/components/marketing/parts";
import { HeroDots } from "@/components/marketing/hero-dots";
import { PricingBlock } from "@/components/marketing/pricing-block";
import { FilterCard } from "@/components/report/sections";
import { ScoreHeader } from "@/components/report/score-header";
import { SentimentTag } from "@/components/report/markers";
import { SourceLabel } from "@/components/sources/data-sources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Avatar } from "@/components/ui/avatar";
import { NavItem, NavSection, Sidebar, TeamSwitcher } from "@/components/ui/navigation";
import { Logo } from "@/components/logo";
import { SAMPLE_IDEA, SAMPLE_REPORT } from "@/lib/sample";
import { cn } from "@/lib/utils";

const FAQ = [
  {
    question: "How accurate is a Desy Score?",
    answer: "The score is only as solid as the evidence behind it. Each of 25 criteria is scored 0–4 from findings, or left as Needs evidence when nothing supports it. Thin evidence lowers confidence and can cap the pursuit band. This demo replays realistic sample findings, so treat a score here as a worked example of the method.",
  },
  {
    question: "Which sources does Desy use?",
    answer: "The product is built to read community forums, open-source repositories, product directories and review sites, search-trend data, and startup and funding news. Paid or licensed databases are not named until access is confirmed. This demo does not call those sources.",
  },
  {
    question: "Who is it for?",
    answer: "Solo founders and very small teams who want a small, profitable SaaS, enough monthly revenue to eventually leave a job. You can write the code, use AI or no-code tools, or hire a developer. The intake asks which, and the Economic filter and the Win and Worth It checks use that answer.",
  },
  {
    question: "How are the score and the bands calculated?",
    answer: `Five filters — Customer, Economic, Competition, Channel, and Timing — each score 0–100. The Desy Score is their weighted average, equal weights by default. Strong pursuit is ${SCORING_CONFIG.bands.strongMin}–100, Promising is ${SCORING_CONFIG.bands.promisingMin}–${SCORING_CONFIG.bands.strongMin - 1}, and Weak is 0–${SCORING_CONFIG.bands.promisingMin - 1}. Real / Win / Worth It is a separate gate. It never changes the number. A No caps the band at Weak. A filter below ${SCORING_CONFIG.knockoutBelow}, or one with too little evidence, caps it at Promising.`,
  },
  {
    question: "What do I do after I get a score?",
    answer: "The report lists the next three things to do, a few narrower directions, and the assumptions that still need evidence. The Research Planner turns those into a customer-discovery script or a pitch. After you talk to people, you paste notes, synthesize them, and apply an update that recalculates the score.",
  },
  {
    question: "Can a decent score still be a weak pursuit?",
    answer: "Yes. That is what the gate is for. One of the sample ideas, a generic AI note-taking app, lands in the Promising range on the number because Timing and Customer look fine. Competition is a knockout and Win is No, so the band is capped at Weak. The score alone would have been misleading.",
  },
  {
    question: "What happens to my data?",
    answer: "In this demo there is no account server. Ideas, notes, and settings stay in your browser. Signing out keeps them on this device. Clearing site data removes them. A future backend can replace the service layer without changing the screens.",
  },
];

const steps = [
  { icon: <FileText />, title: "Describe", body: "The customer, the workaround, the price, your MRR goal, and how it will get built.", meta: "A few minutes" },
  { icon: <Search />, title: "Research", body: "Agents read public discussions, product listings, search trends, funding news, and a library of validation frameworks.", meta: "Simulated in this demo" },
  { icon: <ClipboardList />, title: "Score", body: "A Desy Score, a pursuit band, the evidence behind both, and a plan for the assumptions that could change the answer.", meta: "Before you build" },
];

const STEP_MS = 7000;

function SampleBody({ idPrefix, onFilter }: { idPrefix: string; onFilter?: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-4 bg-canvas p-4 md:p-6">
      <ScoreHeader report={SAMPLE_REPORT} compact headingId={`${idPrefix}score`} onFilter={onFilter} />
      <div className="grid gap-3">
        {SAMPLE_REPORT.filters.map((f) => (
          <FilterCard key={f.id} f={f} idea={SAMPLE_IDEA} idPrefix={idPrefix} />
        ))}
      </div>
      <p className="m-0 text-small text-fg-tertiary">Sample idea: {SAMPLE_IDEA.intake.name}. Evidence is simulated and stored with the app.</p>
    </div>
  );
}

function AppPreview() {
  return (
    <div className="relative h-[563px] overflow-hidden rounded-xl border border-line bg-canvas shadow-card">
      <div className="flex h-full flex-col">
        <div className="flex h-topnav shrink-0 items-center justify-between gap-6 border-b border-line bg-canvas px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Logo href="/" />
            <div className="hidden h-[33px] min-w-0 max-w-[521px] flex-1 items-center rounded-sm border border-line px-4 text-body text-fg-tertiary sm:flex">Search ideas</div>
          </div>
          <Avatar size="lg" name="Alex Rivera" />
        </div>
        <div className="flex min-h-0 flex-1">
          <Sidebar
            className="hidden md:flex"
            header={<TeamSwitcher name="Desy" />}
            footer={
              <>
                <NavItem href="#faq" icon={<MessageCircle />}>Give feedback</NavItem>
                <NavItem href="/app/settings" icon={<Settings />}>Settings</NavItem>
              </>
            }
          >
            <NavSection>
              <NavItem href="#top" icon={<Home />} active>Home</NavItem>
            </NavSection>
            <NavSection label="Ideas">
              <NavItem href="#sample" icon={<FileText />}>Invoice reminders</NavItem>
              <NavItem href="#scoring" icon={<ClipboardList />}>How scoring works</NavItem>
            </NavSection>
          </Sidebar>
          <div className="min-w-0 flex-1 overflow-hidden bg-muted p-6 md:p-8">
            <ScoreHeader report={SAMPLE_REPORT} compact headingId="hero-score" />
          </div>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-canvas" />
    </div>
  );
}

function Workflow() {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const findings = (SAMPLE_IDEA.analysis?.findings ?? []).slice(0, 3);

  useEffect(() => {
    if (!inView || paused) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearTimeout(t);
  }, [inView, paused, active]);

  return (
    <section id="how" className="scroll-mt-24 py-12 md:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeader title="From a hunch to a number you can act on" lead="One pass covers the customer, the money, the competition, the channel, and the timing before you spend months building." />
        <Reveal delay={120}>
          <div ref={ref} className="flex flex-col gap-4" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="grid gap-3 md:grid-cols-3">
              {steps.map((s, i) => {
                const on = i === active;
                return (
                  <button
                    key={s.title}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setActive(i)}
                    className={cn("relative flex flex-col gap-4 overflow-hidden rounded-lg border p-6 text-left transition-colors", on ? "border-line bg-canvas shadow-card" : "border-transparent bg-muted hover:bg-subtle")}
                  >
                    <span className="absolute inset-x-0 top-0 h-0.5 bg-line">
                      <span className={cn("block h-full bg-brand", on ? "w-full" : "w-0")} />
                    </span>
                    <span className="flex items-center justify-between">
                      <span className={cn("inline-flex size-8 items-center justify-center rounded-sm [&_svg]:size-4", on ? "bg-brand text-on-brand" : "bg-subtle text-fg-secondary")}>{s.icon}</span>
                      <span className="text-caption font-medium text-fg-tertiary">{s.meta}</span>
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-small font-medium text-fg-tertiary">Step {i + 1}</span>
                      <span className="text-heading font-medium text-fg">{s.title}</span>
                    </span>
                    <span className="text-body text-fg-secondary">{s.body}</span>
                  </button>
                );
              })}
            </div>
            <DemoFrame label={`${steps[active].title} preview`} background="/marketing/feature-dunes.png" windowClassName="border-0 bg-transparent p-0 shadow-none">
              {active === 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Customer", SAMPLE_IDEA.intake.targetCustomer],
                    ["Problem", SAMPLE_IDEA.intake.problem],
                    ["Price", `$${SAMPLE_IDEA.intake.price}/mo`],
                    ["MRR goal", `$${SAMPLE_IDEA.intake.mrrGoal.toLocaleString("en-US")}`],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex flex-col gap-1 rounded-lg border border-line bg-canvas p-4">
                      <span className="text-small font-medium text-fg-tertiary">{label}</span>
                      <span className="text-body font-medium text-fg">{value}</span>
                    </div>
                  ))}
                </div>
              )}
              {active === 1 && (
                <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-lg border border-line bg-canvas p-0">
                  {findings.map((f) => (
                    <li key={f.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <SourceLabel sourceId={f.sourceId} />
                        <SentimentTag s={f.sentiment} />
                      </div>
                      <p className="m-0 mt-1 text-body font-medium text-fg">{f.title}</p>
                    </li>
                  ))}
                </ul>
              )}
              {active === 2 && <ScoreHeader report={SAMPLE_REPORT} compact headingId="workflow-score" />}
            </DemoFrame>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export function LandingPage() {
  const [preview, setPreview] = useState(false);

  return (
    <MarketingShell>
      <section id="top" className="relative isolate overflow-hidden pt-12 md:pt-[72px]">
        <HeroDots className="pointer-events-none absolute inset-0 -z-10 size-full [mask-image:linear-gradient(to_bottom,black_40%,transparent_85%)]" />
        <Container>
          <Reveal className="flex max-w-[891px] flex-col items-start gap-8">
            <h1 className="m-0 text-page-title font-medium text-fg md:text-display-sm lg:text-display">Know whether your idea is worth building before you build it.</h1>
            <p className="m-0 max-w-[764px] text-heading font-medium text-fg-secondary">
              You want reliable monthly revenue, enough to leave a 9-to-5, whether you write the code or not. Desy gathers evidence, scores the opportunity, and tells you what to test before you spend months building.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" variant="primary">
                <Link href="/sign-up">Validate an idea</Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => setPreview(true)}>
                See a sample report
              </Button>
            </div>
          </Reveal>
          <Reveal delay={150} className="mt-12 md:mt-[120px]">
            <AppPreview />
          </Reveal>
          <div className="mt-6 border-t border-line" />
        </Container>
      </section>

      <Workflow />

      <section id="scoring" className="scroll-mt-24 py-12 md:py-24">
        <Container className="flex flex-col gap-24 md:gap-32">
          <SectionHeader
            className="max-w-[748px]"
            eyebrow="Idea de-risking"
            title="De-risk your idea before you waste months building a dead idea."
            lead="Desy scores your idea based on real data across the web and uses best-in-class product opportunity practices to guide you in the right direction for your idea."
          />
          <FeatureRow
            visual={<IdeaScoreVisual />}
            title="Evaluated by real data & best practices"
            body="Desy doesn’t just randomly score your idea. It understands your idea and goals to ultimately benchmark it against data that’s in the market and uses evaluating criteria established by best-in-class product managers and founders."
            action={
              <Button asChild size="lg" variant="primary">
                <Link href="/sign-up">Book a demo</Link>
              </Button>
            }
          />
          <FeatureRow
            visual={<CitedFindingVisual />}
            title="Every score cites a finding."
            body="Understand fully how your idea was evaluated, but don’t just stop there. Desy provides clear recommendations and actions to take to improve or potentially pivot to get to the next step in your startup."
            action={
              <Button asChild size="lg" variant="primary">
                <Link href="/sign-up">Book a demo</Link>
              </Button>
            }
          />
          <div id="planner" className="scroll-mt-24">
            <FeatureRow
              visual={<CitedFindingVisual />}
              title="Scaling your idea into something actionable"
              body="Once an idea is set, Desy doesn’t just stop there. It provides clear guidance on how to go through discovery interviews, testing plans, and pitches using best practices from the industry."
              action={
                <Button asChild size="lg" variant="primary">
                  <Link href="/sign-up">Book a demo</Link>
                </Button>
              }
            />
          </div>
        </Container>
      </section>

      <section id="sources" className="scroll-mt-24 py-12 md:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeader
            className="max-w-[907px]"
            title="The evidence isn’t just “AI slop”"
            lead="Desy obtains real market data to benchmark and evaluate your idea by running different agents to scrape the web to find real evidence. Furthermore, it contains knowledge and skills from product managers that are constantly thinking about scaling new products."
          />
          <Reveal>
            <div aria-hidden className="aspect-[1232/555] w-full rounded-xl bg-placeholder" />
          </Reveal>
        </Container>
      </section>

      <section id="sample" className="scroll-mt-24 py-12 md:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeader eyebrow="Sample" title="Invoice reminders for freelance designers" lead="Open a filter to read the criteria, the solo-founder reading, and the evidence." />
          <Reveal>
            <div className="overflow-hidden rounded-xl border border-line bg-canvas shadow-card">
              <div className="max-h-[720px] overflow-y-auto">
                <SampleBody idPrefix="sample-" onFilter={(id) => document.getElementById(`sample-filter-${id}`)?.scrollIntoView({ block: "start" })} />
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <Button size="lg" variant="outline" onClick={() => setPreview(true)}>
                Open larger preview
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      <PricingBlock />

      <section id="faq" className="scroll-mt-24 py-12 md:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <SectionHeader align="left" title="Questions, answered" lead="The score, the sources, and what stays on this device." />
          <Reveal delay={120}>
            <Accordion items={FAQ} />
          </Reveal>
        </Container>
      </section>

      <section className="scroll-mt-24 border-t border-line bg-canvas">
        <Container className="flex min-h-[499px] flex-col items-center justify-center gap-[52px] p-8 text-center">
          <Reveal>
            <h2 className="m-0 text-page-title font-medium text-fg-brand md:text-display-sm">
              Put a number on the idea today.
              <br />
              Know what to test tomorrow.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <Button asChild size="lg" variant="primary">
              <Link href="/sign-up">Validate an idea</Link>
            </Button>
          </Reveal>
        </Container>
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
