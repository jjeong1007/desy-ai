import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";

/** Refreshes the Supabase session cookie and keeps signed-out visitors out of /app. */
export async function middleware(request: NextRequest) {
  // Without Supabase settings (e.g. a fresh clone) let pages render; the app shows a setup error instead.
  if (!supabaseConfigured()) return NextResponse.next();
  let response = NextResponse.next({ request });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() revalidates the token with Supabase; don't run other logic between client creation and this call.
  const { data } = await sb.auth.getUser();

  if (!data.user && request.nextUrl.pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Pages and server actions only: skip static files, images, and the MCP endpoint (bearer-token auth).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|marketing/|api/mcp|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
