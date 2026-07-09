import { supabase } from "./supabaseClient";
import { isNasDataSyncEnabled } from "./serverConfig";
import { onlineApi } from "./onlineApi";

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

function mapLobbyToRow(lobby: any): LobbyRow {
  return {
    id: String(lobby?.id || lobby?.code || ""),
    lobby_code: String(lobby?.lobby_code || lobby?.code || "").trim().toUpperCase() || null,
    status: String(lobby?.status || "waiting"),
    title: lobby?.title || lobby?.settings?.label || lobby?.mode || null,
    players: lobby?.players || null,
    updated_at: lobby?.updated_at || lobby?.updatedAt || lobby?.createdAt || undefined,
    created_at: lobby?.created_at || lobby?.createdAt || undefined,
  };
}

function mapMatchToRow(match: any): MatchRow {
  return {
    id: String(match?.id || match?.matchId || match?.onlineMatchId || ""),
    lobby_code: String(match?.lobby_code || match?.lobbyCode || match?.payload?.lobbyCode || "").trim().toUpperCase() || null,
    status: String(match?.status || "started"),
    state_json: match?.state_json || match?.state || match?.payload?.state || match?.payload || {},
    updated_at: match?.updated_at || match?.updatedAt || undefined,
    created_at: match?.created_at || match?.createdAt || undefined,
    finished_at: match?.finished_at || match?.finishedAt || null,
  };
}

/* ------------------------------
   A) Lobbies list
------------------------------- */
export async function listActiveLobbies(limit = 50): Promise<LobbyRow[]> {
  if (isNasDataSyncEnabled()) {
    const rows = await onlineApi.listActiveLobbies(limit);
    return (Array.isArray(rows) ? rows : []).map(mapLobbyToRow);
  }

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
  if (isNasDataSyncEnabled()) {
    // En mode NAS/hybride, la page spectateur se rafraîchit par polling UI.
    // On ne branche pas le websocket Supabase navigateur, qui provoquait des ERR_NAME_NOT_RESOLVED.
    return async () => {};
  }

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

  if (isNasDataSyncEnabled()) {
    const row = await onlineApi.fetchMatchByCode(code);
    return row ? mapMatchToRow(row) : null;
  }

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

  if (isNasDataSyncEnabled()) {
    const stop = onlineApi.subscribeOnlineStream(code, {
      onMatch: (row: any) => onUpsert(mapMatchToRow(row)),
    });
    return async () => { try { stop?.(); } catch {} };
  }

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
