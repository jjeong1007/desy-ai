"use client";
import { ArrowUpRight, BarChart3, Compass, DollarSign, FileSearch, FlaskConical, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { PageSkeleton } from "@/components/app/app-shell";
import { ideaSlots, SuggestionChips, useStartChat } from "@/components/chat/chat";
import { BandBadge } from "@/components/report/markers";
import { Card } from "@/components/ui/card";
import { PromptInput } from "@/components/ui/inputs";
import { reportFor, useWeights } from "@/lib/hooks";
import { relTime } from "@/lib/utils";
import { useDesy } from "@/store/desy";

interface Starter {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

function StarterCard({ s }: { s: Starter }) {
  return (
    <Link href={s.href} className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
      <Card
        showMedia={false}
        className="h-full transition-colors group-hover:border-line-strong group-hover:bg-muted"
        title={
          <span className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0">
            <span className="text-fg-brand">{s.icon}</span>
            {s.title}
          </span>
        }
        description={s.description}
      />
    </Link>
  );
}

/** Home: one prompt to start validating, plus starters into the rest of the product. */
export function Home() {
  const startChat = useStartChat();
  const [focusId, setFocusId] = useState<string | null>(null);
  const hydrated = useDesy((s) => s.hydrated);
  const session = useDesy((s) => s.session);
  const ideas = useDesy((s) => s.ideas);
  const weights = useWeights();

  const recent = useMemo(
    () =>
      ideas
        .filter((i) => i.status === "complete")
        .sort((a, b) => +new Date(b.lastRunAt || b.updatedAt) - +new Date(a.lastRunAt || a.updatedAt))
        .slice(0, 3)
        .map((idea) => ({ idea, report: reportFor(idea, weights) })),
    [ideas, weights],
  );

  if (!hydrated) return <PageSkeleton />;

  const latest = recent[0]?.idea;
  const starters: Starter[] = [
    { title: "Validate a new idea", description: "Answer a short intake and get a Desy Score with the evidence behind it.", href: "/app/ideas/new", icon: <Lightbulb /> },
    { title: "Plan customer interviews", description: "Turn your riskiest assumptions into an interview script or a pitch.", href: "/app/planner", icon: <FlaskConical /> },
    { title: "Compare your ideas", description: "Line up scores, bands and Real / Win / Worth It side by side.", href: "/app/ideas", icon: <BarChart3 /> },
    ...(latest
      ? [
          { title: "Pressure-test your pricing", description: `Change price or MRR goal for ${latest.intake.name} and watch the score recalculate.`, href: `/app/ideas/${latest.id}?tab=mrr`, icon: <DollarSign /> },
          { title: "Review the evidence", description: `Browse every finding Desy used to score ${latest.intake.name}.`, href: `/app/ideas/${latest.id}?tab=sources`, icon: <FileSearch /> },
          { title: "Find your next step", description: "See the three moves most likely to change the answer.", href: `/app/ideas/${latest.id}?tab=next`, icon: <Compass /> },
        ]
      : []),
  ];

  const firstName = session?.name?.split(" ")[0];

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-10 px-4 py-10 md:px-6 md:py-16">
      <section aria-labelledby="home-h" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 id="home-h" className="m-0 text-page-title font-medium text-fg">
            {firstName ? `What are you thinking of building, ${firstName}?` : "What are you thinking of building?"}
          </h1>
          <p className="m-0 text-body text-fg-secondary">Pitch a new idea, ask about your research, or compare what you&apos;ve validated. Desy answers from everything in your workspace.</p>
        </div>
        <PromptInput
          aria-label="Chat with Desy"
          placeholder="e.g. Polite, automatic invoice reminders for freelance designers"
          onSubmitPrompt={(v) => startChat(v, focusId)}
          {...ideaSlots(focusId, setFocusId)}
        />
        <SuggestionChips onPick={(s) => startChat(s, focusId)} />
      </section>

      <section aria-labelledby="starters-h" className="flex flex-col gap-3">
        <h2 id="starters-h" className="m-0 text-title font-semibold text-fg">
          Get started
        </h2>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {starters.map((s) => (
            <li key={s.title}>
              <StarterCard s={s} />
            </li>
          ))}
        </ul>
      </section>

      {recent.length > 0 ? (
        <section aria-labelledby="recent-h" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="recent-h" className="m-0 text-title font-semibold text-fg">
              Pick up where you left off
            </h2>
            <Link href="/app/ideas" className="text-small font-medium text-fg-secondary hover:text-fg">
              All ideas
            </Link>
          </div>
          <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-lg border border-line p-0">
            {recent.map(({ idea, report }) => (
              <li key={idea.id}>
                <Link href={`/app/ideas/${idea.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
                  <span className="min-w-0">
                    <span className="block truncate text-body font-medium text-fg">{idea.intake.name}</span>
                    <span className="block text-small text-fg-secondary">Last run {relTime(idea.lastRunAt)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {report ? (
                      <>
                        <span className="tnum text-title font-semibold text-fg">{report.score.overall}</span>
                        <BandBadge band={report.score.band} score={report.score} size="sm" />
                      </>
                    ) : null}
                    <ArrowUpRight className="size-4 text-fg-tertiary" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
