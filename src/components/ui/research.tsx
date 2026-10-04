import type { ReactNode } from "react";
import { MessageSquare, Highlighter, Tag as TagIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { Checkbox } from "./checkbox";
import { IconButton } from "./icon-button";

/** SpeakerLabel — "self" is the interviewer, "other" the participant. */
export function SpeakerLabel({ name, speaker = "other" }: { name: string; speaker?: "self" | "other" }) {
  return <div className={cn("text-small font-medium", speaker === "self" ? "text-speaker-self" : "text-speaker-other")}>{name}</div>;
}

/** SelectionToolbar — Figma "Frame 79" (165:573): comment, highlight, tag. */
export function SelectionToolbar({
  onComment,
  onHighlight,
  onTag,
  className,
}: {
  onComment?: () => void;
  onHighlight?: () => void;
  onTag?: () => void;
  className?: string;
}) {
  return (
    <div role="toolbar" aria-label="Selection actions" className={cn("inline-flex gap-1 rounded-sm border border-line bg-subtle p-0.5 shadow-ring", className)}>
      <IconButton label="Comment" size="sm" className="hover:bg-subtle" onClick={onComment}><MessageSquare /></IconButton>
      <IconButton label="Highlight" size="sm" className="hover:bg-subtle" onClick={onHighlight}><Highlighter /></IconButton>
      <IconButton label="Tag" size="sm" className="hover:bg-subtle" onClick={onTag}><TagIcon /></IconButton>
    </div>
  );
}

/** TranscriptLine — Figma "Frame 66" (165:614). */
export interface TranscriptLineProps {
  speaker: string;
  role?: "self" | "other";
  time: string;
  children: ReactNode;
  selected?: boolean;
  toolbar?: ReactNode;
  onClick?: () => void;
}

export function TranscriptLine({ speaker, role = "other", time, children, selected, toolbar, onClick }: TranscriptLineProps) {
  return (
    <div
      onClick={onClick}
      className={cn("flex flex-col gap-1 rounded-sm p-2 transition-colors", selected ? "bg-subtle" : "hover:bg-muted", onClick && "cursor-pointer")}
    >
      <div className="flex min-h-5 items-center justify-between gap-2">
        <SpeakerLabel name={speaker} speaker={role} />
        {selected && toolbar && <div className="-my-2">{toolbar}</div>}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="m-0 text-body font-medium text-fg-secondary">{children}</p>
        <time className="shrink-0 whitespace-nowrap text-caption font-medium text-fg-tertiary">{time}</time>
      </div>
    </div>
  );
}

/** Highlight — quoted transcript text on the yellow highlight color. */
export function Highlight({ children }: { children: ReactNode }) {
  return <mark className="bg-highlight px-0.5 text-inherit [box-decoration-break:clone]">{children}</mark>;
}

/** HighlightCard — Figma highlight/comment cards (201:4455). */
export interface HighlightCardProps {
  speaker: string;
  role?: "self" | "other";
  time: string;
  quote: ReactNode;
  addedOn: string;
  tags?: ReactNode;
  comment?: { author: string; body: ReactNode };
  selected?: boolean;
  onSelectedChange?: (v: boolean) => void;
  onDelete?: () => void;
}

export function HighlightCard({ speaker, role = "other", time, quote, addedOn, tags, comment, selected, onSelectedChange, onDelete }: HighlightCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-sm border border-line bg-canvas p-2 text-fg-secondary">
      <div className="flex items-center justify-between">
        <Checkbox aria-label="Select highlight" checked={selected} onChange={(e) => onSelectedChange?.(e.target.checked)} />
        <IconButton label="Delete highlight" size="sm" onClick={onDelete}><Trash2 /></IconButton>
      </div>
      {tags && <div className="flex flex-wrap gap-2">{tags}</div>}
      <div className="flex flex-col gap-1">
        <SpeakerLabel name={speaker} speaker={role} />
        <div className="flex items-baseline justify-between gap-2">
          <p className="m-0 text-small font-medium"><Highlight>{quote}</Highlight></p>
          <time className="shrink-0 whitespace-nowrap text-caption font-medium text-fg-tertiary">{time}</time>
        </div>
      </div>
      <div className="flex items-center gap-1 text-caption font-medium text-fg-tertiary">
        <Avatar /> Added on {addedOn}
      </div>
      {comment && (
        <div className="flex flex-col gap-1 border-t border-line pt-2">
          <div className="flex items-center gap-1 text-small font-medium text-fg">
            <Avatar /> {comment.author}
          </div>
          <p className="m-0 text-small font-medium">{comment.body}</p>
        </div>
      )}
    </article>
  );
}
