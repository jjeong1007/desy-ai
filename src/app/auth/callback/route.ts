import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/server/supabase/server";

/** Lands OAuth sign-ins and email confirmations: swaps the code for a session, then continues to `next`. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const raw = url.searchParams.get("next") ?? "/app";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app";
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL(`/sign-in?error=callback&next=${encodeURIComponent(next)}`, url.origin));
}
