import { supabase } from "./supabaseClient";
import { isNasProviderEnabled } from "./serverConfig";
import { apiGet, apiPost } from "./apiClient";

export async function postMessage(lobbyCode: string, message: any) {
  const code = String(lobbyCode || "").trim().toUpperCase();
  if (!code) throw new Error("Lobby code manquant");

  if (isNasProviderEnabled()) {
    const res = await apiPost(`/online/lobbies/${encodeURIComponent(code)}/messages`, {
      message,
    });
    return res?.message || res;
  }

  const u = (await supabase.auth.getUser()).data.user;
  if (!u) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("online_messages")
    .insert({ lobby_code: code, user_id: u.id, message })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMessages(lobbyCode: string, limit = 50) {
  const code = String(lobbyCode || "").trim().toUpperCase();
  if (!code) return [];

  if (isNasProviderEnabled()) {
    const res = await apiGet(`/online/lobbies/${encodeURIComponent(code)}/messages?limit=${encodeURIComponent(String(limit))}`);
    return Array.isArray(res?.messages) ? res.messages : [];
  }

  const { data, error } = await supabase
    .from("online_messages")
    .select("*")
    .eq("lobby_code", code)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

export function subscribeMessages(lobbyCode: string, onInsert: (row: any) => void) {
  if (isNasProviderEnabled()) return async () => {};
  const chan = supabase
    .channel(`chat:${lobbyCode}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "online_messages", filter: `lobby_code=eq.${lobbyCode}` },
      (payload: any) => onInsert(payload.new)
    )
    .subscribe();
  return async () => {
    await supabase.removeChannel(chan);
  };
}
