"use server";
import { z } from "zod";
import { supabaseAdmin } from "@/server/supabase/admin";

const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().max(320).email(),
  source: z.enum(["hero", "footer"]),
});

export type WaitlistResult = { ok: true } | { ok: false; error: string };

/** Adds an email to the waitlist. Joining twice succeeds quietly so the form never reveals who signed up. */
export async function joinWaitlist(email: string, source: "hero" | "footer"): Promise<WaitlistResult> {
  const parsed = waitlistSchema.safeParse({ email, source });
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const { error } = await supabaseAdmin().from("waitlist").upsert(parsed.data, { onConflict: "email", ignoreDuplicates: true });
  if (error) {
    console.error("waitlist insert failed", error);
    return { ok: false, error: "Something went wrong. Try again in a moment." };
  }
  return { ok: true };
}
