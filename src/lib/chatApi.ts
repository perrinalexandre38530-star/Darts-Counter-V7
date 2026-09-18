import { supabase } from "./supabaseClient";

function normalizeLobbyCode(lobbyCode: string) {
  return String(lobbyCode || "").trim().toUpperCase();
}

export async function postMessage(lobbyCode: string, message: any) {
  const code = normalizeLobbyCode(lobbyCode);
  if (!code) throw new Error("Lobby code manquant");

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error("Connexion requise pour écrire dans le chat.");

  const meta = (user.user_metadata || {}) as any;
  const nickname = String(message?.name || meta.nickname || meta.displayName || user.email || "Joueur").trim();
  const { data, error } = await supabase
    .from("online_messages")
    .insert({
      lobby_code: code,
      user_id: user.id,
      nickname,
      message: { ...(message && typeof message === "object" ? message : { text: String(message || "") }), name: nickname },
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMessages(lobbyCode: string, limit = 50) {
  const code = normalizeLobbyCode(lobbyCode);
  if (!code) return [];
  const safeLimit = Math.max(1, Math.min(200, Number(limit || 50)));
  const { data, error } = await supabase
    .from("online_messages")
    .select("*")
    .eq("lobby_code", code)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return (data || []).reverse();
}

export function subscribeMessages(lobbyCode: string, onInsert: (row: any) => void) {
  const code = normalizeLobbyCode(lobbyCode);
  if (!code || typeof window === "undefined") return async () => {};

  const chan = supabase
    .channel(`chat:${code}:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "online_messages", filter: `lobby_code=eq.${code}` },
      (payload: any) => onInsert(payload.new)
    )
    .subscribe();

  return async () => {
    await supabase.removeChannel(chan);
  };
}
