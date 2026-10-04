"use server";
import { compose, titleFrom } from "@/engine/chat-reply";
import { uid } from "@/lib/utils";
import { getChat as getChatRow, getProfile, insertMessage, listIdeaRows, touchChat } from "@/server/db";
import { chatTextSchema, id as idSchema, parse } from "@/server/schemas";
import { requireUser } from "@/server/supabase/server";
import type { ChatMessage, ChatThread } from "@/types";

async function load(sb: Awaited<ReturnType<typeof requireUser>>["sb"], userId: string, id: string): Promise<ChatThread> {
  const chat = await getChatRow(sb, userId, id);
  if (!chat) throw new Error("Chat not found");
  return chat;
}

export async function getChat(id: string): Promise<ChatThread | null> {
  const { sb, user } = await requireUser();
  return getChatRow(sb, user.id, parse(idSchema, id));
}

/** Starts a thread with the user's first message. Call `replyTo` next for the answer. */
export async function startChat(text: string, focusIdeaId: string | null = null): Promise<ChatThread> {
  const { sb, user } = await requireUser();
  const content = parse(chatTextSchema, text);
  const focus = focusIdeaId ? parse(idSchema, focusIdeaId) : null;
  const now = new Date().toISOString();
  const id = uid("chat");
  const { error } = await sb.from("chats").insert({ user_id: user.id, id, title: titleFrom(content), focus_idea_id: focus, created_at: now, updated_at: now });
  if (error) throw error;
  await insertMessage(sb, user.id, id, { id: uid("m"), role: "user", content, createdAt: now });
  return load(sb, user.id, id);
}

export async function addUserMessage(id: string, text: string): Promise<ChatThread> {
  const { sb, user } = await requireUser();
  const chatId = parse(idSchema, id);
  await load(sb, user.id, chatId);
  await insertMessage(sb, user.id, chatId, { id: uid("m"), role: "user", content: parse(chatTextSchema, text), createdAt: new Date().toISOString() });
  await touchChat(sb, user.id, chatId);
  return load(sb, user.id, chatId);
}

export async function setChatFocus(id: string, focusIdeaId: string | null): Promise<ChatThread> {
  const { sb, user } = await requireUser();
  const chatId = parse(idSchema, id);
  await touchChat(sb, user.id, chatId, { focus_idea_id: focusIdeaId ? parse(idSchema, focusIdeaId) : null });
  return load(sb, user.id, chatId);
}

export async function renameChat(id: string, title: string): Promise<ChatThread> {
  const { sb, user } = await requireUser();
  const chatId = parse(idSchema, id);
  await touchChat(sb, user.id, chatId, { title: titleFrom(parse(chatTextSchema, title)) });
  return load(sb, user.id, chatId);
}

export async function deleteChat(id: string): Promise<void> {
  const { sb, user } = await requireUser();
  const { error } = await sb.from("chats").delete().eq("user_id", user.id).eq("id", parse(idSchema, id));
  if (error) throw error;
}

/** Generates the assistant's answer to the latest user message and appends it. */
export async function replyTo(id: string): Promise<ChatThread> {
  const { sb, user } = await requireUser();
  const chatId = parse(idSchema, id);
  const [chat, ideas, { settings }] = await Promise.all([load(sb, user.id, chatId), listIdeaRows(sb, user.id), getProfile(sb, user)]);
  const last = [...chat.messages].reverse().find((m) => m.role === "user");
  const reply = compose(last?.content ?? "", chat, ideas, settings.weights);
  const msg: ChatMessage = { id: uid("m"), role: "assistant", createdAt: new Date().toISOString(), ...reply };
  await insertMessage(sb, user.id, chatId, msg);
  await touchChat(sb, user.id, chatId);
  return { ...chat, updatedAt: msg.createdAt, messages: [...chat.messages, msg] };
}
