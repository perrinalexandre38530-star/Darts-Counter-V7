import { supabase } from "./supabaseClient";

export async function loadUserStoreCloud(userId: string) {
  const { data, error } = await supabase
    .from("user_store")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveUserStoreCloud(userId: string, payload: any) {
  const { error } = await supabase
    .from("user_store")
    .upsert({ user_id: userId, payload, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}
