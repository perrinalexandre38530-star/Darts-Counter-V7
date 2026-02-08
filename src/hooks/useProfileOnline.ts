// ============================================
// src/hooks/useProfileOnline.ts
// Lecture/écriture du profil SUPABASE (table `profiles`)
// Source de vérité pour Mon Profil (online)
// ============================================

import { supabase } from "../lib/supabaseClient";


function looksLikeMissingColumnError(err: any): boolean {
  const msg = String(err?.message || err?.details || "").toLowerCase();
  return msg.includes("pgrst204") || (msg.includes("column") && msg.includes("does not exist"));
}


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
    phone: row?.phone ?? null,
    updated_at: row?.updated_at ?? null,
    created_at: row?.created_at ?? null,
  };
}

export async function fetchOnlineProfile(userId: string): Promise<OnlineProfileRow | null> {
  const uid = String(userId || "").trim();
  if (!uid) return null;

  // compat: profiles.id OU profiles.owner_user_id
  const trySelect = async (col: "id" | "owner_user_id") => {
    return await supabase.from("profiles").select("*").eq(col, uid).single();
  };

  let res = await trySelect("id");
  if (res.error && looksLikeMissingColumnError(res.error)) {
    res = await trySelect("owner_user_id");
  }
  if (res.error || !res.data) return null;
  return mapRow(res.data);
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
    "phone",
  ] as const;

  for (const k of allowed) {
    if (k in patch) dbPatch[k] = (patch as any)[k];
  }

  const tryUpdate = async (col: "id" | "owner_user_id") => {
    return await supabase.from("profiles").update(dbPatch).eq(col, uid).select("*").single();
  };

  let res = await tryUpdate("id");
  if (res.error && looksLikeMissingColumnError(res.error)) {
    res = await tryUpdate("owner_user_id");
  }
  if (res.error || !res.data) return null;
  return mapRow(res.data);
}
