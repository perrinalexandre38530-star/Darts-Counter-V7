import { supabase } from "./supabaseClient";


function looksLikeMissingColumnError(err: any): boolean {
  const msg = String(err?.message || err?.details || "").toLowerCase();
  return msg.includes("pgrst204") || (msg.includes("column") && msg.includes("does not exist"));
}


export type AccountProfile = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function ensureAccountProfile(userId: string, fallbackName: string) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId");

  // 1) Lecture (compat: user_id OU owner_user_id)
  const trySelect = async (col: "user_id" | "owner_user_id") => {
    return await supabase.from("account_profile").select("*").eq(col, uid).maybeSingle();
  };

  let sel = await trySelect("user_id");
  if (sel.error && looksLikeMissingColumnError(sel.error)) {
    sel = await trySelect("owner_user_id");
  }
  if (sel.error) throw sel.error;
  if (sel.data) return sel.data as any as AccountProfile;

  // 2) Création explicite (pas de trigger)
  const tryInsert = async (col: "user_id" | "owner_user_id") => {
    const row: any = {
      display_name: fallbackName,
      avatar_url: null,
    };
    row[col] = uid;
    return await supabase.from("account_profile").insert(row).select("*").single();
  };

  let ins = await tryInsert("user_id");
  if (ins.error && looksLikeMissingColumnError(ins.error)) {
    ins = await tryInsert("owner_user_id");
  }
  if (ins.error) throw ins.error;
  return ins.data as any as AccountProfile;
}
