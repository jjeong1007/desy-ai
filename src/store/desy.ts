"use client";
/**
 * Client cache over the service layer. Components call services, then upsert the returned
 * entities here. Swapping services for an API requires no component changes.
 */
import { create } from "zustand";
import { readDb } from "@/services/storage";
import type { ChatThread, Idea, Session, Settings } from "@/types";

interface DesyState {
  hydrated: boolean;
  ideas: Idea[];
  chats: ChatThread[];
  settings: Settings | null;
  session: Session | null;
  hydrate: () => void;
  upsertIdea: (idea: Idea) => void;
  removeIdea: (id: string) => void;
  setIdeas: (ideas: Idea[]) => void;
  upsertChat: (chat: ChatThread) => void;
  removeChat: (id: string) => void;
  setSettings: (s: Settings) => void;
  setSession: (s: Session | null) => void;
}

export const useDesy = create<DesyState>((set) => ({
  hydrated: false,
  ideas: [],
  chats: [],
  settings: null,
  session: null,
  hydrate: () => {
    const db = readDb();
    set({ hydrated: true, ideas: db.ideas, chats: db.chats, settings: db.settings, session: db.session });
  },
  upsertIdea: (idea) =>
    set((s) => {
      const exists = s.ideas.some((i) => i.id === idea.id);
      return { ideas: exists ? s.ideas.map((i) => (i.id === idea.id ? idea : i)) : [idea, ...s.ideas] };
    }),
  removeIdea: (id) => set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) })),
  setIdeas: (ideas) => set({ ideas }),
  upsertChat: (chat) =>
    set((s) => ({ chats: [chat, ...s.chats.filter((c) => c.id !== chat.id)] })),
  removeChat: (id) => set((s) => ({ chats: s.chats.filter((c) => c.id !== id) })),
  setSettings: (settings) => set({ settings }),
  setSession: (session) => set({ session }),
}));
