import { supabase } from "./supabaseClient";

export type AccountProfile = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function ensureAccountProfile(userId: string, fallbackName: string) {
  // 1) Lecture
  const { data: existing, error: selErr } = await supabase
    .from("account_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing as AccountProfile;

  // 2) Création explicite (pas de trigger)
  const { data: created, error: insErr } = await supabase
    .from("account_profile")
    .insert({
      user_id: userId,
      display_name: fallbackName,
      avatar_url: null,
    })
    .select("*")
    .single();

  if (insErr) throw insErr;
  return created as AccountProfile;
}
