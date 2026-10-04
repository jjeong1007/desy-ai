"use client";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Kbd } from "@/components/ui/field";
import { BandBadge } from "@/components/report/markers";
import { reportFor, useWeights } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useDesy } from "@/store/desy";

export function IdeaSwitcher({ currentId, className }: { currentId?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ideas = useDesy((s) => s.ideas);
  const weights = useWeights();
  const router = useRouter();
  const current = ideas.find((i) => i.id === currentId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ideas.filter((i) => !s || `${i.intake.name} ${i.intake.oneLiner}`.toLowerCase().includes(s)).slice(0, 12);
  }, [ideas, q]);

  const go = (id: string) => {
    const idea = ideas.find((i) => i.id === id);
    setOpen(false);
    setQ("");
    if (!idea) return;
    router.push(idea.status === "draft" ? `/app/ideas/new?draft=${id}` : idea.status === "running" ? `/app/ideas/${id}/run` : `/app/ideas/${id}`);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button type="button" className={cn("flex h-[33px] min-w-0 flex-1 items-center justify-between gap-2 rounded-sm border border-line bg-canvas px-4 text-body font-normal text-fg-tertiary", className)} aria-label="Search documents">
          <span className="flex min-w-0 items-center gap-2">
            <Search className="size-4 shrink-0 text-fg-secondary" aria-hidden />
            <span className={cn("truncate text-left", current && "text-fg")}>{current ? current.intake.name : "Search documents, interviews, product features, and more"}</span>
          </span>
          <span className="hidden shrink-0 items-center gap-1 sm:flex" aria-hidden>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/25 animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-line bg-canvas shadow-float animate-fade-in">
          <DialogPrimitive.Title className="sr-only">Switch idea</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Type to filter your ideas, use the arrow keys to move, and Enter to open.</DialogPrimitive.Description>
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search className="size-4 text-fg-tertiary" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(results.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter" && results[active]) go(results[active].id);
              }}
              placeholder="Search your ideas"
              aria-label="Search your ideas"
              role="combobox"
              aria-expanded
              aria-controls="idea-switch-list"
              aria-activedescendant={results[active] ? `isw-${results[active].id}` : undefined}
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-tertiary"
            />
          </div>
          <ul id="idea-switch-list" role="listbox" className="max-h-80 overflow-y-auto p-1">
            {results.length === 0 ? <li className="px-3 py-6 text-center text-sm text-fg-tertiary">No ideas match &ldquo;{q}&rdquo;.</li> : null}
            {results.map((i, idx) => {
              const r = reportFor(i, weights);
              return (
                <li key={i.id} id={`isw-${i.id}`} role="option" aria-selected={idx === active}>
                  <button type="button" onMouseEnter={() => setActive(idx)} onClick={() => go(i.id)} className={cn("flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm", idx === active ? "bg-surface" : "")}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{i.intake.name || "Untitled draft"}</span>
                      <span className="block truncate text-xs text-fg-tertiary">{i.intake.oneLiner || "No description yet"}</span>
                    </span>
                    {i.status === "complete" && r ? (
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="tnum font-semibold">{r.score.overall}</span>
                        <BandBadge band={r.score.band} size="sm" />
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs capitalize text-fg-tertiary">{i.status}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
