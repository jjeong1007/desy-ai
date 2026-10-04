/**
 * Row-level security check against a real Supabase project.
 * Creates two throwaway users, has user A write an idea, chat and token, then confirms user B
 * can't read or change any of it. Deletes both users at the end.
 *
 *   node --env-file=.env.local scripts/check-rls.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const stamp = Date.now();
const password = `Rls-check-${stamp}!`;
const failures = [];
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures.push(label);
};

async function makeUser(tag) {
  const email = `rls-${tag}-${stamp}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

const users = [];
try {
  const a = await makeUser("a");
  const b = await makeUser("b");
  users.push(a.id, b.id);

  const intake = { name: "RLS probe" };
  check("A can insert an idea", !(await a.client.from("ideas").insert({ user_id: a.id, id: "idea_rls", status: "draft", intake })).error);
  check("A can insert a chat", !(await a.client.from("chats").insert({ user_id: a.id, id: "chat_rls", title: "probe" })).error);
  check("A can insert a token", !(await a.client.from("mcp_tokens").insert({ user_id: a.id, name: "probe", token_hash: `h${stamp}`, prefix: "desy_x…" })).error);

  for (const table of ["ideas", "chats", "mcp_tokens", "profiles"]) {
    const { data } = await b.client.from(table).select("*");
    const leaked = (data ?? []).some((r) => (r.user_id ?? r.id) === a.id);
    check(`B can't read A's ${table}`, !leaked);
  }
  const upd = await b.client.from("ideas").update({ status: "complete" }).eq("user_id", a.id).select();
  check("B can't update A's idea", (upd.data ?? []).length === 0);
  const del = await b.client.from("chats").delete().eq("user_id", a.id).select();
  check("B can't delete A's chat", (del.data ?? []).length === 0);
  const spoof = await b.client.from("ideas").insert({ user_id: a.id, id: "idea_spoof", status: "draft", intake });
  check("B can't insert rows as A", !!spoof.error);
  const own = await a.client.from("ideas").select("id").eq("id", "idea_rls");
  check("A still sees their idea", (own.data ?? []).length === 1);
} finally {
  for (const id of users) await admin.auth.admin.deleteUser(id);
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll RLS checks passed.");
