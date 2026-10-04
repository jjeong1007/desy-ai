/**
 * Account service: Supabase auth in the browser; settings, export and deletion on the server.
 * After any sign-in, call the store's hydrate() to load the workspace.
 */
import { supabaseBrowser } from "@/lib/supabase/browser";

export { getSettings, saveSettings } from "@/server/actions/account";

export type SignUpResult = { status: "signedIn" } | { status: "confirmEmail" };

const callbackUrl = (next: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

/** Friendlier wording for the auth errors people actually hit. */
function authMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match an account.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first. Check your inbox for the link.";
  if (/already registered|already exists/i.test(message)) return "There's already an account with that email. Sign in instead.";
  if (/password/i.test(message)) return message;
  return "Something went wrong. Try again.";
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
  if (error) throw new Error(authMessage(error.message));
}

export async function signUp(name: string, email: string, password: string, next: string): Promise<SignUpResult> {
  const { data, error } = await supabaseBrowser().auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: callbackUrl(next) },
  });
  if (error) throw new Error(authMessage(error.message));
  return data.session ? { status: "signedIn" } : { status: "confirmEmail" };
}

/** Redirects to Google; the browser comes back through /auth/callback. */
export async function signInWithGoogle(next: string): Promise<void> {
  const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl(next) } });
  if (error) throw new Error(authMessage(error.message));
}

export async function signOut(): Promise<void> {
  await supabaseBrowser().auth.signOut();
}

/** Everything stored for this account, as pretty-printed JSON. */
export async function exportData(): Promise<Blob> {
  const res = await fetch("/api/account/export");
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
}

/** Deletes the account and all of its data, then signs out. */
export async function deleteAllData(): Promise<void> {
  const res = await fetch("/api/account/delete", { method: "POST" });
  if (!res.ok) throw new Error("Delete failed");
  await supabaseBrowser().auth.signOut();
}
