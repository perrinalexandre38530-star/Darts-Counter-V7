import { supabase } from "../lib/supabaseClient";
import type { EsportsPlatform, GamerIdentity } from "./types";

export type PublicEsportsPlayer = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  status?: string | null;
  lastSeenAt?: string | null;
  gameIds: string[];
  platforms: string[];
  rankByGame: Record<string, string>;
  lookingForGroup: boolean;
  activity?: Record<string, any> | null;
};

export type PublicEsportsLfgPost = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  gameId: string;
  platform: EsportsPlatform;
  mode: string;
  rankLabel: string;
  message: string;
  slotsNeeded: number;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  expiresAt?: string | null;
  mine?: boolean;
};

export type PublicEsportsTeam = {
  id: string;
  ownerUserId: string;
  ownerDisplayName?: string | null;
  name: string;
  tag: string;
  gameIds: string[];
  memberNames: string[];
  visibility: "public" | "private";
  createdAt?: string | null;
  updatedAt?: string | null;
  mine?: boolean;
};

function rpcUnavailable(error: any): boolean {
  const code = String(error?.code || "");
  const msg = String(error?.message || error || "").toLowerCase();
  return code === "42883" || code === "PGRST202" || msg.includes("could not find the function") || msg.includes("schema cache");
}

function throwRpc(error: any, fallback: string): never {
  const err: any = new Error(String(error?.message || error?.details || error?.hint || fallback));
  err.code = rpcUnavailable(error) ? "esports_public_migration_required" : String(error?.code || "esports_public_error");
  throw err;
}

function rows(data: any): any[] {
  if (Array.isArray(data)) return data;
  return data == null ? [] : [data];
}

function normalizePlayer(row: any): PublicEsportsPlayer {
  return {
    userId: String(row?.userId || row?.user_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Gamer"),
    avatarUrl: row?.avatarUrl ?? row?.avatar_url ?? null,
    countryCode: row?.countryCode ?? row?.country_code ?? null,
    status: row?.status ?? null,
    lastSeenAt: row?.lastSeenAt ?? row?.last_seen_at ?? null,
    gameIds: Array.isArray(row?.gameIds || row?.game_ids) ? (row?.gameIds || row?.game_ids).map(String) : [],
    platforms: Array.isArray(row?.platforms) ? row.platforms.map(String) : [],
    rankByGame: (row?.rankByGame || row?.rank_by_game || {}) as Record<string, string>,
    lookingForGroup: !!(row?.lookingForGroup ?? row?.looking_for_group),
    activity: row?.activity || null,
  };
}

function normalizeLfg(row: any): PublicEsportsLfgPost {
  return {
    id: String(row?.id || ""),
    userId: String(row?.userId || row?.user_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Gamer"),
    avatarUrl: row?.avatarUrl ?? row?.avatar_url ?? null,
    countryCode: row?.countryCode ?? row?.country_code ?? null,
    gameId: String(row?.gameId || row?.game_id || ""),
    platform: String(row?.platform || "pc") as EsportsPlatform,
    mode: String(row?.mode || "Casual"),
    rankLabel: String(row?.rankLabel || row?.rank_label || ""),
    message: String(row?.message || ""),
    slotsNeeded: Math.max(1, Number(row?.slotsNeeded || row?.slots_needed || 1)),
    status: String(row?.status || "open"),
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    expiresAt: row?.expiresAt ?? row?.expires_at ?? null,
    mine: !!row?.mine,
  };
}

function normalizeTeam(row: any): PublicEsportsTeam {
  return {
    id: String(row?.id || ""),
    ownerUserId: String(row?.ownerUserId || row?.owner_user_id || ""),
    ownerDisplayName: row?.ownerDisplayName ?? row?.owner_display_name ?? null,
    name: String(row?.name || "Team"),
    tag: String(row?.tag || ""),
    gameIds: Array.isArray(row?.gameIds || row?.game_ids) ? (row?.gameIds || row?.game_ids).map(String) : [],
    memberNames: Array.isArray(row?.memberNames || row?.member_names) ? (row?.memberNames || row?.member_names).map(String) : [],
    visibility: row?.visibility === "private" ? "private" : "public",
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    mine: !!row?.mine,
  };
}

export async function publishPublicEsportsProfile(gamer: GamerIdentity, activity?: Record<string, any> | null) {
  const platforms = Object.entries(gamer.handles || {}).filter(([, value]) => String(value || "").trim()).map(([key]) => key);
  if (gamer.primaryPlatform && !platforms.includes(gamer.primaryPlatform)) platforms.unshift(gamer.primaryPlatform);
  const { data, error } = await supabase.rpc("ms_esports_upsert_profile", {
    p_display_name: gamer.displayName || "Gamer",
    p_bio: gamer.bio || "",
    p_country_code: gamer.country || null,
    p_game_ids: gamer.favoriteGameIds || [],
    p_platforms: platforms,
    p_rank_by_game: gamer.rankByGame || {},
    p_looking_for_group: !!gamer.lookingForGroup,
    p_activity: activity || {},
  } as any);
  if (error) throwRpc(error, "Impossible de publier le profil E-SPORTS.");
  return Array.isArray(data) ? data[0] : data;
}

export async function searchPublicEsportsPlayers(input: { query?: string; gameId?: string; platform?: string; rank?: string; limit?: number } = {}): Promise<PublicEsportsPlayer[]> {
  const { data, error } = await supabase.rpc("ms_esports_search_players", {
    p_query: input.query || null,
    p_game_id: input.gameId || null,
    p_platform: input.platform || null,
    p_rank: input.rank || null,
    p_limit: Math.max(1, Math.min(100, Number(input.limit || 50))),
  } as any);
  if (error) throwRpc(error, "Recherche E-SPORTS indisponible.");
  return rows(data).map(normalizePlayer).filter((row) => row.userId);
}

export async function publishPublicEsportsLfg(input: { gameId: string; platform: EsportsPlatform; mode: string; rankLabel?: string; message?: string; slotsNeeded: number }): Promise<PublicEsportsLfgPost> {
  const { data, error } = await supabase.rpc("ms_esports_publish_lfg", {
    p_game_id: input.gameId,
    p_platform: input.platform,
    p_mode: input.mode || "Casual",
    p_rank_label: input.rankLabel || null,
    p_message: input.message || null,
    p_slots_needed: Math.max(1, Math.min(20, Number(input.slotsNeeded || 1))),
  } as any);
  if (error) throwRpc(error, "Impossible de publier l'annonce LFG.");
  return normalizeLfg(Array.isArray(data) ? data[0] : data);
}

export async function listPublicEsportsLfg(input: { gameId?: string; platform?: string; query?: string; mineOnly?: boolean; limit?: number } = {}): Promise<PublicEsportsLfgPost[]> {
  const { data, error } = await supabase.rpc("ms_esports_list_lfg", {
    p_game_id: input.gameId || null,
    p_platform: input.platform || null,
    p_query: input.query || null,
    p_mine_only: !!input.mineOnly,
    p_limit: Math.max(1, Math.min(150, Number(input.limit || 80))),
  } as any);
  if (error) throwRpc(error, "Impossible de charger les annonces LFG.");
  return rows(data).map(normalizeLfg).filter((row) => row.id);
}

export async function setPublicEsportsLfgStatus(id: string, status: "open" | "closed") {
  const { data, error } = await supabase.rpc("ms_esports_set_lfg_status", { p_post_id: id, p_status: status } as any);
  if (error) throwRpc(error, "Impossible de modifier l'annonce LFG.");
  return data;
}

export async function createPublicEsportsTeam(input: { name: string; tag?: string; gameIds?: string[]; memberNames?: string[]; visibility?: "public" | "private" }): Promise<PublicEsportsTeam> {
  const { data, error } = await supabase.rpc("ms_esports_create_team", {
    p_name: input.name,
    p_tag: input.tag || null,
    p_game_ids: input.gameIds || [],
    p_member_names: input.memberNames || [],
    p_visibility: input.visibility || "public",
  } as any);
  if (error) throwRpc(error, "Impossible de synchroniser l'équipe.");
  return normalizeTeam(Array.isArray(data) ? data[0] : data);
}

export async function listPublicEsportsTeams(input: { gameId?: string; ownedOnly?: boolean; limit?: number } = {}): Promise<PublicEsportsTeam[]> {
  const { data, error } = await supabase.rpc("ms_esports_list_teams", {
    p_game_id: input.gameId || null,
    p_owned_only: !!input.ownedOnly,
    p_limit: Math.max(1, Math.min(100, Number(input.limit || 50))),
  } as any);
  if (error) throwRpc(error, "Impossible de charger les équipes publiques.");
  return rows(data).map(normalizeTeam).filter((row) => row.id);
}

export async function deletePublicEsportsTeam(id: string) {
  const { data, error } = await supabase.rpc("ms_esports_delete_team", { p_team_id: id } as any);
  if (error) throwRpc(error, "Impossible de supprimer l'équipe synchronisée.");
  return data;
}
