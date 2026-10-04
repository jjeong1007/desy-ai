"use server";
import { getProfile, updateSettings } from "@/server/db";
import { parse, settingsPatchSchema } from "@/server/schemas";
import { requireUser } from "@/server/supabase/server";
import type { Settings } from "@/types";

export async function getSettings(): Promise<Settings> {
  const { sb, user } = await requireUser();
  return (await getProfile(sb, user)).settings;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const { sb, user } = await requireUser();
  const data = parse(settingsPatchSchema, patch);
  return updateSettings(sb, user, data);
}
