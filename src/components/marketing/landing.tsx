"use client";
import { ChevronLeft, ClipboardList, FileText, FlaskConical, House, Lightbulb, MessageCircle, MessagesSquare, Moon, Plus, RefreshCw, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MarketingShell } from "@/components/marketing/site-chrome";
import { ActionPlanVisual, CitedFindingVisual, IdeaScoreVisual } from "@/components/marketing/scoring-visuals";
import { McpNetworkVisual, SourcesNetworkVisual } from "@/components/marketing/network-visuals";
import { Container, DemoFrame, FeatureRow, Reveal, SectionHeader, useInView } from "@/components/marketing/layout";
import { Accordion } from "@/components/marketing/parts";
import { HeroDots } from "@/components/marketing/hero-dots";
import { DescribeDemo, ResearchDemo } from "@/components/marketing/workflow-demos";
import { PricingBlock } from "@/components/marketing/pricing-block";
import { ScoreHeader } from "@/components/report/score-header";
import { IDEA_TABS, OverviewDashboard } from "@/components/report/idea-pages";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { NavItem, NavSection, Sidebar } from "@/components/ui/navigation";
import { Kbd } from "@/components/ui/field";
import { Logo } from "@/components/logo";
import { SAMPLE_IDEA, SAMPLE_REPORT } from "@/lib/sample";
import { cn } from "@/lib/utils";
import { FAQ } from "@/config/faq";


const steps = [
  { icon: <FileText />, title: "Describe", body: "The customer, the workaround, the price, your MRR goal, and how it will get built.", meta: "A few minutes" },
  { icon: <Search />, title: "Research", body: "Agents read public discussions, product listings, search trends, funding news, and a library of validation frameworks.", meta: "Simulated in this demo" },
  { icon: <ClipboardList />, title: "Score", body: "A Desy Score, a pursuit band, the evidence behind both, and a plan for the assumptions that could change the answer.", meta: "Before you build" },
];

const STEP_MS = 7000;
const DEMO_FADE_OUT_MS = 450;
const DEMO_PAUSE_MS = 180;
const DEMO_FADE_IN_MS = 450;

type DemoTransition = { phase: "out" | "pause" | "in"; from: number; to: number };

function workflowDemoClass(i: number, active: number, transition: DemoTransition | null, intro: boolean) {
  if (intro) {
    if (i === active) return "workflow-demo-enter z-10";
    return "pointer-events-none z-0 opacity-0";
  }
  if (transition) {
    if (transition.phase === "out") {
      if (i === transition.from) return "workflow-demo-leave pointer-events-none z-10";
      return "pointer-events-none z-0 opacity-0";
    }
    if (transition.phase === "pause") return "pointer-events-none z-0 opacity-0";
    if (transition.phase === "in") {
      if (i === transition.to) return "workflow-demo-enter z-10";
      return "pointer-events-none z-0 opacity-0";
    }
  }
  return cn("z-10", i === active ? "opacity-100" : "pointer-events-none opacity-0");
}

function workflowDemoVisible(i: number, active: number, transition: DemoTransition | null, intro: boolean) {
  if (intro) return i === active;
  if (!transition) return i === active;
  if (transition.phase === "out") return i === transition.from;
  if (transition.phase === "in") return i === transition.to;
  return false;
}

const PREVIEW_RECENT = ["Invoice reminders for freelance designers", "Scheduling for independent tutors", "Generic AI note-taking app"];

/** Static replica of the app's idea workspace (shell + Overview tab) rendered from the sample report. */
function AppPreview() {
  return (
    <div className="relative h-[563px] overflow-hidden rounded-xl border border-line bg-canvas shadow-card md:h-[680px]" role="img" aria-label={`Desy workspace showing the Overview of "${SAMPLE_IDEA.intake.name}": a Desy Score of ${SAMPLE_REPORT.score.overall}, scoring breakdown, and recommendations`}>
      <div className="flex h-full flex-col" inert aria-hidden>
        <div className="flex h-topnav shrink-0 items-center justify-between gap-6 border-b border-line bg-canvas px-4 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Logo />
            <div className="hidden h-[33px] min-w-0 max-w-[521px] flex-1 items-center justify-between gap-2 rounded-sm border border-line px-4 text-body text-fg sm:flex">
              <span className="flex min-w-0 items-center gap-2">
                <Search className="size-4 shrink-0 text-fg-secondary" />
                <span className="truncate">{SAMPLE_IDEA.intake.name}</span>
              </span>
              <span className="hidden shrink-0 items-center gap-1 lg:flex">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden size-9 items-center justify-center text-fg-secondary sm:flex">
              <Moon className="size-4" />
            </span>
            <span className="hidden items-center gap-1.5 text-body font-medium text-fg sm:flex">
              <Plus className="size-4" /> New idea
            </span>
            <Avatar size="lg" name="Alex Rivera" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="hidden w-sidebar shrink-0 border-r border-line-strong/25 md:block">
            <Sidebar
              className="!w-full border-r-0"
              footer={
                <>
                  <NavItem icon={<MessageCircle />}>Give feedback</NavItem>
                  <NavItem icon={<Settings />}>Settings</NavItem>
                </>
              }
            >
              <NavSection>
                <NavItem icon={<House />}>Home</NavItem>
                <NavItem icon={<MessagesSquare />}>Chat</NavItem>
                <NavItem icon={<Lightbulb />}>Ideas</NavItem>
                <NavItem icon={<FlaskConical />}>Research Planner</NavItem>
              </NavSection>
              <NavSection label="Recent ideas">
                {PREVIEW_RECENT.map((name, i) => (
                  <NavItem key={name} icon={<FileText />} active={i === 0}>
                    <span className="truncate">{name}</span>
                  </NavItem>
                ))}
              </NavSection>
            </Sidebar>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden px-4 py-6 md:px-6">
            <span className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink-2">
              <ChevronLeft className="size-4" /> Back to all ideas
            </span>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-page-title font-semibold">{SAMPLE_IDEA.intake.name}</p>
                <p className="mt-2 max-w-[70ch] text-sm font-medium text-ink-2">{SAMPLE_IDEA.intake.oneLiner}</p>
              </div>
              <div className="hidden flex-wrap gap-2 lg:flex">
                <Button size="sm" variant="primary" tabIndex={-1}>
                  <RefreshCw /> Re-run analysis
                </Button>
                <Button size="sm" tabIndex={-1}>
                  <FlaskConical /> Research plan
                </Button>
              </div>
            </div>
            <div className="-mx-1 mt-6 flex items-center gap-1 overflow-hidden border-b border-line px-1 pb-2">
              {IDEA_TABS.map((t) => (
                <span key={t.id} className={cn("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-3 py-2 text-sm font-medium", t.id === "overview" ? "bg-accent-tint text-accent" : "text-ink-2")}>
                  {t.label}
                  {t.id === "sources" ? <span className="tnum text-xs text-fg-tertiary">{SAMPLE_IDEA.analysis?.findings.length}</span> : null}
                </span>
              ))}
            </div>
            <div className="mt-6">
              <OverviewDashboard idea={SAMPLE_IDEA} report={SAMPLE_REPORT} go={() => {}} />
            </div>
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
  const prevActive = useRef(0);
  const [intro, setIntro] = useState(true);
  const [transition, setTransition] = useState<DemoTransition | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), DEMO_FADE_IN_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const prev = prevActive.current;
    if (prev === active) return;

    const from = prev;
    const to = active;
    prevActive.current = active;
    setIntro(false);

    setTransition({ phase: "out", from, to });

    const pauseAt = DEMO_FADE_OUT_MS;
    const enterAt = DEMO_FADE_OUT_MS + DEMO_PAUSE_MS;
    const doneAt = enterAt + DEMO_FADE_IN_MS;

    const tPause = setTimeout(() => setTransition({ phase: "pause", from, to }), pauseAt);
    const tEnter = setTimeout(() => setTransition({ phase: "in", from, to }), enterAt);
    const tDone = setTimeout(() => setTransition(null), doneAt);

    return () => {
      clearTimeout(tPause);
      clearTimeout(tEnter);
      clearTimeout(tDone);
    };
  }, [active]);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearTimeout(t);
  }, [inView, active]);

  return (
    <section id="how" className="scroll-mt-24 py-12 md:py-24">
      <Container className="flex flex-col gap-12">
        <SectionHeader title="From a hunch to a number you can act on" lead="One pass covers the customer, the money, the competition, the channel, and the timing before you spend months building." />
        <Reveal delay={120}>
          <div ref={ref} className="flex flex-col gap-4">
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
                      <span
                        key={on ? active : `idle-${i}`}
                        className={cn("block h-full bg-brand", on && "step-progress")}
                        style={on ? { animationDuration: `${STEP_MS}ms`, animationPlayState: inView ? "running" : "paused" } : undefined}
                      />
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
            <div
              className="grid [&>*]:col-start-1 [&>*]:row-start-1"
              style={
                {
                  "--workflow-demo-fade-out": `${DEMO_FADE_OUT_MS}ms`,
                  "--workflow-demo-fade-in": `${DEMO_FADE_IN_MS}ms`,
                } as CSSProperties
              }
            >
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className={cn("min-w-0", workflowDemoClass(i, active, transition, intro))}
                  inert={!workflowDemoVisible(i, active, transition, intro)}
                  aria-hidden={!workflowDemoVisible(i, active, transition, intro)}
                >
                  <DemoFrame label={`${s.title} preview`} background="/marketing/feature-dunes.png" className="h-full" windowClassName="flex flex-col border-0 bg-transparent p-0 shadow-none">
                    <div className="glass-panel flex flex-1 flex-col justify-center rounded-lg p-3 sm:p-4">
                    {i === 0 && <DescribeDemo playing={inView && i === active} />}
                    {i === 1 && <ResearchDemo playing={inView && i === active} />}
                    {i === 2 && <ScoreHeader report={SAMPLE_REPORT} compact headingId="workflow-score" />}
                    </div>
                  </DemoFrame>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export function LandingPage() {
  return (
    <MarketingShell>
      <section id="top" className="relative isolate overflow-hidden pt-12 md:pt-[72px]">
        <HeroDots className="pointer-events-none absolute inset-0 -z-10 size-full [mask-image:linear-gradient(to_bottom,black_40%,transparent_85%)]" />
        <Container>
          <Reveal className="flex max-w-[891px] flex-col items-start gap-8">
            <h1 className="m-0 text-page-title font-medium text-fg md:text-display-sm lg:text-display">De-risk your idea before wasting 6 months on it.</h1>
            <p className="m-0 max-w-[764px] text-heading font-medium text-fg-secondary">
              Before tackling a new idea for the next 6 months, de-risk it through Desy by benchmarking your idea. Desy gathers data, scores the opportunity, and tells you what to test before you spend months building.
            </p>
            <Button asChild size="lg" variant="primary">
              <Link href="/sign-up">Validate an idea</Link>
            </Button>
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
              visual={<ActionPlanVisual />}
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
            <SourcesNetworkVisual />
          </Reveal>
        </Container>
      </section>

      <section id="integrations" className="scroll-mt-24 py-12 md:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeader
            className="max-w-[907px]"
            eyebrow="MCP"
            title="Your agents get the full picture"
            lead="Desy connects to the tools you already work in through MCP. Cursor, Claude, ChatGPT, and the rest of your agents can read your ideas, scores, findings, and interview notes, so they build with the same context you have."
          />
          <Reveal>
            <McpNetworkVisual />
          </Reveal>
        </Container>
      </section>

      <PricingBlock />

      <section id="faq" className="scroll-mt-24 py-12 md:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <SectionHeader align="left" title="Questions, answered" lead="The score, the sources, and what happens to your data." />
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

    </MarketingShell>
  );
}
