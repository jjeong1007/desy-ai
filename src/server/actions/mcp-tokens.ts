"use server";
import { z } from "zod";
import { id as idSchema, parse } from "@/server/schemas";
import { requireUser } from "@/server/supabase/server";
import { hashToken, newToken, tokenPrefix } from "@/server/tokens";

export interface McpToken {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Row {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

const toToken = (r: Row): McpToken => ({ id: r.id, name: r.name, prefix: r.prefix, createdAt: r.created_at, lastUsedAt: r.last_used_at });

export async function listMcpTokens(): Promise<McpToken[]> {
  const { sb, user } = await requireUser();
  const { data, error } = await sb
    .from("mcp_tokens")
    .select("id,name,prefix,created_at,last_used_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toToken);
}

/** Creates a token. The plain token is returned once and never stored. */
export async function createMcpToken(name: string): Promise<{ token: string; record: McpToken }> {
  const { sb, user } = await requireUser();
  const label = parse(z.string().trim().min(1).max(80), name);
  const token = newToken();
  const { data, error } = await sb
    .from("mcp_tokens")
    .insert({ user_id: user.id, name: label, token_hash: hashToken(token), prefix: tokenPrefix(token) })
    .select("id,name,prefix,created_at,last_used_at")
    .single();
  if (error) throw error;
  return { token, record: toToken(data as Row) };
}

export async function revokeMcpToken(id: string): Promise<void> {
  const { sb, user } = await requireUser();
  const { error } = await sb.from("mcp_tokens").update({ revoked_at: new Date().toISOString() }).eq("user_id", user.id).eq("id", parse(idSchema, id));
  if (error) throw error;
}
