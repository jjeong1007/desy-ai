/** Mock session and settings. Any credentials succeed. */
import { delay } from "@/lib/utils";
import { clearDb, DEFAULT_SETTINGS, mutateDb, readDb } from "./storage";
import type { Session, Settings } from "@/types";

export async function signIn(email: string, name?: string): Promise<Session> {
  await delay(500);
  const session: Session = { email, name: name || email.split("@")[0] || "Founder", signedInAt: new Date().toISOString() };
  mutateDb((db) => {
    db.session = session;
    if (!db.settings.profile.email) db.settings.profile = { ...db.settings.profile, email, name: session.name };
  });
  return session;
}

export async function signOut(): Promise<void> {
  await delay(150);
  mutateDb((db) => {
    db.session = null;
  });
}

export function getSessionSync(): Session | null {
  return readDb().session;
}

export async function getSettings(): Promise<Settings> {
  await delay(80);
  return readDb().settings;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  await delay(200);
  let out: Settings = DEFAULT_SETTINGS;
  mutateDb((db) => {
    db.settings = { ...db.settings, ...patch };
    out = db.settings;
  });
  return out;
}

/** Everything stored for this account, as pretty-printed JSON. */
export function exportData(): string {
  const { ideas, chats, settings, session } = readDb();
  return JSON.stringify({ exportedAt: new Date().toISOString(), session, settings, ideas, chats }, null, 2);
}

/** Size of the stored workspace in bytes. */
export function storedBytes(): number {
  return new Blob([JSON.stringify(readDb())]).size;
}

export async function deleteAllData(): Promise<void> {
  await delay(300);
  clearDb();
}
