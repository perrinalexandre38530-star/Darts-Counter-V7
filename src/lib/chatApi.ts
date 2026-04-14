import { supabase } from "./supabaseClient";
import { isNasProviderEnabled } from "./serverConfig";

export async function postMessage(lobbyCode: string, message: string) {
  if (isNasProviderEnabled()) return { id: `nas-local-${Date.now()}`, lobby_code: lobbyCode, message, created_at: new Date().toISOString() };
  const u = (await supabase.auth.getUser()).data.user;
  if (!u) throw new Error("Not signed in");
  const { data, error } = await supabase.from("online_messages").insert({ lobby_code: lobbyCode, user_id: u.id, message }).select("*").single();
  if (error) throw error;
  return data;
}

export async function fetchMessages(lobbyCode: string, limit = 50) {
  if (isNasProviderEnabled()) return [];
  const { data, error } = await supabase.from("online_messages").select("*").eq("lobby_code", lobbyCode).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

export function subscribeMessages(lobbyCode: string, onInsert: (row: any) => void) {
  if (isNasProviderEnabled()) return async () => {};
  const chan = supabase.channel(`chat:${lobbyCode}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "online_messages", filter: `lobby_code=eq.${lobbyCode}` }, (payload: any) => onInsert(payload.new)).subscribe();
  return async () => { await supabase.removeChannel(chan); };
}
