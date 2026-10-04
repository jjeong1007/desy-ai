import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getProfile, listChats, listIdeaRows } from "@/server/db";
import { supabaseServer } from "@/server/supabase/server";

export const dynamic = "force-dynamic";

/** Everything the client store needs on load. Signed out → session null and empty lists. */
export async function GET() {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return NextResponse.json({ session: null, settings: null, ideas: [], chats: [] });
  const user = data.user;
  const [{ settings, session }, ideas, chats] = await Promise.all([getProfile(sb, user), listIdeaRows(sb, user.id), listChats(sb, user.id)]);
  return NextResponse.json({ session, settings, ideas, chats });
}
