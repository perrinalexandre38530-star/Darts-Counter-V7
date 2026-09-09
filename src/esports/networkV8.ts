import { supabase } from "../lib/supabaseClient";

export type EsportsDivisionV8 = {
  division: string;
  divisionLabel: string;
  divisionIndex: number;
  progressPercent: number;
  nextDivision?: string | null;
  nextRating?: number | null;
};

export type EsportsTeamSeasonOverviewV8 = {
  seasonId: string;
  seasonName: string;
  seasonSlug: string;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  teamId: string;
  teamName: string;
  teamTag: string;
  gameId: string;
  teamSize: number;
  rating: number;
  peakRating: number;
  placementMatches: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  division: EsportsDivisionV8;
  winRate: number;
  recentForm: Array<"W" | "L" | "D">;
  mvp?: {
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    rating: number;
    peakRating: number;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
  } | null;
  modeStats: Array<{ mode: string; matches: number; wins: number; losses: number; draws: number; winRate: number }>;
};

export type EsportsTeamSeasonHistoryRowV8 = {
  seasonId: string;
  seasonName: string;
  seasonSlug: string;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  rating: number;
  peakRating: number;
  placementMatches: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  division: EsportsDivisionV8;
};

export type EsportsTeamDivisionEventV8 = {
  id: string;
  seasonId: string;
  matchId?: string | null;
  fromDivision: string;
  toDivision: string;
  direction: "promotion" | "relegation";
  ratingBefore: number;
  ratingAfter: number;
  createdAt?: string | null;
};

export type EsportsTeamSeasonAwardV8 = {
  id: string;
  seasonId: string;
  seasonName: string;
  seasonSlug: string;
  teamId: string;
  gameId: string;
  teamSize: number;
  awardType: string;
  title: string;
  userId?: string | null;
  displayName?: string | null;
  value?: Record<string, unknown> | null;
  awardedAt?: string | null;
};

export type EsportsTeamSeasonLeaderboardRowV8 = {
  position: number;
  teamId: string;
  name: string;
  tag: string;
  gameId: string;
  teamSize: number;
  rating: number;
  peakRating: number;
  placementMatches: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  division: EsportsDivisionV8;
  seasonName: string;
  seasonSlug: string;
};

function isUnavailable(error: any): boolean {
  const code = String(error?.code || "");
  const msg = String(error?.message || error || "").toLowerCase();
  return code === "42883" || code === "PGRST202" || msg.includes("could not find the function") || msg.includes("schema cache") || msg.includes("ms_esports_team_season");
}

function fail(error: any, fallback: string): never {
  const err: any = new Error(String(error?.message || error?.details || error?.hint || fallback));
  err.code = isUnavailable(error) ? "esports_network_v8_migration_required" : String(error?.code || "esports_network_v8_error");
  throw err;
}

function rows(data: any): any[] { return Array.isArray(data) ? data : data == null ? [] : [data]; }
function num(value: any, fallback = 0): number { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

function division(row: any): EsportsDivisionV8 {
  const d = row?.division && typeof row.division === "object" ? row.division : row;
  return {
    division: String(d?.division || "placement"),
    divisionLabel: String(d?.divisionLabel || d?.division_label || "PLACEMENT"),
    divisionIndex: Math.max(0, num(d?.divisionIndex ?? d?.division_index, 0)),
    progressPercent: Math.max(0, Math.min(100, num(d?.progressPercent ?? d?.progress_percent, 0))),
    nextDivision: d?.nextDivision ?? d?.next_division ?? null,
    nextRating: d?.nextRating ?? d?.next_rating ?? null,
  };
}

function normalizeOverview(row: any): EsportsTeamSeasonOverviewV8 {
  const mvpRaw = row?.mvp && typeof row.mvp === "object" ? row.mvp : null;
  return {
    seasonId: String(row?.seasonId || row?.season_id || ""), seasonName: String(row?.seasonName || row?.season_name || "E-SPORTS Season"), seasonSlug: String(row?.seasonSlug || row?.season_slug || "current"),
    startsAt: row?.startsAt ?? row?.starts_at ?? null, endsAt: row?.endsAt ?? row?.ends_at ?? null, active: !!row?.active,
    teamId: String(row?.teamId || row?.team_id || ""), teamName: String(row?.teamName || row?.team_name || "Team"), teamTag: String(row?.teamTag || row?.team_tag || ""),
    gameId: String(row?.gameId || row?.game_id || ""), teamSize: Math.max(2, num(row?.teamSize ?? row?.team_size, 2)),
    rating: Math.max(100, num(row?.rating, 1000)), peakRating: Math.max(100, num(row?.peakRating ?? row?.peak_rating, 1000)), placementMatches: Math.max(0, num(row?.placementMatches ?? row?.placement_matches, 0)),
    matches: Math.max(0, num(row?.matches)), wins: Math.max(0, num(row?.wins)), losses: Math.max(0, num(row?.losses)), draws: Math.max(0, num(row?.draws)), streak: num(row?.streak),
    division: division(row?.division), winRate: Math.max(0, Math.min(100, num(row?.winRate ?? row?.win_rate, 0))),
    recentForm: rows(row?.recentForm ?? row?.recent_form).map((v) => String(v).toUpperCase()).filter((v): v is "W" | "L" | "D" => v === "W" || v === "L" || v === "D"),
    mvp: mvpRaw ? {
      userId: String(mvpRaw.userId || mvpRaw.user_id || ""), displayName: String(mvpRaw.displayName || mvpRaw.display_name || "Gamer"), avatarUrl: mvpRaw.avatarUrl ?? mvpRaw.avatar_url ?? null,
      rating: Math.max(100, num(mvpRaw.rating, 1000)), peakRating: Math.max(100, num(mvpRaw.peakRating ?? mvpRaw.peak_rating, 1000)), matches: Math.max(0, num(mvpRaw.matches)), wins: Math.max(0, num(mvpRaw.wins)), losses: Math.max(0, num(mvpRaw.losses)), draws: Math.max(0, num(mvpRaw.draws)),
    } : null,
    modeStats: rows(row?.modeStats ?? row?.mode_stats).map((m) => ({ mode: String(m?.mode || "Ranked Team"), matches: Math.max(0, num(m?.matches)), wins: Math.max(0, num(m?.wins)), losses: Math.max(0, num(m?.losses)), draws: Math.max(0, num(m?.draws)), winRate: Math.max(0, Math.min(100, num(m?.winRate ?? m?.win_rate, 0))) })),
  };
}

function normalizeHistory(row: any): EsportsTeamSeasonHistoryRowV8 {
  return {
    seasonId: String(row?.seasonId || row?.season_id || ""), seasonName: String(row?.seasonName || row?.season_name || "E-SPORTS Season"), seasonSlug: String(row?.seasonSlug || row?.season_slug || "current"), startsAt: row?.startsAt ?? row?.starts_at ?? null, endsAt: row?.endsAt ?? row?.ends_at ?? null, active: !!row?.active,
    rating: Math.max(100, num(row?.rating, 1000)), peakRating: Math.max(100, num(row?.peakRating ?? row?.peak_rating, 1000)), placementMatches: Math.max(0, num(row?.placementMatches ?? row?.placement_matches, 0)), matches: Math.max(0, num(row?.matches)), wins: Math.max(0, num(row?.wins)), losses: Math.max(0, num(row?.losses)), draws: Math.max(0, num(row?.draws)), streak: num(row?.streak), division: division(row?.division),
  };
}

function normalizeEvent(row: any): EsportsTeamDivisionEventV8 {
  return { id: String(row?.id || ""), seasonId: String(row?.seasonId || row?.season_id || ""), matchId: row?.matchId ?? row?.match_id ?? null, fromDivision: String(row?.fromDivision || row?.from_division || "placement"), toDivision: String(row?.toDivision || row?.to_division || "placement"), direction: String(row?.direction) === "relegation" ? "relegation" : "promotion", ratingBefore: num(row?.ratingBefore ?? row?.rating_before, 1000), ratingAfter: num(row?.ratingAfter ?? row?.rating_after, 1000), createdAt: row?.createdAt ?? row?.created_at ?? null };
}

function normalizeAward(row: any): EsportsTeamSeasonAwardV8 {
  return { id: String(row?.id || ""), seasonId: String(row?.seasonId || row?.season_id || ""), seasonName: String(row?.seasonName || row?.season_name || "E-SPORTS Season"), seasonSlug: String(row?.seasonSlug || row?.season_slug || "current"), teamId: String(row?.teamId || row?.team_id || ""), gameId: String(row?.gameId || row?.game_id || ""), teamSize: Math.max(2, num(row?.teamSize ?? row?.team_size, 2)), awardType: String(row?.awardType || row?.award_type || "achievement"), title: String(row?.title || "Trophy"), userId: row?.userId ?? row?.user_id ?? null, displayName: row?.displayName ?? row?.display_name ?? null, value: row?.value && typeof row.value === "object" ? row.value : null, awardedAt: row?.awardedAt ?? row?.awarded_at ?? null };
}

function normalizeLeaderboard(row: any, index: number): EsportsTeamSeasonLeaderboardRowV8 {
  return { position: Math.max(1, num(row?.position, index + 1)), teamId: String(row?.teamId || row?.team_id || ""), name: String(row?.name || "Team"), tag: String(row?.tag || ""), gameId: String(row?.gameId || row?.game_id || ""), teamSize: Math.max(2, num(row?.teamSize ?? row?.team_size, 2)), rating: Math.max(100, num(row?.rating, 1000)), peakRating: Math.max(100, num(row?.peakRating ?? row?.peak_rating, 1000)), placementMatches: Math.max(0, num(row?.placementMatches ?? row?.placement_matches, 0)), matches: Math.max(0, num(row?.matches)), wins: Math.max(0, num(row?.wins)), losses: Math.max(0, num(row?.losses)), draws: Math.max(0, num(row?.draws)), streak: num(row?.streak), division: division(row?.division), seasonName: String(row?.seasonName || row?.season_name || "E-SPORTS Season"), seasonSlug: String(row?.seasonSlug || row?.season_slug || "current") };
}

export async function getTeamSeasonDashboardV8(teamId: string, gameId: string, teamSize: number): Promise<EsportsTeamSeasonOverviewV8 | null> {
  if (!teamId || !gameId) return null;
  const { data, error } = await supabase.rpc("ms_esports_team_season_dashboard_v8", { p_team_id: teamId, p_game_id: gameId, p_team_size: Math.max(2, Math.min(10, Math.round(teamSize))) } as any);
  if (error) fail(error, "Impossible de charger la saison d'équipe.");
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeOverview(row) : null;
}

export async function listTeamSeasonHistoryV8(teamId: string, gameId: string, teamSize: number): Promise<EsportsTeamSeasonHistoryRowV8[]> {
  if (!teamId || !gameId) return [];
  const { data, error } = await supabase.rpc("ms_esports_team_season_history_v8", { p_team_id: teamId, p_game_id: gameId, p_team_size: Math.max(2, Math.min(10, Math.round(teamSize))) } as any);
  if (error) fail(error, "Impossible de charger l'historique des saisons.");
  return rows(data).map(normalizeHistory);
}

export async function listTeamDivisionEventsV8(teamId: string, gameId: string, teamSize: number, limit = 30): Promise<EsportsTeamDivisionEventV8[]> {
  const { data, error } = await supabase.rpc("ms_esports_team_division_events_v8", { p_team_id: teamId, p_game_id: gameId, p_team_size: Math.max(2, Math.min(10, Math.round(teamSize))), p_limit: Math.max(1, Math.min(100, Math.round(limit))) } as any);
  if (error) fail(error, "Impossible de charger les promotions/relégations.");
  return rows(data).map(normalizeEvent);
}

export async function listTeamSeasonAwardsV8(teamId: string, gameId: string, teamSize: number): Promise<EsportsTeamSeasonAwardV8[]> {
  const { data, error } = await supabase.rpc("ms_esports_team_season_awards_v8", { p_team_id: teamId, p_game_id: gameId, p_team_size: Math.max(2, Math.min(10, Math.round(teamSize))) } as any);
  if (error) fail(error, "Impossible de charger le palmarès saisonnier.");
  return rows(data).map(normalizeAward);
}

export async function listTeamSeasonLeaderboardV8(gameId: string, teamSize: number, seasonSlug?: string | null, limit = 50): Promise<EsportsTeamSeasonLeaderboardRowV8[]> {
  const { data, error } = await supabase.rpc("ms_esports_team_season_leaderboard_v8", { p_game_id: gameId, p_team_size: Math.max(2, Math.min(10, Math.round(teamSize))), p_season_slug: seasonSlug || null, p_limit: Math.max(1, Math.min(100, Math.round(limit))) } as any);
  if (error) fail(error, "Impossible de charger le classement saisonnier.");
  return rows(data).map(normalizeLeaderboard);
}

export function subscribeEsportsNetworkV8(onChange: () => void): () => void {
  const channel = supabase
    .channel(`ms-esports-v8-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_team_ratings" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_team_rating_history" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_team_division_events" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_team_season_awards" }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
