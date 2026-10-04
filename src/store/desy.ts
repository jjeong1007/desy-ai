"use client";
/**
 * Client cache over the service layer. hydrate() loads the workspace from /api/bootstrap; components
 * call services (server actions), then upsert the returned entities here.
 */
import { create } from "zustand";
import type { ChatThread, Idea, Session, Settings } from "@/types";

interface Bootstrap {
  session: Session | null;
  settings: Settings | null;
  ideas: Idea[];
  chats: ChatThread[];
}

interface DesyState {
  hydrated: boolean;
  /** Set when the workspace couldn't load (server down, Supabase not configured). */
  loadError: string | null;
  ideas: Idea[];
  chats: ChatThread[];
  settings: Settings | null;
  session: Session | null;
  hydrate: () => Promise<void>;
  /** Clears everything, e.g. after sign-out or account deletion. */
  reset: () => void;
  upsertIdea: (idea: Idea) => void;
  removeIdea: (id: string) => void;
  setIdeas: (ideas: Idea[]) => void;
  upsertChat: (chat: ChatThread) => void;
  removeChat: (id: string) => void;
  setSettings: (s: Settings) => void;
  setSession: (s: Session | null) => void;
}

let inflight: Promise<void> | null = null;

export const useDesy = create<DesyState>((set) => ({
  hydrated: false,
  loadError: null,
  ideas: [],
  chats: [],
  settings: null,
  session: null,
  hydrate: () => {
    inflight ??= (async () => {
      try {
        const res = await fetch("/api/bootstrap", { cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 503 ? "Desy's database isn't configured yet." : "Couldn't load your workspace.");
        const data = (await res.json()) as Bootstrap;
        set({ hydrated: true, loadError: null, session: data.session, settings: data.settings, ideas: data.ideas, chats: data.chats });
      } catch (e) {
        set({ hydrated: true, loadError: e instanceof Error ? e.message : "Couldn't load your workspace.", session: null, settings: null, ideas: [], chats: [] });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },
  reset: () => set({ session: null, settings: null, ideas: [], chats: [] }),
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
