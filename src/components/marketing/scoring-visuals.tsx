import type { CSSProperties } from "react";
import { Square, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";

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
      {children}
    </figure>
  );
}

/** Idea prompt and source marks — Figma 224:12610. */
export function IdeaScoreVisual() {
  return (
    <DuneStage label="An idea scored against market sources" src="/marketing/feature-dunes.png">
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
    </DuneStage>
  );
}

/** Keeps the illustration on the light card colors when the page is in dark mode. */
const lightCard = {
  "--canvas": "255 255 255",
  "--highlight": "255 240 174",
  "--fg-secondary": "82 82 82",
  "--fg-tertiary": "128 128 128",
  "--line": "230 230 230",
  "--positive": "90 127 50",
  "--positive-subtle": "230 252 207",
  "--speaker-other": "102 187 12",
  "--placeholder": "217 217 217",
} as CSSProperties;

/** 540px Figma frame, scaled to the column so the card keeps its place on the backdrop. */
function ScaledShowcase({ children, label, src }: { children: React.ReactNode; label: string; src: string }) {
  return (
    <figure aria-label={label} className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "1 / 1", containerType: "inline-size" }}>
      <div className="pointer-events-none absolute top-0 left-0 h-[540px] w-[540px] origin-top-left" style={{ transform: "scale(calc(100cqw / 540px))" }}>
        <img src={src} alt="" className="absolute inset-0 size-full max-w-none object-cover" />
        {children}
      </div>
    </figure>
  );
}

/** Cited highlight — Figma 224:12653 and 271:338. Same frame for both feature rows. */
export function CitedFindingVisual() {
  return (
    <ScaledShowcase label="A score that cites a highlighted finding" src="/marketing/finding-dunes.png">
      <article aria-hidden style={lightCard} className="absolute top-[172px] left-[88px] flex w-[363px] flex-col gap-3 rounded-sm border border-line bg-canvas p-2">
        <div className="flex items-start justify-between">
          <Square className="size-4 text-fg-secondary" strokeWidth={1.5} />
          <Trash2 className="size-4 text-fg-secondary" strokeWidth={1.5} />
        </div>
        <div className="flex gap-2">
          <Tag variant="positive">Insights</Tag>
          <Tag variant="positive">Positive</Tag>
        </div>
        <div className="flex flex-col gap-1">
          <p className="m-0 text-small font-medium leading-normal text-speaker-other">Them</p>
          <div className="flex items-start gap-2">
            <p className="m-0 flex-1 bg-highlight text-body font-medium leading-normal text-fg-secondary">
              Yeah every time I would use the platform it would kind of just bug out on me? Like it never really worked properly for me so I decided to switch to a different tool instead.
            </p>
            <time className="shrink-0 text-caption font-medium leading-normal text-fg-tertiary">1:55 PM</time>
          </div>
        </div>
        <div className="flex items-center gap-1 text-caption font-medium leading-normal text-fg-tertiary">
          <Avatar />
          Added on Sept. 30, 2026
        </div>
      </article>
    </ScaledShowcase>
  );
}
