import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/** Supabase client that acts as the signed-in user, so RLS applies to every query. */
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* called from a Server Component: middleware refreshes the session instead */
        }
      },
    },
  });
}

export class AuthError extends Error {
  constructor() {
    super("Not signed in");
  }
}

/** The signed-in user and a client scoped to them. Throws AuthError when signed out. */
export async function requireUser(): Promise<{ sb: SupabaseClient; user: User }> {
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new AuthError();
  return { sb, user: data.user };
}
