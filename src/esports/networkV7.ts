import { supabase } from "../lib/supabaseClient";

export type EsportsTeamRankedMemberV7 = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  role: "owner" | "captain" | "officer" | "member";
  rating: number;
};

export type EsportsTeamRankedTeamV7 = {
  teamId: string;
  name: string;
  tag: string;
  gameIds: string[];
  visibility: "public" | "private";
  myRole: "owner" | "captain" | "officer" | "member";
  canManage: boolean;
  members: EsportsTeamRankedMemberV7[];
};

export type EsportsTeamRosterV7 = {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  gameId: string;
  platform: string;
  mode: string;
  region: string;
  teamSize: number;
  captainUserId: string;
  status: "locked" | "queued" | "matched" | "archived";
  members: EsportsTeamRankedMemberV7[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EsportsTeamQueueTicketV7 = {
  id: string;
  rosterId: string;
  teamId: string;
  gameId: string;
  platform: string;
  mode: string;
  region: string;
  teamSize: number;
  status: "searching" | "matched" | "cancelled";
  matchedQueueId?: string | null;
  matchId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EsportsTeamMatchSideV7 = {
  teamId: string;
  name: string;
  tag: string;
  captainUserId: string;
  rating: number;
  members: EsportsTeamRankedMemberV7[];
};

export type EsportsTeamCompetitiveMatchV7 = {
  id: string;
  gameId: string;
  platform: string;
  mode: string;
  region: string;
  teamSize: number;
  status: "matched" | "room_ready" | "pending_confirmation" | "confirmed" | "disputed" | "cancelled";
  roomCode?: string | null;
  mySide: "A" | "B";
  canReport: boolean;
  isHostCaptain: boolean;
  teamA: EsportsTeamMatchSideV7;
  teamB: EsportsTeamMatchSideV7;
  reportA?: { scoreA?: number; scoreB?: number; submittedAt?: string } | null;
  reportB?: { scoreA?: number; scoreB?: number; submittedAt?: string } | null;
  finalScoreA?: number | null;
  finalScoreB?: number | null;
  winnerTeamId?: string | null;
  mmrABefore?: number | null;
  mmrAAfter?: number | null;
  mmrBBefore?: number | null;
  mmrBAfter?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  confirmedAt?: string | null;
};

export type EsportsTeamLeaderboardRowV7 = {
  position: number;
  teamId: string;
  name: string;
  tag: string;
  gameId: string;
  teamSize: number;
  rating: number;
  peakRating: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  seasonName: string;
  seasonSlug: string;
};

export type EsportsTeamPublicProfileV7 = {
  teamId: string;
  name: string;
  tag: string;
  visibility: "public" | "private";
  gameIds: string[];
  members: Array<EsportsTeamRankedMemberV7 & { status?: string }>;
  ratings: Array<{
    gameId: string;
    teamSize: number;
    rating: number;
    peakRating: number;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
    streak: number;
    seasonName: string;
    seasonSlug: string;
  }>;
};

function isUnavailable(error: any): boolean {
  const code = String(error?.code || "");
  const msg = String(error?.message || error || "").toLowerCase();
  return code === "42883" || code === "PGRST202" || msg.includes("could not find the function") || msg.includes("schema cache") || msg.includes("ms_esports_team_ranked");
}

function fail(error: any, fallback: string): never {
  const err: any = new Error(String(error?.message || error?.details || error?.hint || fallback));
  err.code = isUnavailable(error) ? "esports_network_v7_migration_required" : String(error?.code || "esports_network_v7_error");
  throw err;
}

function rows(data: any): any[] {
  return Array.isArray(data) ? data : data == null ? [] : [data];
}

function num(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMember(row: any): EsportsTeamRankedMemberV7 {
  const roleRaw = String(row?.role || "member");
  const role = (["owner", "captain", "officer", "member"] as const).includes(roleRaw as any) ? roleRaw as EsportsTeamRankedMemberV7["role"] : "member";
  return {
    userId: String(row?.userId || row?.user_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Gamer"),
    avatarUrl: row?.avatarUrl ?? row?.avatar_url ?? null,
    role,
    rating: Math.max(100, num(row?.rating, 1000)),
  };
}

function normalizeTeam(row: any): EsportsTeamRankedTeamV7 {
  const myRoleRaw = String(row?.myRole || row?.my_role || "member");
  const myRole = (["owner", "captain", "officer", "member"] as const).includes(myRoleRaw as any) ? myRoleRaw as EsportsTeamRankedTeamV7["myRole"] : "member";
  return {
    teamId: String(row?.teamId || row?.team_id || ""),
    name: String(row?.name || "Team"),
    tag: String(row?.tag || ""),
    gameIds: Array.isArray(row?.gameIds || row?.game_ids) ? (row?.gameIds || row?.game_ids).map(String) : [],
    visibility: row?.visibility === "private" ? "private" : "public",
    myRole,
    canManage: !!(row?.canManage ?? row?.can_manage),
    members: rows(row?.members).map(normalizeMember).filter((m) => m.userId),
  };
}

function normalizeRoster(row: any): EsportsTeamRosterV7 {
  const statusRaw = String(row?.status || "locked");
  const status = (["locked", "queued", "matched", "archived"] as const).includes(statusRaw as any) ? statusRaw as EsportsTeamRosterV7["status"] : "locked";
  return {
    id: String(row?.id || ""),
    teamId: String(row?.teamId || row?.team_id || ""),
    teamName: String(row?.teamName || row?.team_name || "Team"),
    teamTag: String(row?.teamTag || row?.team_tag || ""),
    gameId: String(row?.gameId || row?.game_id || ""),
    platform: String(row?.platform || "crossplay"),
    mode: String(row?.mode || "Ranked Team"),
    region: String(row?.region || "EU"),
    teamSize: Math.max(2, num(row?.teamSize ?? row?.team_size, 2)),
    captainUserId: String(row?.captainUserId || row?.captain_user_id || ""),
    status,
    members: rows(row?.members).map(normalizeMember).filter((m) => m.userId),
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  };
}

function normalizeTicket(row: any): EsportsTeamQueueTicketV7 {
  const statusRaw = String(row?.status || "searching");
  const status = (["searching", "matched", "cancelled"] as const).includes(statusRaw as any) ? statusRaw as EsportsTeamQueueTicketV7["status"] : "searching";
  return {
    id: String(row?.id || ""), rosterId: String(row?.rosterId || row?.roster_id || ""), teamId: String(row?.teamId || row?.team_id || ""),
    gameId: String(row?.gameId || row?.game_id || ""), platform: String(row?.platform || "crossplay"), mode: String(row?.mode || "Ranked Team"), region: String(row?.region || "EU"),
    teamSize: Math.max(2, num(row?.teamSize ?? row?.team_size, 2)), status,
    matchedQueueId: row?.matchedQueueId ?? row?.matched_queue_id ?? null, matchId: row?.matchId ?? row?.match_id ?? null,
    createdAt: row?.createdAt ?? row?.created_at ?? null, updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  };
}

function normalizeSide(row: any): EsportsTeamMatchSideV7 {
  return {
    teamId: String(row?.teamId || row?.team_id || ""), name: String(row?.name || "Team"), tag: String(row?.tag || ""), captainUserId: String(row?.captainUserId || row?.captain_user_id || ""),
    rating: Math.max(100, num(row?.rating, 1000)), members: rows(row?.members).map(normalizeMember).filter((m) => m.userId),
  };
}

function normalizeMatch(row: any): EsportsTeamCompetitiveMatchV7 {
  const rawStatus = String(row?.status || "matched");
  const status = (["matched", "room_ready", "pending_confirmation", "confirmed", "disputed", "cancelled"] as const).includes(rawStatus as any) ? rawStatus as EsportsTeamCompetitiveMatchV7["status"] : "matched";
  return {
    id: String(row?.id || ""), gameId: String(row?.gameId || row?.game_id || ""), platform: String(row?.platform || "crossplay"), mode: String(row?.mode || "Ranked Team"), region: String(row?.region || "EU"),
    teamSize: Math.max(2, num(row?.teamSize ?? row?.team_size, 2)), status, roomCode: row?.roomCode ?? row?.room_code ?? null,
    mySide: String(row?.mySide || row?.my_side || "A") === "B" ? "B" : "A", canReport: !!(row?.canReport ?? row?.can_report), isHostCaptain: !!(row?.isHostCaptain ?? row?.is_host_captain),
    teamA: normalizeSide(row?.teamA || row?.team_a), teamB: normalizeSide(row?.teamB || row?.team_b), reportA: row?.reportA ?? row?.report_a ?? null, reportB: row?.reportB ?? row?.report_b ?? null,
    finalScoreA: row?.finalScoreA ?? row?.final_score_a ?? null, finalScoreB: row?.finalScoreB ?? row?.final_score_b ?? null, winnerTeamId: row?.winnerTeamId ?? row?.winner_team_id ?? null,
    mmrABefore: row?.mmrABefore ?? row?.mmr_a_before ?? null, mmrAAfter: row?.mmrAAfter ?? row?.mmr_a_after ?? null, mmrBBefore: row?.mmrBBefore ?? row?.mmr_b_before ?? null, mmrBAfter: row?.mmrBAfter ?? row?.mmr_b_after ?? null,
    createdAt: row?.createdAt ?? row?.created_at ?? null, updatedAt: row?.updatedAt ?? row?.updated_at ?? null, confirmedAt: row?.confirmedAt ?? row?.confirmed_at ?? null,
  };
}

function normalizeLeaderboard(row: any, index: number): EsportsTeamLeaderboardRowV7 {
  return {
    position: Math.max(1, num(row?.position, index + 1)), teamId: String(row?.teamId || row?.team_id || ""), name: String(row?.name || "Team"), tag: String(row?.tag || ""), gameId: String(row?.gameId || row?.game_id || ""),
    teamSize: Math.max(2, num(row?.teamSize ?? row?.team_size, 2)), rating: Math.max(100, num(row?.rating, 1000)), peakRating: Math.max(100, num(row?.peakRating ?? row?.peak_rating, 1000)),
    matches: Math.max(0, num(row?.matches)), wins: Math.max(0, num(row?.wins)), losses: Math.max(0, num(row?.losses)), draws: Math.max(0, num(row?.draws)), streak: num(row?.streak),
    seasonName: String(row?.seasonName || row?.season_name || "E-SPORTS Season"), seasonSlug: String(row?.seasonSlug || row?.season_slug || "current"),
  };
}

export async function listMyTeamRankedTeamsV7(): Promise<EsportsTeamRankedTeamV7[]> {
  const { data, error } = await supabase.rpc("ms_esports_team_ranked_my_teams_v7", {} as any);
  if (error) fail(error, "Impossible de charger les équipes classées.");
  return rows(data).map(normalizeTeam).filter((row) => row.teamId);
}

export async function lockTeamRosterV7(input: { teamId: string; gameId: string; platform: string; mode: string; region: string; teamSize: number; captainUserId: string; memberUserIds: string[] }): Promise<EsportsTeamRosterV7> {
  const { data, error } = await supabase.rpc("ms_esports_lock_team_roster_v7", {
    p_team_id: input.teamId, p_game_id: input.gameId, p_platform: input.platform, p_mode: input.mode, p_region: input.region,
    p_team_size: Math.max(2, Math.min(10, Math.round(input.teamSize))), p_captain_user_id: input.captainUserId, p_member_user_ids: input.memberUserIds,
  } as any);
  if (error) fail(error, "Impossible de verrouiller le roster.");
  return normalizeRoster(Array.isArray(data) ? data[0] : data);
}

export async function getMyTeamRosterV7(teamId?: string, gameId?: string): Promise<EsportsTeamRosterV7 | null> {
  const { data, error } = await supabase.rpc("ms_esports_get_team_roster_v7", { p_team_id: teamId || null, p_game_id: gameId || null } as any);
  if (error) fail(error, "Impossible de charger le roster.");
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeRoster(row) : null;
}

export async function archiveTeamRosterV7(rosterId: string): Promise<void> {
  const { error } = await supabase.rpc("ms_esports_archive_team_roster_v7", { p_roster_id: rosterId } as any);
  if (error) fail(error, "Impossible de déverrouiller le roster.");
}

export async function joinTeamMatchmakingV7(rosterId: string): Promise<EsportsTeamQueueTicketV7> {
  const { data, error } = await supabase.rpc("ms_esports_join_team_queue_v7", { p_roster_id: rosterId } as any);
  if (error) fail(error, "Impossible de rejoindre le matchmaking d'équipe.");
  return normalizeTicket(Array.isArray(data) ? data[0] : data);
}

export async function getMyTeamMatchmakingV7(): Promise<EsportsTeamQueueTicketV7 | null> {
  const { data, error } = await supabase.rpc("ms_esports_get_team_queue_v7", {} as any);
  if (error) fail(error, "Impossible de charger la file d'équipe.");
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeTicket(row) : null;
}

export async function leaveTeamMatchmakingV7(): Promise<void> {
  const { error } = await supabase.rpc("ms_esports_leave_team_queue_v7", {} as any);
  if (error) fail(error, "Impossible de quitter la file d'équipe.");
}

export async function getMyTeamCompetitiveMatchV7(): Promise<EsportsTeamCompetitiveMatchV7 | null> {
  const { data, error } = await supabase.rpc("ms_esports_get_team_match_v7", {} as any);
  if (error) fail(error, "Impossible de charger le match d'équipe.");
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeMatch(row) : null;
}

export async function claimTeamCompetitiveRoomV7(matchId: string, roomCode: string): Promise<EsportsTeamCompetitiveMatchV7> {
  const { data, error } = await supabase.rpc("ms_esports_claim_team_room_v7", { p_match_id: matchId, p_room_code: roomCode } as any);
  if (error) fail(error, "Impossible de lier le salon au match d'équipe.");
  return normalizeMatch(Array.isArray(data) ? data[0] : data);
}

export async function submitTeamCompetitiveResultV7(matchId: string, scoreA: number, scoreB: number): Promise<EsportsTeamCompetitiveMatchV7> {
  const { data, error } = await supabase.rpc("ms_esports_submit_team_result_v7", {
    p_match_id: matchId, p_score_a: Math.max(0, Math.min(999, Math.round(Number(scoreA) || 0))), p_score_b: Math.max(0, Math.min(999, Math.round(Number(scoreB) || 0))),
  } as any);
  if (error) fail(error, "Impossible de confirmer le résultat d'équipe.");
  return normalizeMatch(Array.isArray(data) ? data[0] : data);
}

export async function listTeamLeaderboardV7(gameId: string, teamSize: number, limit = 50): Promise<EsportsTeamLeaderboardRowV7[]> {
  const { data, error } = await supabase.rpc("ms_esports_team_leaderboard_v7", { p_game_id: gameId, p_team_size: Math.max(2, Math.min(10, teamSize)), p_limit: Math.max(1, Math.min(100, limit)) } as any);
  if (error) fail(error, "Impossible de charger le classement des équipes.");
  return rows(data).map(normalizeLeaderboard).filter((row) => row.teamId);
}

export async function getPublicTeamProfileV7(teamId: string): Promise<EsportsTeamPublicProfileV7 | null> {
  const { data, error } = await supabase.rpc("ms_esports_team_public_profile_v7", { p_team_id: teamId } as any);
  if (error) fail(error, "Impossible de charger le profil public de l'équipe.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    teamId: String(row?.teamId || row?.team_id || ""), name: String(row?.name || "Team"), tag: String(row?.tag || ""), visibility: row?.visibility === "private" ? "private" : "public",
    gameIds: Array.isArray(row?.gameIds || row?.game_ids) ? (row?.gameIds || row?.game_ids).map(String) : [],
    members: rows(row?.members).map((m) => ({ ...normalizeMember(m), status: String(m?.status || "active") })),
    ratings: rows(row?.ratings).map((r) => ({ gameId: String(r?.gameId || r?.game_id || ""), teamSize: Math.max(2, num(r?.teamSize ?? r?.team_size, 2)), rating: Math.max(100, num(r?.rating, 1000)), peakRating: Math.max(100, num(r?.peakRating ?? r?.peak_rating, 1000)), matches: Math.max(0, num(r?.matches)), wins: Math.max(0, num(r?.wins)), losses: Math.max(0, num(r?.losses)), draws: Math.max(0, num(r?.draws)), streak: num(r?.streak), seasonName: String(r?.seasonName || r?.season_name || "E-SPORTS Season"), seasonSlug: String(r?.seasonSlug || r?.season_slug || "current") })),
  };
}

export function subscribeEsportsNetworkV7(onChange: () => void): () => void {
  let active = true;
  let channel: any = null;
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = String(data?.user?.id || "");
      if (!active || !uid) return;
      channel = supabase
        .channel(`esports:v7:${uid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_team_ranked_rosters" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_team_matchmaking_queue" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_team_competitive_matches" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_team_ratings" }, onChange)
        .subscribe();
    } catch {}
  })();
  return () => {
    active = false;
    if (channel) void supabase.removeChannel(channel);
  };
}
