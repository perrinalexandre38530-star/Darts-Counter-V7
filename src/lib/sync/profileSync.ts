// ============================================
// src/lib/sync/profileSync.ts
// Sync PROFIL utilisateur (SAFE & LIGHT)
// - 1 user = 1 ligne (profiles.id = auth.user.id)
// - PAS de stats
// - PAS d'events
// - PAS de snapshots
// - Compatible multi-appareils
// ============================================

import { supabase } from "../supabaseClient";

// 🔑 Récupération SAFE du user_id Supabase
export async function getUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

// 🔄 Sync du PROFIL uniquement
export async function syncProfile(profileData: Record<string, any>) {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from("profiles").upsert(
    {
      id: userId,                 // ⚠️ CLE UNIQUE
      ...profileData,             // avatar, pseudo, prefs, dartsets, etc.
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",            // 1 ligne / user
    }
  );
}

// ------------------------------------------------------------
// Extra helpers (lightweight sync)
// ------------------------------------------------------------
export type RemoteProfileRow = Record<string, any> | null;

export const fetchRemoteProfile = async (): Promise<RemoteProfileRow> => {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as any) || null;
};

// Push only what matters for cross-device identity (avoid heavy payloads)
export const syncProfileLite = async (profileData: any) => {
  const userId = await getUserId();
  if (!userId) return { ok: false as const, error: "no-user" as const };

  const payload: any = {
    id: userId,
    updated_at: new Date().toISOString(),
  };

  // keep allowed keys only (avoid exploding quotas)
  const allow = [
    "display_name",
    "prenom",
    "nom",
    "pays",
    "ville",
    "telephone",
    "date_de_naissance",
    "avatar_url",
    "preferences",
  ];

  for (const k of allow) {
    if (profileData?.[k] !== undefined) payload[k] = profileData[k];
  }

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
};


// ✅ Backward-compatible alias (some pages import fetchCloudProfile)
export const fetchCloudProfile = fetchRemoteProfile;
