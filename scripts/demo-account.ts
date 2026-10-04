/**
 * Creates or resets the private demo account used for feedback sessions: one confirmed user with an
 * empty workspace, so each session starts the way a new founder would. Re-running it deletes the
 * account's ideas and chats and resets the password.
 *
 *   npm run demo:reset
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_EMAIL and DEMO_PASSWORD from .env.local.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_EMAIL?.trim().toLowerCase();
const password = process.env.DEMO_PASSWORD;

if (!url || !service || !email || !password) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_EMAIL and DEMO_PASSWORD in .env.local.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("DEMO_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser(target: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit || data.users.length < 200) return hit ?? null;
  }
}

async function main(target: string, pw: string) {
  const existing = await findUser(target);
  let userId: string;
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password: pw, email_confirm: true });
    if (error) throw error;
    userId = existing.id;
    console.log(`Found demo account ${target}; password reset.`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email: target, password: pw, email_confirm: true, user_metadata: { name: "Demo Founder" } });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created demo account ${target}.`);
  }

  // Messages cascade from chats. Profile settings (name, theme) stay.
  for (const table of ["ideas", "chats"]) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  }
  console.log("Workspace emptied: no ideas, no chats.");
}

main(email, password).catch((e) => {
  console.error(e);
  process.exit(1);
});
