import { supabase } from "./supabaseClient";

export type LobbyRow = {
  id: string;
  lobby_code: string | null;
  status: "waiting" | "started" | "ended" | string;
  title?: string | null;
  players?: any; // jsonb
  updated_at?: string;
  created_at?: string;
};

export type MatchRow = {
  id: string;
  lobby_code: string | null;
  status: "started" | "ended" | string;
  state_json: any; // jsonb
  updated_at?: string;
  created_at?: string;
  finished_at?: string | null;
};

function safeUpper(code: string) {
  return String(code || "").trim().toUpperCase();
}

/* ------------------------------
   A) Lobbies list
------------------------------- */
export async function listActiveLobbies(limit = 50): Promise<LobbyRow[]> {
  const { data, error } = await supabase
    .from("online_lobbies")
    .select("*")
    .in("status", ["waiting", "started"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as any;
}

export function subscribeLobbies(onChange: () => void) {
  const ch = supabase
    .channel("spectator:lobbies")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "online_lobbies" },
      () => onChange()
    )
    .subscribe();

  return async () => {
    await supabase.removeChannel(ch);
  };
}

/* ------------------------------
   B) Match state by lobby_code
------------------------------- */
export async function fetchMatchByCode(lobbyCode: string): Promise<MatchRow | null> {
  const code = safeUpper(lobbyCode);
  if (!code) return null;

  const { data, error } = await supabase
    .from("online_matches")
    .select("*")
    .eq("lobby_code", code)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  const row = (data || [])[0] as any;
  return row || null;
}

export function subscribeMatchState(lobbyCode: string, onUpsert: (row: MatchRow) => void) {
  const code = safeUpper(lobbyCode);
  const ch = supabase
    .channel(`spectator:match:${code}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "online_matches",
        filter: `lobby_code=eq.${code}`,
      },
      (payload) => {
        const row = (payload.new || payload.old) as any;
        if (row) onUpsert(row as MatchRow);
      }
    )
    .subscribe();

  return async () => {
    await supabase.removeChannel(ch);
  };
}