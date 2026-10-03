"use client";
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Text that reads like plain copy and becomes editable on focus. */
export function InlineText({ value, onChange, label, multiline, className, placeholder }: { value: string; onChange: (v: string) => void; label: string; multiline?: boolean; className?: string; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  const base = "w-full resize-none rounded border border-transparent bg-transparent px-1.5 py-1 -mx-1.5 text-ink hover:border-line focus-visible:border-accent focus-visible:bg-canvas focus-visible:outline-none";
  if (!multiline) return <input aria-label={label} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(base, className)} />;
  return <textarea ref={ref} rows={1} aria-label={label} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(base, "overflow-hidden leading-relaxed", className)} />;
}

/** List with drag-to-reorder plus keyboard-accessible move buttons. */
export function ReorderList<T extends { id: string }>({ items, onChange, render, label, className, itemClassName }: { items: T[]; onChange: (items: T[]) => void; render: (item: T, index: number) => React.ReactNode; label: string; className?: string; itemClassName?: string }) {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = items.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  return (
    <ol aria-label={label} className={className}>
      {items.map((item, i) => (
        <li
          key={item.id}
          onDragOver={(e) => {
            if (drag == null) return;
            e.preventDefault();
            setOver(i);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (drag != null) move(drag, i);
            setDrag(null);
            setOver(null);
          }}
          className={cn("group relative flex gap-2", over === i && drag !== i && "before:absolute before:-top-px before:left-0 before:right-0 before:h-0.5 before:bg-accent", drag === i && "opacity-50", itemClassName)}
        >
          <span
            draggable
            onDragStart={(e) => {
              setDrag(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              setDrag(null);
              setOver(null);
            }}
            className="mt-1.5 hidden cursor-grab text-muted hover:text-ink sm:block"
            aria-hidden
          >
            <GripVertical className="size-4" />
          </span>
          <div className="min-w-0 flex-1">{render(item, i)}</div>
          <div className="flex shrink-0 flex-col items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up" className="rounded p-0.5 text-muted hover:bg-surface hover:text-ink disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
            <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label="Move down" className="rounded p-0.5 text-muted hover:bg-surface hover:text-ink disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Delete" className="rounded p-0.5 text-muted hover:bg-weak-tint hover:text-weak"><Trash2 className="size-3.5" /></button>
          </div>
        </li>
      ))}
    </ol>
  );
}
