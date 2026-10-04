"use client";
import { BookOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { KB_BY_ID } from "@/mock/knowledge-base";
import { cn } from "@/lib/utils";

export const FRAMEWORK_SHORT: Record<string, string> = {
  filters: "Opportunity filters",
  rww: "Real / Win / Worth It",
  "market-sizing": "Market sizing",
  "opportunity-assessment": "Opportunity assessment",
  channels: "Channel evaluation",
  wtp: "Willingness to pay",
  jtbd: "Jobs to Be Done",
  discovery: "Discovery practice",
  pitch: "Pitch criteria",
};

/** Small tag naming the framework applied. Click (or Enter) shows the course source vs. Desy's interpretation. */
export function FrameworkTag({ id, className }: { id: string; className?: string }) {
  const kb = KB_BY_ID[id];
  if (!kb) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn("inline-flex items-center gap-1 rounded border border-line bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-ink-2 hover:border-line-strong hover:text-ink [&_svg]:size-3", className)} aria-label={`Framework: ${kb.title}. Show explanation`}>
          <BookOpen aria-hidden />
          {FRAMEWORK_SHORT[id] ?? kb.title}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] max-w-[calc(100vw-2rem)]">
        <p className="font-semibold text-ink">{kb.title}</p>
        <p className="mt-0.5 text-xs text-fg-tertiary">{kb.source}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{kb.explanation}</p>
        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
          <div>
            <p className="text-xs font-semibold text-ink">From the course</p>
            <ul className="mt-1 space-y-1 text-xs leading-relaxed text-ink-2">
              {kb.fromSource.slice(0, 8).map((s, i) => (
                <li key={i} className="border-l-2 border-line pl-2">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-accent-strong">Desy&apos;s interpretation</p>
            <ul className="mt-1 space-y-1 text-xs leading-relaxed text-ink-2">
              {kb.desyAssumptions.map((s, i) => (
                <li key={i} className="border-l-2 border-accent/40 pl-2">{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FrameworkTags({ ids, className }: { ids: string[]; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {Array.from(new Set(ids)).map((id) => (
        <FrameworkTag key={id} id={id} />
      ))}
    </span>
  );
}
