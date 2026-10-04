import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { SCORING_CONFIG } from "@/config/scoring";
import { uid } from "@/lib/utils";
import type { ChatMessage, ChatThread, HistoryEntry, Idea, Session, Settings } from "@/types";

/**
 * Row mapping and typed queries over Supabase. Every function takes a client that is either scoped to
 * the user (RLS) or the service role, in which case callers pass the user id they've already verified.
 */

export const DEFAULT_SETTINGS: Settings = {
  weights: { ...SCORING_CONFIG.defaultWeights },
  theme: "system",
  profile: { name: "", email: "", role: "Solo founder" },
};

const iso = (v: string | null) => (v ? new Date(v).toISOString() : null);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// ---------------------------------------------------------------- ideas

export interface IdeaRow {
  user_id: string;
  id: string;
  status: Idea["status"];
  intake: Idea["intake"];
  draft_step: number | null;
  analysis: Idea["analysis"];
  finding_state: Idea["findingState"];
  adjustments: Idea["adjustments"];
  run: Idea["run"];
  plan: Idea["plan"];
  history: HistoryEntry[];
  seed: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export function rowToIdea(r: IdeaRow): Idea {
  const idea: Idea = {
    id: r.id,
    status: r.status,
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at)!,
    lastRunAt: iso(r.last_run_at),
    intake: r.intake,
    analysis: r.analysis,
    findingState: r.finding_state ?? {},
    adjustments: r.adjustments ?? { criteria: {}, rww: {} },
    run: r.run,
    history: r.history ?? [],
    plan: r.plan,
  };
  if (r.draft_step != null) idea.draftStep = r.draft_step;
  if (r.seed) idea.seed = true;
  return idea;
}

/** Columns written from an Idea. user_id and version are handled by the caller. */
export function ideaToRow(i: Idea): Omit<IdeaRow, "user_id" | "version"> {
  return {
    id: i.id,
    status: i.status,
    intake: i.intake,
    draft_step: i.draftStep ?? null,
    analysis: i.analysis,
    finding_state: i.findingState,
    adjustments: i.adjustments,
    run: i.run,
    plan: i.plan,
    history: i.history,
    seed: !!i.seed,
    last_run_at: i.lastRunAt,
    created_at: i.createdAt,
    updated_at: i.updatedAt,
  };
}

export async function listIdeaRows(sb: SupabaseClient, userId: string): Promise<Idea[]> {
  const { data, error } = await sb.from("ideas").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as IdeaRow[]).map(rowToIdea);
}

export async function getIdeaRow(sb: SupabaseClient, userId: string, id: string): Promise<{ idea: Idea; version: number } | null> {
  const { data, error } = await sb.from("ideas").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? { idea: rowToIdea(data as IdeaRow), version: (data as IdeaRow).version } : null;
}

export async function insertIdea(sb: SupabaseClient, userId: string, idea: Idea): Promise<Idea> {
  const { data, error } = await sb.from("ideas").insert({ ...ideaToRow(idea), user_id: userId, version: 0 }).select("*").single();
  if (error) throw error;
  return rowToIdea(data as IdeaRow);
}

export type HistoryInput = Omit<HistoryEntry, "id" | "at">;

/**
 * Read-modify-write on one idea. `fn` edits a copy and may return a history entry to record.
 * The update only lands if nobody else wrote in between (version check); on a conflict it
 * re-reads and re-applies `fn`, up to three times.
 */
export async function mutateIdea(sb: SupabaseClient, userId: string, id: string, fn: (idea: Idea) => HistoryInput | void): Promise<Idea> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await getIdeaRow(sb, userId, id);
    if (!cur) throw new Error("Idea not found");
    const idea = clone(cur.idea);
    const history = fn(idea);
    idea.updatedAt = new Date().toISOString();
    if (history) idea.history.unshift({ ...history, id: uid("h"), at: idea.updatedAt });
    const { data, error } = await sb
      .from("ideas")
      .update({ ...ideaToRow(idea), version: cur.version + 1 })
      .eq("user_id", userId)
      .eq("id", id)
      .eq("version", cur.version)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (data) return rowToIdea(data as IdeaRow);
  }
  throw new Error("The idea changed while saving. Try again.");
}

// ---------------------------------------------------------------- profile, settings, session

interface ProfileRow {
  id: string;
  name: string;
  role: string;
  settings: Partial<Settings> | null;
}

export async function getProfile(sb: SupabaseClient, user: User): Promise<{ settings: Settings; session: Session }> {
  const { data, error } = await sb.from("profiles").select("id,name,role,settings").eq("id", user.id).maybeSingle();
  if (error) throw error;
  const p = data as ProfileRow | null;
  const email = user.email ?? "";
  const name = p?.name || (user.user_metadata?.name as string | undefined) || email.split("@")[0] || "Founder";
  const stored = p?.settings ?? {};
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    weights: { ...DEFAULT_SETTINGS.weights },
    profile: { name, email, role: p?.role ?? DEFAULT_SETTINGS.profile.role },
  };
  return { settings, session: { email, name, signedInAt: user.last_sign_in_at ?? new Date().toISOString() } };
}

/** Saves a settings patch. Profile name and role are columns; email always comes from the auth account. */
export async function updateSettings(sb: SupabaseClient, user: User, patch: Partial<Settings>): Promise<Settings> {
  const { settings: cur } = await getProfile(sb, user);
  const next: Settings = { ...cur, ...patch, profile: { ...cur.profile, ...patch.profile, email: cur.profile.email } };
  const { profile, ...rest } = next;
  const { error } = await sb.from("profiles").update({ name: profile.name, role: profile.role, settings: rest }).eq("id", user.id);
  if (error) throw error;
  return next;
}

// ---------------------------------------------------------------- chats

interface ChatRow {
  id: string;
  title: string;
  focus_idea_id: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  chat_id: string;
  role: ChatMessage["role"];
  content: string;
  refs: ChatMessage["references"] | null;
  actions: ChatMessage["actions"] | null;
  created_at: string;
}

function rowToMessage(m: MessageRow): ChatMessage {
  const msg: ChatMessage = { id: m.id, role: m.role, content: m.content, createdAt: iso(m.created_at)! };
  if (m.refs) msg.references = m.refs;
  if (m.actions) msg.actions = m.actions;
  return msg;
}

function assembleChats(chats: ChatRow[], messages: MessageRow[]): ChatThread[] {
  const byChat = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    const list = byChat.get(m.chat_id) ?? [];
    list.push(rowToMessage(m));
    byChat.set(m.chat_id, list);
  }
  return chats.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: iso(c.created_at)!,
    updatedAt: iso(c.updated_at)!,
    focusIdeaId: c.focus_idea_id,
    messages: byChat.get(c.id) ?? [],
  }));
}

export async function listChats(sb: SupabaseClient, userId: string): Promise<ChatThread[]> {
  const [chats, messages] = await Promise.all([
    sb.from("chats").select("id,title,focus_idea_id,created_at,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
    sb.from("chat_messages").select("id,chat_id,role,content,refs,actions,created_at").eq("user_id", userId).order("created_at", { ascending: true }),
  ]);
  if (chats.error) throw chats.error;
  if (messages.error) throw messages.error;
  return assembleChats(chats.data as ChatRow[], messages.data as MessageRow[]);
}

export async function getChat(sb: SupabaseClient, userId: string, id: string): Promise<ChatThread | null> {
  const [chat, messages] = await Promise.all([
    sb.from("chats").select("id,title,focus_idea_id,created_at,updated_at").eq("user_id", userId).eq("id", id).maybeSingle(),
    sb.from("chat_messages").select("id,chat_id,role,content,refs,actions,created_at").eq("user_id", userId).eq("chat_id", id).order("created_at", { ascending: true }),
  ]);
  if (chat.error) throw chat.error;
  if (messages.error) throw messages.error;
  if (!chat.data) return null;
  return assembleChats([chat.data as ChatRow], messages.data as MessageRow[])[0];
}

export async function insertMessage(sb: SupabaseClient, userId: string, chatId: string, msg: ChatMessage): Promise<void> {
  const { error } = await sb.from("chat_messages").insert({
    user_id: userId,
    id: msg.id,
    chat_id: chatId,
    role: msg.role,
    content: msg.content,
    refs: msg.references ?? null,
    actions: msg.actions ?? null,
    created_at: msg.createdAt,
  });
  if (error) throw error;
}

export async function touchChat(sb: SupabaseClient, userId: string, id: string, patch: { title?: string; focus_idea_id?: string | null } = {}): Promise<void> {
  const { error } = await sb.from("chats").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
