import { supabase } from "../lib/supabaseClient";
import type { EsportsPlatform } from "./types";

export type EsportsNetworkNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  metadata: Record<string, any>;
  readAt?: string | null;
  createdAt?: string | null;
};

export type EsportsLfgApplication = {
  id: string;
  postId: string;
  postOwnerUserId: string;
  applicantUserId: string;
  applicantDisplayName: string;
  gameId: string;
  mode: string;
  rankLabel: string;
  message: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  mine: boolean;
  forMyPost: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EsportsTeamMembership = {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  teamOwnerUserId: string;
  userId: string;
  displayName: string;
  role: "owner" | "captain" | "officer" | "member";
  status: "pending" | "active" | "declined" | "left";
  requestKind: "owner" | "request" | "invite";
  message: string;
  mine: boolean;
  teamMine: boolean;
  canManage: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EsportsMatchmakingTicket = {
  id: string;
  userId: string;
  gameId: string;
  platform: EsportsPlatform;
  mode: string;
  rankLabel: string;
  region: string;
  teamSize: number;
  status: "searching" | "matched" | "cancelled" | "expired";
  matchedWithUserId?: string | null;
  matchedDisplayName?: string | null;
  matchedAvatarUrl?: string | null;
  matchedRankLabel?: string | null;
  matchedAt?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
};

export type EsportsLeaderboardRow = {
  position: number;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  gameId: string;
  communityXp: number;
  lfgAccepts: number;
  teamJoins: number;
  matchesFound: number;
  seasonName: string;
  seasonSlug: string;
};

function isV4Unavailable(error: any): boolean {
  const code = String(error?.code || "");
  const msg = String(error?.message || error || "").toLowerCase();
  return code === "42883" || code === "PGRST202" || msg.includes("could not find the function") || msg.includes("schema cache") || msg.includes("ms_esports_");
}

function fail(error: any, fallback: string): never {
  const err: any = new Error(String(error?.message || error?.details || error?.hint || fallback));
  err.code = isV4Unavailable(error) ? "esports_network_v4_migration_required" : String(error?.code || "esports_network_v4_error");
  throw err;
}

function toRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  return data == null ? [] : [data];
}

function normalizeNotification(row: any): EsportsNetworkNotification {
  return {
    id: String(row?.id || ""),
    kind: String(row?.kind || "info"),
    title: String(row?.title || "E-SPORTS"),
    body: String(row?.body || ""),
    metadata: (row?.metadata || {}) as Record<string, any>,
    readAt: row?.readAt ?? row?.read_at ?? null,
    createdAt: row?.createdAt ?? row?.created_at ?? null,
  };
}

function normalizeApplication(row: any): EsportsLfgApplication {
  const raw = String(row?.status || "pending");
  const status = (["accepted", "declined", "withdrawn"] as const).includes(raw as any) ? raw as EsportsLfgApplication["status"] : "pending";
  return {
    id: String(row?.id || ""),
    postId: String(row?.postId || row?.post_id || ""),
    postOwnerUserId: String(row?.postOwnerUserId || row?.post_owner_user_id || ""),
    applicantUserId: String(row?.applicantUserId || row?.applicant_user_id || ""),
    applicantDisplayName: String(row?.applicantDisplayName || row?.applicant_display_name || "Gamer"),
    gameId: String(row?.gameId || row?.game_id || ""),
    mode: String(row?.mode || "Casual"),
    rankLabel: String(row?.rankLabel || row?.rank_label || ""),
    message: String(row?.message || ""),
    status,
    mine: !!row?.mine,
    forMyPost: !!(row?.forMyPost ?? row?.for_my_post),
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  };
}

function normalizeMembership(row: any): EsportsTeamMembership {
  const roleRaw = String(row?.role || "member");
  const role = (["owner", "captain", "officer"] as const).includes(roleRaw as any) ? roleRaw as EsportsTeamMembership["role"] : "member";
  const statusRaw = String(row?.status || "pending");
  const status = (["active", "declined", "left"] as const).includes(statusRaw as any) ? statusRaw as EsportsTeamMembership["status"] : "pending";
  const kindRaw = String(row?.requestKind || row?.request_kind || "request");
  const requestKind = (["owner", "invite"] as const).includes(kindRaw as any) ? kindRaw as EsportsTeamMembership["requestKind"] : "request";
  return {
    id: String(row?.id || ""),
    teamId: String(row?.teamId || row?.team_id || ""),
    teamName: String(row?.teamName || row?.team_name || "Team"),
    teamTag: String(row?.teamTag || row?.team_tag || ""),
    teamOwnerUserId: String(row?.teamOwnerUserId || row?.team_owner_user_id || ""),
    userId: String(row?.userId || row?.user_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Gamer"),
    role,
    status,
    requestKind,
    message: String(row?.message || ""),
    mine: !!row?.mine,
    teamMine: !!(row?.teamMine ?? row?.team_mine),
    canManage: !!(row?.canManage ?? row?.can_manage),
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  };
}

function normalizeTicket(row: any): EsportsMatchmakingTicket {
  const raw = String(row?.status || "searching");
  const status = (["matched", "cancelled", "expired"] as const).includes(raw as any) ? raw as EsportsMatchmakingTicket["status"] : "searching";
  return {
    id: String(row?.id || ""),
    userId: String(row?.userId || row?.user_id || ""),
    gameId: String(row?.gameId || row?.game_id || ""),
    platform: String(row?.platform || "pc") as EsportsPlatform,
    mode: String(row?.mode || "Casual"),
    rankLabel: String(row?.rankLabel || row?.rank_label || ""),
    region: String(row?.region || ""),
    teamSize: Math.max(1, Number(row?.teamSize || row?.team_size || 1)),
    status,
    matchedWithUserId: row?.matchedWithUserId ?? row?.matched_with_user_id ?? null,
    matchedDisplayName: row?.matchedDisplayName ?? row?.matched_display_name ?? null,
    matchedAvatarUrl: row?.matchedAvatarUrl ?? row?.matched_avatar_url ?? null,
    matchedRankLabel: row?.matchedRankLabel ?? row?.matched_rank_label ?? null,
    matchedAt: row?.matchedAt ?? row?.matched_at ?? null,
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    expiresAt: row?.expiresAt ?? row?.expires_at ?? null,
  };
}

function normalizeLeaderboard(row: any, index: number): EsportsLeaderboardRow {
  return {
    position: Math.max(1, Number(row?.position || index + 1)),
    userId: String(row?.userId || row?.user_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Gamer"),
    avatarUrl: row?.avatarUrl ?? row?.avatar_url ?? null,
    countryCode: row?.countryCode ?? row?.country_code ?? null,
    gameId: String(row?.gameId || row?.game_id || "all"),
    communityXp: Math.max(0, Number(row?.communityXp || row?.community_xp || 0)),
    lfgAccepts: Math.max(0, Number(row?.lfgAccepts || row?.lfg_accepts || 0)),
    teamJoins: Math.max(0, Number(row?.teamJoins || row?.team_joins || 0)),
    matchesFound: Math.max(0, Number(row?.matchesFound || row?.matches_found || 0)),
    seasonName: String(row?.seasonName || row?.season_name || "E-SPORTS Season"),
    seasonSlug: String(row?.seasonSlug || row?.season_slug || "current"),
  };
}

export async function applyToEsportsLfg(postId: string, message = ""): Promise<EsportsLfgApplication> {
  const { data, error } = await supabase.rpc("ms_esports_apply_lfg", { p_post_id: postId, p_message: message.slice(0, 300) } as any);
  if (error) fail(error, "Impossible d'envoyer la candidature LFG.");
  return normalizeApplication(Array.isArray(data) ? data[0] : data);
}

export async function listEsportsLfgApplications(postId?: string): Promise<EsportsLfgApplication[]> {
  const { data, error } = await supabase.rpc("ms_esports_list_lfg_applications", { p_post_id: postId || null, p_limit: 120 } as any);
  if (error) fail(error, "Impossible de charger les candidatures LFG.");
  return toRows(data).map(normalizeApplication).filter((row) => row.id);
}

export async function reviewEsportsLfgApplication(id: string, status: "accepted" | "declined") {
  const { data, error } = await supabase.rpc("ms_esports_review_lfg_application", { p_application_id: id, p_status: status } as any);
  if (error) fail(error, "Impossible de traiter la candidature LFG.");
  return data;
}

export async function withdrawEsportsLfgApplication(id: string) {
  const { data, error } = await supabase.rpc("ms_esports_withdraw_lfg_application", { p_application_id: id } as any);
  if (error) fail(error, "Impossible de retirer la candidature LFG.");
  return data;
}

export async function requestEsportsTeamJoin(teamId: string, message = "") {
  const { data, error } = await supabase.rpc("ms_esports_request_team_join", { p_team_id: teamId, p_message: message.slice(0, 240) } as any);
  if (error) fail(error, "Impossible d'envoyer la demande de clan.");
  return normalizeMembership(Array.isArray(data) ? data[0] : data);
}

export async function inviteEsportsTeamMember(teamId: string, targetUserId: string, role: "captain" | "officer" | "member" = "member", message = "") {
  const { data, error } = await supabase.rpc("ms_esports_invite_team_member", { p_team_id: teamId, p_target_user_id: targetUserId, p_role: role, p_message: message.slice(0, 240) } as any);
  if (error) fail(error, "Impossible d'inviter ce joueur dans le clan.");
  return normalizeMembership(Array.isArray(data) ? data[0] : data);
}

export async function listEsportsTeamMemberships(teamId?: string): Promise<EsportsTeamMembership[]> {
  const { data, error } = await supabase.rpc("ms_esports_list_team_memberships", { p_team_id: teamId || null, p_limit: 200 } as any);
  if (error) fail(error, "Impossible de charger les membres des clans.");
  return toRows(data).map(normalizeMembership).filter((row) => row.id);
}

export async function reviewEsportsTeamMembership(id: string, status: "active" | "declined") {
  const { data, error } = await supabase.rpc("ms_esports_review_team_membership", { p_membership_id: id, p_status: status } as any);
  if (error) fail(error, "Impossible de traiter la demande de clan.");
  return data;
}

export async function setEsportsTeamMemberRole(id: string, role: "captain" | "officer" | "member") {
  const { data, error } = await supabase.rpc("ms_esports_set_team_member_role", { p_membership_id: id, p_role: role } as any);
  if (error) fail(error, "Impossible de modifier le rôle du membre.");
  return data;
}

export async function leaveEsportsTeam(teamId: string) {
  const { data, error } = await supabase.rpc("ms_esports_leave_team", { p_team_id: teamId } as any);
  if (error) fail(error, "Impossible de quitter le clan.");
  return data;
}

export async function joinEsportsMatchmaking(input: { gameId: string; platform: EsportsPlatform; mode: string; rankLabel?: string; region?: string; teamSize?: number }): Promise<EsportsMatchmakingTicket> {
  const { data, error } = await supabase.rpc("ms_esports_join_matchmaking", {
    p_game_id: input.gameId,
    p_platform: input.platform,
    p_mode: input.mode || "Casual",
    p_rank_label: input.rankLabel || null,
    p_region: input.region || null,
    p_team_size: Math.max(1, Math.min(10, Number(input.teamSize || 1))),
  } as any);
  if (error) fail(error, "Impossible de rejoindre la file de matchmaking.");
  return normalizeTicket(Array.isArray(data) ? data[0] : data);
}

export async function getMyEsportsMatchmaking(): Promise<EsportsMatchmakingTicket | null> {
  const { data, error } = await supabase.rpc("ms_esports_get_matchmaking", {} as any);
  if (error) fail(error, "Impossible de charger la file de matchmaking.");
  const item = Array.isArray(data) ? data[0] : data;
  return item ? normalizeTicket(item) : null;
}

export async function leaveEsportsMatchmaking() {
  const { data, error } = await supabase.rpc("ms_esports_leave_matchmaking", {} as any);
  if (error) fail(error, "Impossible de quitter la file de matchmaking.");
  return data;
}

export async function listEsportsNotifications(limit = 60): Promise<EsportsNetworkNotification[]> {
  const { data, error } = await supabase.rpc("ms_esports_list_notifications", { p_limit: Math.max(1, Math.min(120, limit)) } as any);
  if (error) fail(error, "Impossible de charger les notifications E-SPORTS.");
  return toRows(data).map(normalizeNotification).filter((row) => row.id);
}

export async function markEsportsNotificationRead(id?: string) {
  const { data, error } = await supabase.rpc("ms_esports_mark_notification_read", { p_notification_id: id || null } as any);
  if (error) fail(error, "Impossible de marquer la notification comme lue.");
  return data;
}

export async function listEsportsSeasonLeaderboard(gameId?: string, limit = 50): Promise<EsportsLeaderboardRow[]> {
  const { data, error } = await supabase.rpc("ms_esports_leaderboard", { p_game_id: gameId || null, p_limit: Math.max(1, Math.min(100, limit)) } as any);
  if (error) fail(error, "Impossible de charger le classement E-SPORTS.");
  return toRows(data).map(normalizeLeaderboard).filter((row) => row.userId);
}

export function subscribeEsportsNetworkV4(onChange: () => void): () => void {
  let active = true;
  let channel: any = null;
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = String(data?.user?.id || "");
      if (!active || !uid) return;
      channel = supabase
        .channel(`esports:v4:${uid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_notifications", filter: `user_id=eq.${uid}` }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_matchmaking_queue", filter: `user_id=eq.${uid}` }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_lfg_applications", filter: `applicant_user_id=eq.${uid}` }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "ms_esports_team_members", filter: `user_id=eq.${uid}` }, onChange)
        .subscribe();
    } catch {}
  })();
  return () => {
    active = false;
    if (channel) void supabase.removeChannel(channel);
  };
}
