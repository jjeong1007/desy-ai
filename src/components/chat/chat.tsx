"use client";
import { ArrowRight, Check, FileSearch, History, Lightbulb, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/app/app-shell";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PromptInput } from "@/components/ui/inputs";
import { ConfirmDialog, Dialog, DialogTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Popover, PopoverContent, PopoverTrigger, SheetContent } from "@/components/ui/overlay";
import { reportFor, useIdea, useWeights } from "@/lib/hooks";
import { cn, relTime } from "@/lib/utils";
import { addUserMessage, deleteChat, replyTo, setChatFocus, startChat } from "@/services/chat";
import { useDesy } from "@/store/desy";
import type { ChatMessage, ChatReference } from "@/types";

export const CHAT_SUGGESTIONS = [
  "How are my ideas doing?",
  "Which idea should I pursue first?",
  "I want to build a scheduling tool for dog groomers",
  "What's holding my top idea back?",
];

/** Creates a thread from a first message and opens it. Shared by Home and the chat index. */
export function useStartChat() {
  const router = useRouter();
  const upsertChat = useDesy((s) => s.upsertChat);
  return async (text: string, focusIdeaId: string | null = null) => {
    if (!text.trim()) return;
    try {
      const chat = await startChat(text, focusIdeaId);
      upsertChat(chat);
      router.push(`/app/chat/${chat.id}`);
    } catch {
      toast.error("Couldn't start the chat. Try again.");
    }
  };
}

// ---------- Light markdown: paragraphs, bullets, numbered lists, **bold**, *italic* ----------

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-fg">
        {part.slice(2, -2)}
      </strong>
    ) : part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
      <em key={i} className="text-fg-secondary">
        {part.slice(1, -1)}
      </em>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={i} className="m-0 flex list-disc flex-col gap-1.5 pl-5 marker:text-fg-tertiary">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\d+\. /.test(l)))
          return (
            <ol key={i} className="m-0 flex list-decimal flex-col gap-1.5 pl-5 marker:text-fg-tertiary">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\. /, ""))}</li>
              ))}
            </ol>
          );
        return (
          <p key={i} className="m-0">
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 ? <br /> : null}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** Reveals text word by word, so mock replies read like a streamed answer. */
function useTypewriter(text: string, active: boolean, onDone?: () => void) {
  const [shown, setShown] = useState(active ? 0 : text.length);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!active) return setShown(text.length);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      done.current?.();
      return;
    }
    let n = 0;
    const t = window.setInterval(() => {
      const next = text.indexOf(" ", n + 6);
      n = next === -1 ? text.length : next;
      setShown(n);
      if (n >= text.length) {
        window.clearInterval(t);
        done.current?.();
      }
    }, 28);
    return () => window.clearInterval(t);
  }, [text, active]);
  return text.slice(0, shown);
}

// ---------- Messages ----------

function referenceHref(r: ChatReference) {
  return r.kind === "finding" ? `/app/ideas/${r.ideaId}?tab=sources&finding=${r.findingId}` : `/app/ideas/${r.ideaId}`;
}

function References({ refs }: { refs: ChatReference[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-medium uppercase tracking-wide text-fg-tertiary">Drawn from</span>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {refs.map((r) => (
          <li key={`${r.kind}-${r.findingId ?? r.ideaId}`} className="min-w-0 max-w-full">
            <Link
              href={referenceHref(r)}
              className="flex min-w-0 items-center gap-1.5 rounded-sm border border-line bg-canvas px-2 py-1 text-small text-fg-secondary transition-colors hover:border-line-strong hover:text-fg [&_svg]:size-3.5 [&_svg]:shrink-0"
            >
              {r.kind === "idea" ? <Lightbulb /> : <FileSearch />}
              <span className="truncate">{r.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssistantMessage({ m, animate, onRevealed }: { m: ChatMessage; animate: boolean; onRevealed: () => void }) {
  const [revealed, setRevealed] = useState(!animate);
  const text = useTypewriter(m.content, animate, () => {
    setRevealed(true);
    onRevealed();
  });
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-canvas" aria-hidden>
        <LogoMark size={10} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 text-body text-fg-secondary">
        <RichText text={text} />
        {revealed && m.references?.length ? <References refs={m.references} /> : null}
        {revealed && m.actions?.length ? (
          <div className="flex flex-wrap gap-2">
            {m.actions.map((a, i) => (
              <Button key={a.href} asChild variant={i === 0 ? "subtle" : "outline"} size="sm">
                <Link href={a.href}>
                  {a.label} <ArrowRight />
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UserMessage({ m }: { m: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-subtle px-4 py-2.5 text-body text-fg">{m.content}</div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-canvas" aria-hidden>
        <LogoMark size={10} className="animate-pulse2" />
      </span>
      <span className="text-small text-fg-tertiary">Reading your ideas and research…</span>
    </div>
  );
}

// ---------- Idea attachment ----------

/** The "+" in the chat box: pick which idea the conversation is about. */
export function IdeaPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const ideas = useDesy((s) => s.ideas);
  const weights = useWeights();
  const [open, setOpen] = useState(false);
  const analyzed = useMemo(
    () => ideas.filter((i) => i.status === "complete").map((idea) => ({ idea, report: reportFor(idea, weights) })),
    [ideas, weights],
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton label="Add an idea to the chat" variant="outline" size="lg" className="self-end">
          <Plus />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        <p className="m-0 px-2 pb-1 pt-1.5 text-caption font-medium text-fg-tertiary">Which idea are you talking about?</p>
        {analyzed.length === 0 ? (
          <p className="m-0 px-2 py-3 text-small text-fg-secondary">No analyzed ideas yet. Validate one and it shows up here.</p>
        ) : (
          <ul className="m-0 flex max-h-72 list-none flex-col overflow-y-auto p-0">
            {analyzed.map(({ idea, report }) => {
              const selected = idea.id === value;
              return (
                <li key={idea.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onChange(selected ? null : idea.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-body text-fg-secondary hover:bg-subtle hover:text-fg [&_svg]:size-4 [&_svg]:shrink-0",
                      selected && "bg-subtle text-fg",
                    )}
                  >
                    <Lightbulb className="text-fg-tertiary" />
                    <span className="min-w-0 flex-1 truncate">{idea.intake.name}</span>
                    {report ? <span className="tnum text-small text-fg-tertiary">{report.score.overall}</span> : null}
                    {selected ? <Check className="text-fg-brand" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The attached idea, shown inside the chat box. */
export function IdeaChip({ ideaId, onRemove }: { ideaId: string; onRemove: () => void }) {
  const idea = useIdea(ideaId);
  if (!idea) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-sm border border-line bg-subtle py-1 pl-2 pr-1 text-small text-fg [&_svg]:size-3.5 [&_svg]:shrink-0">
      <Lightbulb className="text-fg-brand" />
      <span className="truncate">{idea.intake.name}</span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${idea.intake.name} from the chat`} className="rounded-xs p-0.5 text-fg-tertiary hover:bg-line hover:text-fg">
        <X />
      </button>
    </span>
  );
}

/** Wires the picker and chip into a PromptInput. */
export function ideaSlots(value: string | null, onChange: (id: string | null) => void) {
  return {
    tools: <IdeaPicker value={value} onChange={onChange} />,
    attachments: value ? <IdeaChip ideaId={value} onRemove={() => onChange(null)} /> : undefined,
  };
}

// ---------- Chat history ----------

function ChatHistory({ onNavigate, collapsed = false, onToggle }: { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const chats = useDesy((s) => s.chats);
  const pathname = usePathname();
  const sorted = useMemo(() => [...chats].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)), [chats]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {onToggle ? (
        <div className={cn("flex h-8 shrink-0 items-center px-3 pt-3", collapsed ? "justify-center px-0" : "justify-end")}>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand chat history" : "Collapse chat history"}
            aria-expanded={!collapsed}
            className="flex size-8 shrink-0 items-center justify-center rounded-sm text-fg-secondary transition-colors hover:bg-subtle hover:text-fg [&_svg]:size-4"
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        </div>
      ) : null}
      {collapsed ? (
        <div className="flex justify-center py-3">
          <Button asChild variant="outline" size="icon" aria-label="New chat" title="New chat">
            <Link href="/app/chat">
              <Plus />
            </Link>
          </Button>
        </div>
      ) : (
      <>
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <span className="text-small font-medium text-fg-secondary">Recent chats</span>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/chat" onClick={onNavigate}>
            <Plus /> New chat
          </Link>
        </Button>
      </div>
      {sorted.length === 0 ? (
        <p className="m-0 px-3 py-2 text-small text-fg-tertiary">No chats yet</p>
      ) : (
        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto px-2 pb-3 pt-0">
          {sorted.map((c) => {
            const active = pathname === `/app/chat/${c.id}`;
            return (
              <li key={c.id}>
                <Link
                  href={`/app/chat/${c.id}`}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex flex-col gap-0.5 rounded-sm px-2 py-2 hover:bg-subtle", active && "bg-subtle")}
                >
                  <span className={cn("truncate text-body", active ? "font-medium text-fg" : "text-fg-secondary")}>{c.title}</span>
                  <span className="text-caption text-fg-tertiary">{relTime(c.updatedAt)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      </>
      )}
    </div>
  );
}

/** Opens chat history in a drawer below the `lg` breakpoint, where the rail is hidden. */
function ChatHistoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="quiet" size="icon" className="lg:hidden" aria-label="Recent chats">
          <History />
        </Button>
      </DialogTrigger>
      <SheetContent side="left" title="Chats">
        <ChatHistory onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Dialog>
  );
}

/** Layout for /app/chat: history rail beside the page. */
export function ChatShell({ children }: { children: ReactNode }) {
  const hydrated = useDesy((s) => s.hydrated);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("desy-chat-rail-collapsed") === "1");
    } catch {}
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("desy-chat-rail-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  return (
    <div className="flex h-[calc(100vh-66px)]">
      <aside aria-label="Chat history" className={cn("hidden shrink-0 flex-col overflow-hidden border-r border-line-strong/25 transition-[width] duration-300 ease-in-out lg:flex", collapsed ? "w-14" : "w-[260px]")}>
        {hydrated ? <ChatHistory collapsed={collapsed} onToggle={toggle} /> : null}
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

// ---------- Pages ----------

/** Replies already being generated, so a remount (or Strict Mode) doesn't ask twice. */
const pending = new Set<string>();

export function ChatThreadView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useDesy((s) => s.hydrated);
  const chat = useDesy((s) => s.chats.find((c) => c.id === id) ?? null);
  const focusIdea = useIdea(chat?.focusIdeaId ?? undefined);
  const upsertChat = useDesy((s) => s.upsertChat);
  const removeChat = useDesy((s) => s.removeChat);
  const [thinking, setThinking] = useState(false);
  const [animateId, setAnimateId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const last = chat?.messages[chat.messages.length - 1];
  const awaitingReply = last?.role === "user";

  const reply = async (chatId: string) => {
    if (pending.has(chatId)) return;
    pending.add(chatId);
    setThinking(true);
    try {
      const next = await replyTo(chatId);
      setAnimateId(next.messages[next.messages.length - 1].id);
      upsertChat(next);
    } catch {
      toast.error("Desy couldn't answer that. Try sending it again.");
    } finally {
      pending.delete(chatId);
      setThinking(false);
    }
  };

  // A thread opened from Home arrives with an unanswered first message.
  useEffect(() => {
    if (chat && awaitingReply) void reply(chat.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id, awaitingReply]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.messages.length, thinking]);

  if (!hydrated) return <PageSkeleton />;
  if (!chat) {
    return (
      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="m-0 text-title font-semibold text-fg">This chat doesn&apos;t exist</h1>
        <p className="m-0 text-body text-fg-secondary">It may have been deleted.</p>
        <Button asChild variant="outline">
          <Link href="/app/chat">Start a new chat</Link>
        </Button>
      </div>
    );
  }

  const send = async (text: string) => {
    const v = text.trim();
    if (!v || thinking || animateId) return;
    setDraft("");
    upsertChat(await addUserMessage(chat.id, v));
    void reply(chat.id);
  };

  const focus = async (ideaId: string | null) => upsertChat(await setChatFocus(chat.id, ideaId));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-1">
          <ChatHistoryButton />
          <h1 className="m-0 truncate text-body font-medium text-fg">{chat.title}</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" size="icon" aria-label="Chat options">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => router.push("/app/chat")}>
              <Plus /> New chat
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setConfirm(true)} className="text-frustration">
              <Trash2 /> Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col justify-center gap-6 px-4 py-6 md:px-6" aria-live="polite">
          {chat.messages.map((m) =>
            m.role === "user" ? (
              <UserMessage key={m.id} m={m} />
            ) : (
              <AssistantMessage key={m.id} m={m} animate={m.id === animateId} onRevealed={() => setAnimateId(null)} />
            ),
          )}
          {thinking ? <Thinking /> : null}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-line bg-canvas px-4 py-3 md:px-6">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2">
          <PromptInput
            size="md"
            aria-label="Message Desy"
            placeholder={focusIdea ? `Ask about ${focusIdea.intake.name}` : "Ask about your ideas or pitch a new one"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onSubmitPrompt={send}
            {...ideaSlots(chat.focusIdeaId, focus)}
          />
          <p className="m-0 text-caption text-fg-tertiary">Desy answers from the ideas and research in your workspace. Check important details in the full report.</p>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this chat?"
        description="The conversation is removed. Your ideas and research aren't affected."
        confirmLabel="Delete chat"
        onConfirm={async () => {
          await deleteChat(chat.id);
          removeChat(chat.id);
          router.push("/app/chat");
        }}
      />
    </div>
  );
}

export function ChatIndex() {
  const hydrated = useDesy((s) => s.hydrated);
  const start = useStartChat();
  const [focusId, setFocusId] = useState<string | null>(null);

  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="px-4 pt-3 lg:hidden">
        <ChatHistoryButton />
      </div>
      <section aria-labelledby="chat-h" className="mx-auto my-auto flex w-full max-w-[760px] flex-col items-center gap-6 px-4 py-10 text-center md:px-6 md:py-16">
        <div className="flex flex-col gap-2">
          <h1 id="chat-h" className="m-0 text-page-title font-medium text-fg">
            Chat with Desy
          </h1>
          <p className="m-0 text-body text-fg-secondary">Talk through a new idea or ask about the research behind the ones you&apos;ve validated.</p>
        </div>
        <PromptInput aria-label="Start a chat" placeholder="Ask about your ideas or pitch a new one" onSubmitPrompt={(v) => start(v, focusId)} className="w-full text-left" {...ideaSlots(focusId, setFocusId)} />
        <SuggestionChips onPick={(s) => start(s, focusId)} className="justify-center" />
      </section>
    </div>
  );
}

export function SuggestionChips({ onPick, className }: { onPick: (s: string) => void; className?: string }) {
  return (
    <ul className={cn("m-0 flex list-none flex-wrap gap-2 p-0", className)} aria-label="Suggested prompts">
      {CHAT_SUGGESTIONS.map((s) => (
        <li key={s}>
          <button
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-line bg-canvas px-3 py-1.5 text-small text-fg-secondary transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
}
