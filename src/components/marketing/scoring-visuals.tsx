"use client";

import { CRITERION_BY_ID } from "@/config/criteria";
import { FrameworkTag } from "@/components/report/framework-tag";
import { CriterionDots, SentimentTag } from "@/components/report/markers";
import { SourceLabel } from "@/components/sources/data-sources";
import { Highlight } from "@/components/ui/research";
import { topNextSteps } from "@/lib/insights";
import { SAMPLE_IDEA, SAMPLE_REPORT } from "@/lib/sample";

const logos = [
  { src: "/marketing/sources/logo-1.png", name: "Source 1" },
  { src: "/marketing/sources/logo-2.png", name: "Source 2" },
  { src: "/marketing/sources/logo-3.png", name: "Source 3" },
  { src: "/marketing/sources/logo-4.png", name: "Source 4" },
];

function DuneStage({ children, label, src }: { children: React.ReactNode; label: string; src: string }) {
  return (
    <figure aria-label={label} className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "1 / 1" }}>
      <img src={src} alt="" className="pointer-events-none absolute inset-0 size-full max-w-none rounded-xl object-cover" />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-3 p-6 sm:p-8">{children}</div>
    </figure>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <article className="flex flex-col gap-2 rounded-lg border border-line bg-canvas p-3">{children}</article>;
}

/** Idea prompt and source marks — Figma 224:12610. */
export function IdeaScoreVisual() {
  return (
    <figure aria-label="An idea scored against market sources" className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "1 / 1" }}>
      <img src="/marketing/feature-dunes.png" alt="" className="pointer-events-none absolute inset-0 size-full max-w-none rounded-xl object-cover" />
      <div className="absolute top-[24%] right-[8%] left-[8%] rounded-lg border border-white/25 bg-white/50 p-4 backdrop-blur-md">
        <p className="m-0 text-title font-medium text-fg-brand">IDEA</p>
        <p className="m-0 mt-1 text-heading font-medium text-gray-950">
          I want to create a SaaS business that helps people connect with other founders so they can bounce ideas and find co-founders.
        </p>
      </div>
      <div className="absolute top-[70%] right-[8%] left-[8%] flex items-center justify-center gap-4">
        {logos.map((logo) => (
          <div key={logo.src} className="flex size-16 items-center justify-center rounded-md bg-white p-2 sm:size-20">
            <img src={logo.src} alt="" className="size-[42px] max-w-none object-contain" />
          </div>
        ))}
      </div>
    </figure>
  );
}

/** A criterion score, the finding it cites, and the action that follows. */
export function CitedFindingVisual() {
  const criterion = SAMPLE_REPORT.filters.find((f) => f.id === "customer")?.criteria.find((c) => c.id === "cust.frequent");
  const finding = SAMPLE_IDEA.analysis?.findings.find((f) => f.id === "inv-f02");
  const step = topNextSteps(SAMPLE_REPORT)[0];
  if (!criterion || !finding || !step) return null;

  return (
    <DuneStage label="A score that cites a finding and recommends a next action" src="/marketing/finding-dunes.png">
      <Panel>
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 text-small font-medium text-fg-tertiary">Customer · {criterion.label}</p>
          <CriterionDots score={criterion.score} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <SourceLabel sourceId={finding.sourceId} />
          <SentimentTag s={finding.sentiment} />
        </div>
        <p className="m-0 text-body font-medium text-fg-secondary">
          <Highlight>{finding.excerpt}</Highlight>
        </p>
      </Panel>
      <Panel>
        <p className="m-0 text-small font-medium text-fg-tertiary">Next action</p>
        <p className="m-0 text-title font-semibold text-fg">{step.text}</p>
        <p className="m-0 text-small text-fg-tertiary">{step.tiedTo}</p>
      </Panel>
    </DuneStage>
  );
}

/** Discovery interview, the assumption under test, and the pitch that comes last. */
export function ActionPlanVisual() {
  const test = CRITERION_BY_ID["econ.margins"];
  const ask = `At $${SAMPLE_IDEA.intake.price}/mo, ${SAMPLE_REPORT.pathToMrr.customersNeeded.toLocaleString("en-US")} customers reach $${SAMPLE_IDEA.intake.mrrGoal.toLocaleString("en-US")} MRR.`;

  return (
    <DuneStage label="A discovery interview, a testing plan, and a pitch" src="/marketing/feature-dunes.png">
      <Panel>
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-title font-semibold text-fg">Discovery interview</h3>
          <FrameworkTag id="discovery" />
        </div>
        <p className="m-0 text-body font-medium text-fg">How many times did that come up in the last month?</p>
        <p className="m-0 text-small text-fg-tertiary">Frequency from real counts, not estimates.</p>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-title font-semibold text-fg">Testing plan</h3>
          <FrameworkTag id="wtp" />
        </div>
        <p className="m-0 text-body font-medium text-fg">{test.testPrompt}</p>
        <p className="m-0 text-small text-fg-tertiary">{test.label}</p>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 text-title font-semibold text-fg">Pitch</h3>
          <FrameworkTag id="pitch" />
        </div>
        <p className="m-0 text-body font-medium text-fg">{ask}</p>
        <p className="m-0 text-small text-fg-tertiary">Pitch last; invites disconfirming feedback.</p>
      </Panel>
    </DuneStage>
  );
}
