// ============================================
// src/hooks/useProfileOnline.ts
// Lecture/écriture du profil SUPABASE (table `profiles`)
// Source de vérité pour Mon Profil (online)
// ============================================

import { supabase } from "../lib/supabaseClient";

export type OnlineProfileRow = {
  id: string;
  nickname?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  country?: string | null;

  surname?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;

  updated_at?: string | null;
  created_at?: string | null;
};

function mapRow(row: any): OnlineProfileRow {
  return {
    id: String(row?.id || ""),
    nickname: row?.nickname ?? null,
    display_name: row?.display_name ?? null,
    avatar_url: row?.avatar_url ?? null,
    country: row?.country ?? null,
    surname: row?.surname ?? null,
    first_name: row?.first_name ?? null,
    last_name: row?.last_name ?? null,
    birth_date: row?.birth_date ?? null,
    city: row?.city ?? null,
    email: row?.email ?? null,
    phone: row?.phone ?? null,
    updated_at: row?.updated_at ?? null,
    created_at: row?.created_at ?? null,
  };
}

export async function fetchOnlineProfile(userId: string): Promise<OnlineProfileRow | null> {
  const uid = String(userId || "").trim();
  if (!uid) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
  if (error || !data) return null;
  return mapRow(data);
}

export async function updateOnlineProfile(
  userId: string,
  patch: Partial<OnlineProfileRow>
): Promise<OnlineProfileRow | null> {
  const uid = String(userId || "").trim();
  if (!uid) return null;

  const dbPatch: any = { updated_at: new Date().toISOString() };
  // whitelist champs
  const allowed = [
    "nickname",
    "display_name",
    "avatar_url",
    "country",
    "surname",
    "first_name",
    "last_name",
    "birth_date",
    "city",
    "email",
    "phone",
  ] as const;

  for (const k of allowed) {
    if (k in patch) dbPatch[k] = (patch as any)[k];
  }

  const { data, error } = await supabase.from("profiles").update(dbPatch).eq("id", uid).select("*").single();
  if (error || !data) return null;
  return mapRow(data);
}
