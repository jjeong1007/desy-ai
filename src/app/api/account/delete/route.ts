import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabase/admin";
import { AuthError, requireUser } from "@/server/supabase/server";

/** Deletes the account. Every table cascades from auth.users, so this removes all data too. */
export async function POST() {
  try {
    const { sb, user } = await requireUser();
    const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
    if (error) throw error;
    await sb.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    throw e;
  }
}
