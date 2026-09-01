import { supabase } from "../lib/supabaseClient";

export type EsportsDivisionV6 = "placement" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "champion";

export type EsportsRatingProfileV6 = {
  userId: string;
  gameId: string;
  rating: number;
  division: EsportsDivisionV6;
  divisionLabel: string;
  divisionIndex: number;
  progressPercent: number;
  nextDivision?: string | null;
  nextRating?: number | null;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  placementsDone: number;
  placementsRemaining: number;
  peakRating: number;
  streak: number;
  seasonName: string;
  seasonSlug: string;
};

export type EsportsRatingHistoryPointV6 = {
  id: string;
  matchId?: string | null;
  gameId: string;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  result: "win" | "loss" | "draw";
  reason: string;
  createdAt?: string | null;
};

export type EsportsRankedHistoryRowV6 = {
  matchId: string;
  gameId: string;
  opponentUserId: string;
  opponentDisplayName: string;
  opponentAvatarUrl?: string | null;
  mySide: "A" | "B";
  scoreFor?: number | null;
  scoreAgainst?: number | null;
  result: "win" | "loss" | "draw" | "pending" | "disputed" | "cancelled";
  mmrBefore?: number | null;
  mmrAfter?: number | null;
  delta?: number | null;
  status: string;
  reason: string;
  createdAt?: string | null;
  confirmedAt?: string | null;
};

export type EsportsRematchStateV6 = {
  matchId: string;
  requestedByMe: boolean;
  requestedByOpponent: boolean;
  ready: boolean;
  newMatchId?: string | null;
};

export type EsportsDisputeV6 = {
  id: string;
  matchId: string;
  status: "open" | "resolved" | "rejected";
  reason: string;
  details: string;
  openedByMe: boolean;
  resolution?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function isUnavailable(error: any): boolean {
  const code = String(error?.code || "");
  const msg = String(error?.message || error || "").toLowerCase();
  return code === "42883" || code === "PGRST202" || msg.includes("could not find the function") || msg.includes("schema cache") || msg.includes("ms_esports_rating_history") || msg.includes("ms_esports_disputes") || msg.includes("ms_esports_rematch_requests");
}

function fail(error: any, fallback: string): never {
  const err: any = new Error(String(error?.message || error?.details || error?.hint || fallback));
  err.code = isUnavailable(error) ? "esports_network_v6_migration_required" : String(error?.code || "esports_network_v6_error");
  throw err;
}

function num(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: any): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function rows(data: any): any[] {
  return Array.isArray(data) ? data : data == null ? [] : [data];
}

function normalizeProfile(row: any): EsportsRatingProfileV6 {
  const division = String(row?.division || "placement") as EsportsDivisionV6;
  return {
    userId: String(row?.userId || row?.user_id || ""),
    gameId: String(row?.gameId || row?.game_id || ""),
    rating: Math.max(100, num(row?.rating, 1000)),
    division,
    divisionLabel: String(row?.divisionLabel || row?.division_label || division.toUpperCase()),
    divisionIndex: Math.max(0, num(row?.divisionIndex ?? row?.division_index, 0)),
    progressPercent: Math.max(0, Math.min(100, num(row?.progressPercent ?? row?.progress_percent, 0))),
    nextDivision: row?.nextDivision ?? row?.next_division ?? null,
    nextRating: row?.nextRating == null && row?.next_rating == null ? null : num(row?.nextRating ?? row?.next_rating),
    matches: Math.max(0, num(row?.matches, 0)),
    wins: Math.max(0, num(row?.wins, 0)),
    losses: Math.max(0, num(row?.losses, 0)),
    draws: Math.max(0, num(row?.draws, 0)),
    winRate: Math.max(0, Math.min(100, num(row?.winRate ?? row?.win_rate, 0))),
    placementsDone: Math.max(0, num(row?.placementsDone ?? row?.placements_done, 0)),
    placementsRemaining: Math.max(0, num(row?.placementsRemaining ?? row?.placements_remaining, 0)),
    peakRating: Math.max(100, num(row?.peakRating ?? row?.peak_rating, 1000)),
    streak: num(row?.streak, 0),
    seasonName: String(row?.seasonName || row?.season_name || "E-SPORTS Season"),
    seasonSlug: String(row?.seasonSlug || row?.season_slug || "current"),
  };
}

function normalizeHistory(row: any): EsportsRatingHistoryPointV6 {
  const before = Math.max(100, num(row?.ratingBefore ?? row?.rating_before, 1000));
  const after = Math.max(100, num(row?.ratingAfter ?? row?.rating_after, before));
  const resultRaw = String(row?.result || "draw");
  return {
    id: String(row?.id || `${row?.match_id || "history"}_${row?.created_at || Math.random()}`),
    matchId: row?.matchId ?? row?.match_id ?? null,
    gameId: String(row?.gameId || row?.game_id || ""),
    ratingBefore: before,
    ratingAfter: after,
    delta: num(row?.delta, after - before),
    result: resultRaw === "win" ? "win" : resultRaw === "loss" ? "loss" : "draw",
    reason: String(row?.reason || "confirmed"),
    createdAt: row?.createdAt ?? row?.created_at ?? null,
  };
}

function normalizeMatchHistory(row: any): EsportsRankedHistoryRowV6 {
  const resultRaw = String(row?.result || "pending");
  const result = (["win", "loss", "draw", "disputed", "cancelled"] as const).includes(resultRaw as any) ? resultRaw as EsportsRankedHistoryRowV6["result"] : "pending";
  const before = row?.mmrBefore ?? row?.mmr_before;
  const after = row?.mmrAfter ?? row?.mmr_after;
  return {
    matchId: String(row?.matchId || row?.match_id || ""),
    gameId: String(row?.gameId || row?.game_id || ""),
    opponentUserId: String(row?.opponentUserId || row?.opponent_user_id || ""),
    opponentDisplayName: String(row?.opponentDisplayName || row?.opponent_display_name || "Gamer"),
    opponentAvatarUrl: row?.opponentAvatarUrl ?? row?.opponent_avatar_url ?? null,
    mySide: String(row?.mySide || row?.my_side || "A") === "B" ? "B" : "A",
    scoreFor: row?.scoreFor ?? row?.score_for ?? null,
    scoreAgainst: row?.scoreAgainst ?? row?.score_against ?? null,
    result,
    mmrBefore: before == null ? null : num(before),
    mmrAfter: after == null ? null : num(after),
    delta: before == null || after == null ? null : num(after) - num(before),
    status: String(row?.status || "matched"),
    reason: String(row?.reason || "ranked"),
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    confirmedAt: row?.confirmedAt ?? row?.confirmed_at ?? null,
  };
}

function normalizeRematch(row: any, matchId = ""): EsportsRematchStateV6 {
  return {
    matchId: String(row?.matchId || row?.match_id || matchId),
    requestedByMe: bool(row?.requestedByMe ?? row?.requested_by_me),
    requestedByOpponent: bool(row?.requestedByOpponent ?? row?.requested_by_opponent),
    ready: bool(row?.ready),
    newMatchId: row?.newMatchId ?? row?.new_match_id ?? null,
  };
}

function normalizeDispute(row: any): EsportsDisputeV6 {
  const statusRaw = String(row?.status || "open");
  return {
    id: String(row?.id || ""),
    matchId: String(row?.matchId || row?.match_id || ""),
    status: statusRaw === "resolved" ? "resolved" : statusRaw === "rejected" ? "rejected" : "open",
    reason: String(row?.reason || "score_mismatch"),
    details: String(row?.details || ""),
    openedByMe: bool(row?.openedByMe ?? row?.opened_by_me),
    resolution: row?.resolution ?? null,
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  };
}

export async function getMyEsportsRatingProfileV6(gameId: string): Promise<EsportsRatingProfileV6> {
  const { data, error } = await supabase.rpc("ms_esports_rating_profile_v6", { p_game_id: gameId } as any);
  if (error) fail(error, "Impossible de charger la progression classée.");
  return normalizeProfile(Array.isArray(data) ? data[0] : data);
}

export async function listMyEsportsRatingHistoryV6(gameId: string, limit = 40): Promise<EsportsRatingHistoryPointV6[]> {
  const { data, error } = await supabase.rpc("ms_esports_rating_history_v6", { p_game_id: gameId, p_limit: Math.max(5, Math.min(100, limit)) } as any);
  if (error) fail(error, "Impossible de charger l'historique MMR.");
  return rows(data).map(normalizeHistory).filter((row) => row.gameId);
}

export async function listMyEsportsRankedHistoryV6(gameId: string, limit = 30): Promise<EsportsRankedHistoryRowV6[]> {
  const { data, error } = await supabase.rpc("ms_esports_ranked_history_v6", { p_game_id: gameId, p_limit: Math.max(5, Math.min(100, limit)) } as any);
  if (error) fail(error, "Impossible de charger l'historique des matchs classés.");
  return rows(data).map(normalizeMatchHistory).filter((row) => row.matchId);
}

export async function forfeitCompetitiveMatchV6(matchId: string): Promise<any> {
  const { data, error } = await supabase.rpc("ms_esports_forfeit_competitive_match_v6", { p_match_id: matchId } as any);
  if (error) fail(error, "Impossible d'enregistrer le forfait.");
  return data;
}

export async function requestCompetitiveRematchV6(matchId: string): Promise<EsportsRematchStateV6> {
  const { data, error } = await supabase.rpc("ms_esports_request_rematch_v6", { p_match_id: matchId } as any);
  if (error) fail(error, "Impossible de demander le rematch.");
  return normalizeRematch(Array.isArray(data) ? data[0] : data, matchId);
}

export async function getCompetitiveRematchStateV6(matchId: string): Promise<EsportsRematchStateV6> {
  const { data, error } = await supabase.rpc("ms_esports_rematch_state_v6", { p_match_id: matchId } as any);
  if (error) fail(error, "Impossible de charger l'état du rematch.");
  return normalizeRematch(Array.isArray(data) ? data[0] : data, matchId);
}

export async function openCompetitiveDisputeV6(matchId: string, reason: string, details: string): Promise<EsportsDisputeV6> {
  const { data, error } = await supabase.rpc("ms_esports_open_dispute_v6", { p_match_id: matchId, p_reason: reason, p_details: details.slice(0, 1000) } as any);
  if (error) fail(error, "Impossible d'ouvrir le litige.");
  return normalizeDispute(Array.isArray(data) ? data[0] : data);
}

export async function listMyCompetitiveDisputesV6(limit = 20): Promise<EsportsDisputeV6[]> {
  const { data, error } = await supabase.rpc("ms_esports_list_disputes_v6", { p_limit: Math.max(1, Math.min(50, limit)) } as any);
  if (error) fail(error, "Impossible de charger les litiges.");
  return rows(data).map(normalizeDispute).filter((row) => row.id);
}

export async function withdrawCompetitiveDisputeV6(matchId: string): Promise<EsportsDisputeV6> {
  const { data, error } = await supabase.rpc("ms_esports_withdraw_dispute_v6", { p_match_id: matchId } as any);
  if (error) fail(error, "Impossible de retirer le litige.");
  return normalizeDispute(Array.isArray(data) ? data[0] : data);
}

export function subscribeEsportsNetworkV6(onChange: () => void): () => void {
  let active = true;
  let channel: any = null;
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = String(data?.user?.id || "");
      if (!active || !uid) return;
      channel = supabase
        .channel(`esports:v6:${uid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_rating_history", filter: `user_id=eq.${uid}` }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_rematch_requests", filter: `user_id=eq.${uid}` }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_disputes" }, onChange)
        .subscribe();
    } catch {}
  })();
  return () => {
    active = false;
    if (channel) void supabase.removeChannel(channel);
  };
}
