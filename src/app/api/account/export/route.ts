import { NextResponse } from "next/server";
import { getProfile, listChats, listIdeaRows } from "@/server/db";
import { AuthError, requireUser } from "@/server/supabase/server";

export const dynamic = "force-dynamic";

/** Everything stored for this account, as a JSON download. MCP token hashes are left out. */
export async function GET() {
  try {
    const { sb, user } = await requireUser();
    const [{ settings, session }, ideas, chats, tokens] = await Promise.all([
      getProfile(sb, user),
      listIdeaRows(sb, user.id),
      listChats(sb, user.id),
      sb.from("mcp_tokens").select("name,prefix,created_at,last_used_at,revoked_at").eq("user_id", user.id),
    ]);
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), session, settings, ideas, chats, mcpTokens: tokens.data ?? [] }, null, 2);
    return new NextResponse(body, {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="desy-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    throw e;
  }
}
