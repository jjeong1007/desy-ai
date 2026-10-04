/** Public Supabase settings, safe for the browser. Accepts the newer publishable key name too. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
