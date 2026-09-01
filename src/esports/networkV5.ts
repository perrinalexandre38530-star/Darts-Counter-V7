import { supabase } from "../lib/supabaseClient";

export type EsportsCompetitivePlayerV5 = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  rating: number;
};

export type EsportsCompetitiveMatchV5 = {
  id: string;
  gameId: string;
  platform: string;
  mode: string;
  teamSize: number;
  status: "matched" | "room_ready" | "pending_confirmation" | "confirmed" | "disputed" | "cancelled";
  roomCode?: string | null;
  isHost: boolean;
  mySide: "A" | "B";
  playerA: EsportsCompetitivePlayerV5;
  playerB: EsportsCompetitivePlayerV5;
  reportA?: { scoreA?: number; scoreB?: number; submittedAt?: string } | null;
  reportB?: { scoreA?: number; scoreB?: number; submittedAt?: string } | null;
  finalScoreA?: number | null;
  finalScoreB?: number | null;
  winnerUserId?: string | null;
  mmrABefore?: number | null;
  mmrAAfter?: number | null;
  mmrBBefore?: number | null;
  mmrBAfter?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  confirmedAt?: string | null;
};

export type EsportsMmrLeaderboardRowV5 = {
  position: number;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  gameId: string;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  seasonName: string;
  seasonSlug: string;
};

function isUnavailable(error: any): boolean {
  const code = String(error?.code || "");
  const msg = String(error?.message || error || "").toLowerCase();
  return code === "42883" || code === "PGRST202" || msg.includes("could not find the function") || msg.includes("schema cache") || msg.includes("ms_esports_competitive_matches") || msg.includes("ms_esports_ratings");
}

function fail(error: any, fallback: string): never {
  const err: any = new Error(String(error?.message || error?.details || error?.hint || fallback));
  err.code = isUnavailable(error) ? "esports_network_v5_migration_required" : String(error?.code || "esports_network_v5_error");
  throw err;
}

function num(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePlayer(row: any): EsportsCompetitivePlayerV5 {
  return {
    userId: String(row?.userId || row?.user_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Gamer"),
    avatarUrl: row?.avatarUrl ?? row?.avatar_url ?? null,
    rating: Math.max(100, num(row?.rating, 1000)),
  };
}

function normalizeMatch(row: any): EsportsCompetitiveMatchV5 {
  const rawStatus = String(row?.status || "matched");
  const status = (["room_ready", "pending_confirmation", "confirmed", "disputed", "cancelled"] as const).includes(rawStatus as any)
    ? rawStatus as EsportsCompetitiveMatchV5["status"]
    : "matched";
  return {
    id: String(row?.id || ""),
    gameId: String(row?.gameId || row?.game_id || ""),
    platform: String(row?.platform || "crossplay"),
    mode: String(row?.mode || "Ranked"),
    teamSize: Math.max(1, num(row?.teamSize ?? row?.team_size, 1)),
    status,
    roomCode: row?.roomCode ?? row?.room_code ?? null,
    isHost: !!(row?.isHost ?? row?.is_host),
    mySide: String(row?.mySide || row?.my_side || "A") === "B" ? "B" : "A",
    playerA: normalizePlayer(row?.playerA || row?.player_a),
    playerB: normalizePlayer(row?.playerB || row?.player_b),
    reportA: row?.reportA ?? row?.report_a ?? null,
    reportB: row?.reportB ?? row?.report_b ?? null,
    finalScoreA: row?.finalScoreA ?? row?.final_score_a ?? null,
    finalScoreB: row?.finalScoreB ?? row?.final_score_b ?? null,
    winnerUserId: row?.winnerUserId ?? row?.winner_user_id ?? null,
    mmrABefore: row?.mmrABefore ?? row?.mmr_a_before ?? null,
    mmrAAfter: row?.mmrAAfter ?? row?.mmr_a_after ?? null,
    mmrBBefore: row?.mmrBBefore ?? row?.mmr_b_before ?? null,
    mmrBAfter: row?.mmrBAfter ?? row?.mmr_b_after ?? null,
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    confirmedAt: row?.confirmedAt ?? row?.confirmed_at ?? null,
  };
}

function normalizeLeaderboard(row: any, index: number): EsportsMmrLeaderboardRowV5 {
  return {
    position: Math.max(1, num(row?.position, index + 1)),
    userId: String(row?.userId || row?.user_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Gamer"),
    avatarUrl: row?.avatarUrl ?? row?.avatar_url ?? null,
    countryCode: row?.countryCode ?? row?.country_code ?? null,
    gameId: String(row?.gameId || row?.game_id || ""),
    rating: Math.max(100, num(row?.rating, 1000)),
    matches: Math.max(0, num(row?.matches, 0)),
    wins: Math.max(0, num(row?.wins, 0)),
    losses: Math.max(0, num(row?.losses, 0)),
    draws: Math.max(0, num(row?.draws, 0)),
    seasonName: String(row?.seasonName || row?.season_name || "E-SPORTS Season"),
    seasonSlug: String(row?.seasonSlug || row?.season_slug || "current"),
  };
}

export async function ensureMyCompetitiveMatchV5(): Promise<EsportsCompetitiveMatchV5 | null> {
  const { data, error } = await supabase.rpc("ms_esports_get_or_create_competitive_match", {} as any);
  if (error) fail(error, "Impossible de créer la session compétitive.");
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeMatch(row) : null;
}

export async function getMyCompetitiveMatchV5(): Promise<EsportsCompetitiveMatchV5 | null> {
  const { data, error } = await supabase.rpc("ms_esports_get_competitive_match", {} as any);
  if (error) fail(error, "Impossible de charger la session compétitive.");
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeMatch(row) : null;
}

export async function claimCompetitiveRoomV5(matchId: string, roomCode: string): Promise<EsportsCompetitiveMatchV5> {
  const { data, error } = await supabase.rpc("ms_esports_claim_competitive_room", { p_match_id: matchId, p_room_code: roomCode } as any);
  if (error) fail(error, "Impossible de lier le salon au match compétitif.");
  return normalizeMatch(Array.isArray(data) ? data[0] : data);
}

export async function submitCompetitiveResultV5(matchId: string, scoreA: number, scoreB: number): Promise<EsportsCompetitiveMatchV5> {
  const { data, error } = await supabase.rpc("ms_esports_submit_competitive_result", {
    p_match_id: matchId,
    p_score_a: Math.max(0, Math.min(999, Math.round(Number(scoreA) || 0))),
    p_score_b: Math.max(0, Math.min(999, Math.round(Number(scoreB) || 0))),
  } as any);
  if (error) fail(error, "Impossible de confirmer le résultat compétitif.");
  return normalizeMatch(Array.isArray(data) ? data[0] : data);
}

export async function listEsportsMmrLeaderboardV5(gameId: string, limit = 50): Promise<EsportsMmrLeaderboardRowV5[]> {
  const { data, error } = await supabase.rpc("ms_esports_mmr_leaderboard", { p_game_id: gameId, p_limit: Math.max(1, Math.min(100, limit)) } as any);
  if (error) fail(error, "Impossible de charger le classement MMR.");
  const rows = Array.isArray(data) ? data : data == null ? [] : [data];
  return rows.map(normalizeLeaderboard).filter((row) => row.userId);
}

export function subscribeEsportsNetworkV5(onChange: () => void): () => void {
  let active = true;
  let channel: any = null;
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!active || !data?.user?.id) return;
      channel = supabase
        .channel(`esports:v5:${data.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_competitive_matches" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_ratings" }, onChange)
        .subscribe();
    } catch {}
  })();
  return () => {
    active = false;
    if (channel) void supabase.removeChannel(channel);
  };
}
