import { supabase } from "./supabaseClient";

export async function loadUserStoreCloud(userId: string) {
  const { data, error } = await supabase
    .from("user_store")
    .select("payload,data,store,updated_at,version")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row: any = data as any;
  const payload = row.payload ?? row.data ?? row.store ?? null;

  return {
    payload,
    updated_at: row.updated_at ?? null,
    version: row.version ?? null,
  };
}

export async function saveUserStoreCloud(userId: string, payload: any, version = 8) {
  const baseRow: any = { user_id: userId, updated_at: new Date().toISOString(), version };

  // A: payload
  {
    const { error } = await supabase.from("user_store").upsert({ ...baseRow, payload }, { onConflict: "user_id" });
    if (!error) return;

    const msg = String((error as any)?.message || error);
    const looksLikeMissingColumn = msg.toLowerCase().includes("column") && msg.toLowerCase().includes("payload");
    if (!looksLikeMissingColumn) throw new Error(msg);
  }

  // B: data/store
  {
    const { error } = await supabase
      .from("user_store")
      .upsert({ ...baseRow, data: payload, store: payload }, { onConflict: "user_id" });
    if (error) throw error;
  }
}
