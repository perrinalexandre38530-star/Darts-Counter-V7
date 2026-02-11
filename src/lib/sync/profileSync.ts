// ============================================
// src/lib/sync/profileSync.ts
// Sync PROFIL utilisateur (SAFE & LIGHT)
// - 1 user = 1 ligne (profiles.id = auth.user.id)
// - PAS de stats / events / snapshots
// - Compatible multi-appareils
// - Tolérant : ne jette pas d’erreur fatale (retours ok/error)
// ============================================

import { supabase } from "../supabaseClient";

export type RemoteProfileRow = Record<string, any> | null;

type SyncResult =
  | { ok: true }
  | { ok: false; error: "no-user" | "db"; message?: string };

// 🔑 Récupération SAFE du user_id Supabase
export async function getUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// READ (cloud -> local)
// ------------------------------------------------------------

// Récupère le profil cloud pour l'utilisateur connecté
export async function fetchRemoteProfile(): Promise<RemoteProfileRow> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) return null;
    return (data as any) || null;
  } catch {
    return null;
  }
}

// ✅ Alias backward-compatible : certaines pages importent fetchCloudProfile
export const fetchCloudProfile = fetchRemoteProfile;

// ------------------------------------------------------------
// WRITE (local -> cloud)
// ------------------------------------------------------------

// 🔄 Sync du PROFIL (complet) — à utiliser seulement si payload déjà maîtrisé
export async function syncProfile(profileData: Record<string, any>): Promise<SyncResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "no-user" };

  const payload = {
    id: userId, // ⚠️ clé unique = 1 ligne / user
    ...profileData,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) return { ok: false, error: "db", message: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: "db", message: e?.message };
  }
}

// Push “lite” : uniquement les champs identitaires cross-device (anti quota)
export async function syncProfileLite(profileData: any): Promise<SyncResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "no-user" };

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
  ] as const;

  const payload: any = {
    id: userId,
    updated_at: new Date().toISOString(),
  };

  for (const k of allow) {
    if (profileData?.[k] !== undefined) payload[k] = profileData[k];
  }

  try {
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) return { ok: false, error: "db", message: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: "db", message: e?.message };
  }
}