/**
 * Local persistence behind the service layer. Every read/write is wrapped in try/catch and
 * falls back to seed data. Replace this module (and the services that call it) with API calls later.
 */
import { SCORING_CONFIG } from "@/config/scoring";
import { SEED_IDEAS } from "@/mock/seeds";
import type { ChatThread, Idea, Session, Settings } from "@/types";

const KEY = "desy:v1";

export interface Db {
  version: 1;
  ideas: Idea[];
  chats: ChatThread[];
  settings: Settings;
  session: Session | null;
}

export const DEFAULT_SETTINGS: Settings = {
  weights: { ...SCORING_CONFIG.defaultWeights },
  theme: "system",
  profile: { name: "", email: "", role: "Solo founder" },
  reducedMotionRuns: false,
  partialFailure: "random",
  integrations: [],
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function seedDb(): Db {
  return { version: 1, ideas: clone(SEED_IDEAS), chats: [], settings: clone(DEFAULT_SETTINGS), session: null };
}

let cache: Db | null = null;

export function readDb(): Db {
  if (cache) return cache;
  if (typeof window === "undefined") return seedDb();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      cache = seedDb();
      writeDb(cache);
      return cache;
    }
    const parsed = JSON.parse(raw) as Db;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.ideas)) throw new Error("bad shape");
    if (!Array.isArray(parsed.chats)) parsed.chats = [];
    parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings, weights: { ...DEFAULT_SETTINGS.weights, ...parsed.settings?.weights } };
    cache = parsed;
    return cache;
  } catch {
    cache = seedDb();
    return cache;
  }
}

export function writeDb(db: Db): void {
  cache = db;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage full or unavailable: keep the in-memory copy */
  }
}

export function mutateDb(fn: (db: Db) => void): Db {
  const db = clone(readDb());
  fn(db);
  writeDb(db);
  return db;
}

export function resetDb(): Db {
  const db = seedDb();
  const prev = readDb();
  db.session = prev.session;
  db.settings = prev.settings;
  db.chats = prev.chats;
  writeDb(db);
  return db;
}

/** Removes everything this demo stored in the browser. The next read starts from fresh seed data. */
export function clearDb(): void {
  cache = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
}
