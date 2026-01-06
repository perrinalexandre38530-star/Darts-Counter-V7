import { supabase } from "./supabaseClient";

export async function postMessage(lobbyCode: string, message: string) {
  const u = (await supabase.auth.getUser()).data.user;
  if (!u) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("online_messages")
    .insert({ lobby_code: lobbyCode, user_id: u.id, message })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMessages(lobbyCode: string, limit = 50) {
  const { data, error } = await supabase
    .from("online_messages")
    .select("*")
    .eq("lobby_code", lobbyCode)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

export function subscribeMessages(lobbyCode: string, onInsert: (row: any) => void) {
  const chan = supabase
    .channel(`chat:${lobbyCode}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "online_messages", filter: `lobby_code=eq.${lobbyCode}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return async () => {
    await supabase.removeChannel(chan);
  };
}
