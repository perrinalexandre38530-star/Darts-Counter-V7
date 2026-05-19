// =============================================================
// src/lib/babyfootLeagueOnlineApi.ts
// Baby-Foot — Ligues ONLINE NAS V1
// Couche additive : publication public/privé, sync, résultats, forum, commentaires.
// =============================================================

import { apiDelete, apiGet, apiPost, apiPut } from "./apiClient";
import type { BabyFootLeague, BabyFootLeagueFixture } from "./babyfootLeagueStore";

export type BabyFootLeagueVisibility = "private" | "public";


export type BabyFootOnlineFriend = {
  id: string;
  userId: string;
  displayName: string;
  nickname?: string;
  avatarUrl?: string | null;
  status?: string;
};

export async function listBabyFootOnlineFriends(): Promise<BabyFootOnlineFriend[]> {
  const res = await apiGet("/online/friends");
  const list = Array.isArray(res?.friends) ? res.friends : [];
  return list.map((f: any) => ({
    id: String(f?.userId || f?.id || ""),
    userId: String(f?.userId || f?.id || ""),
    displayName: String(f?.displayName || f?.nickname || "Ami"),
    nickname: f?.nickname || undefined,
    avatarUrl: f?.avatarUrl || f?.avatar_url || null,
    status: f?.status || "offline",
  })).filter((f: BabyFootOnlineFriend) => !!f.userId);
}


function normalizeVisibility(value: any): BabyFootLeagueVisibility {
  return String(value || "private").toLowerCase() === "public" ? "public" : "private";
}

export function getBabyFootLeagueOnlineId(league: Partial<BabyFootLeague> & any): string {
  return String(league?.onlineId || league?.online?.id || "").trim();
}

export function normalizeBabyFootOnlineLeague(raw: any): BabyFootLeague & any {
  const league = { ...(raw || {}) } as BabyFootLeague & any;
  league.onlineId = getBabyFootLeagueOnlineId(league);
  league.visibility = normalizeVisibility(league.visibility || league.online?.visibility);
  league.shareCode = league.shareCode || league.online?.shareCode || null;
  return league;
}

export async function listBabyFootOnlineLeagues(): Promise<(BabyFootLeague & any)[]> {
  const res = await apiGet("/babyfoot/leagues");
  return Array.isArray(res?.leagues) ? res.leagues.map(normalizeBabyFootOnlineLeague) : [];
}

export async function listPublicBabyFootOnlineLeagues(): Promise<(BabyFootLeague & any)[]> {
  const res = await apiGet("/babyfoot/leagues/public");
  return Array.isArray(res?.leagues) ? res.leagues.map(normalizeBabyFootOnlineLeague) : [];
}

export async function getBabyFootOnlineLeague(idOrCode: string): Promise<BabyFootLeague & any> {
  const res = await apiGet(`/babyfoot/leagues/${encodeURIComponent(String(idOrCode || ""))}`);
  return normalizeBabyFootOnlineLeague(res?.league);
}

export async function publishBabyFootLeagueOnline(league: BabyFootLeague & any, visibility: BabyFootLeagueVisibility = "private"): Promise<BabyFootLeague & any> {
  const res = await apiPost("/babyfoot/leagues", {
    league: { ...league, visibility },
    visibility,
  });
  return normalizeBabyFootOnlineLeague(res?.league);
}

export async function syncBabyFootLeagueOnline(league: BabyFootLeague & any, visibility?: BabyFootLeagueVisibility): Promise<BabyFootLeague & any> {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) return publishBabyFootLeagueOnline(league, visibility || normalizeVisibility(league.visibility));
  const nextVisibility = visibility || normalizeVisibility(league.visibility);
  const res = await apiPut(`/babyfoot/leagues/${encodeURIComponent(onlineId)}`, {
    league: { ...league, visibility: nextVisibility },
    visibility: nextVisibility,
  });
  return normalizeBabyFootOnlineLeague(res?.league);
}

export async function deleteBabyFootLeagueOnline(league: BabyFootLeague & any): Promise<void> {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) return;
  await apiDelete(`/babyfoot/leagues/${encodeURIComponent(onlineId)}`);
}

export async function joinBabyFootOnlineLeague(idOrCode: string, participantId?: string): Promise<BabyFootLeague & any> {
  const res = await apiPost(`/babyfoot/leagues/${encodeURIComponent(String(idOrCode || ""))}/join`, { participantId });
  return normalizeBabyFootOnlineLeague(res?.league);
}

export async function submitBabyFootLeagueOnlineResult(
  league: BabyFootLeague & any,
  fixtureOrResult: Partial<BabyFootLeagueFixture> & {
    fixtureId?: string;
    homeId?: string;
    awayId?: string;
    scoreHome: number;
    scoreAway: number;
    playedAt?: number | null;
    stats?: any;
    comments?: any[];
    source?: "calendar" | "manual";
  }
): Promise<BabyFootLeague & any | null> {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) return null;
  const payload = {
    fixtureId: fixtureOrResult.fixtureId || fixtureOrResult.id || "",
    homeId: fixtureOrResult.homeId || "",
    awayId: fixtureOrResult.awayId || "",
    scoreHome: Math.max(0, Math.floor(Number(fixtureOrResult.scoreHome || 0))),
    scoreAway: Math.max(0, Math.floor(Number(fixtureOrResult.scoreAway || 0))),
    playedAt: fixtureOrResult.playedAt || Date.now(),
    source: fixtureOrResult.source || "manual",
    stats: fixtureOrResult.stats || null,
    comments: Array.isArray(fixtureOrResult.comments) ? fixtureOrResult.comments : [],
  };
  const res = await apiPost(`/babyfoot/leagues/${encodeURIComponent(onlineId)}/results`, payload);
  return normalizeBabyFootOnlineLeague(res?.league);
}

export async function listBabyFootMatchComments(league: BabyFootLeague & any, fixtureId: string) {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) return [];
  const res = await apiGet(`/babyfoot/leagues/${encodeURIComponent(onlineId)}/matches/${encodeURIComponent(fixtureId)}/comments`);
  return Array.isArray(res?.comments) ? res.comments : [];
}

export async function addBabyFootMatchComment(league: BabyFootLeague & any, fixtureId: string, comment: string) {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) throw new Error("Ligue non publiée online");
  const res = await apiPost(`/babyfoot/leagues/${encodeURIComponent(onlineId)}/matches/${encodeURIComponent(fixtureId)}/comments`, { comment });
  return res?.comment || null;
}

export async function listBabyFootLeagueForum(league: BabyFootLeague & any) {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) return [];
  const res = await apiGet(`/babyfoot/leagues/${encodeURIComponent(onlineId)}/forum`);
  return Array.isArray(res?.threads) ? res.threads : [];
}

export async function createBabyFootLeagueForumThread(league: BabyFootLeague & any, title: string, message: string) {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) throw new Error("Ligue non publiée online");
  return apiPost(`/babyfoot/leagues/${encodeURIComponent(onlineId)}/forum`, { title, message });
}

export async function listBabyFootLeagueForumPosts(league: BabyFootLeague & any, threadId: string) {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) return [];
  const res = await apiGet(`/babyfoot/leagues/${encodeURIComponent(onlineId)}/forum/${encodeURIComponent(threadId)}`);
  return Array.isArray(res?.posts) ? res.posts : [];
}

export async function addBabyFootLeagueForumPost(league: BabyFootLeague & any, threadId: string, message: string) {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) throw new Error("Ligue non publiée online");
  const res = await apiPost(`/babyfoot/leagues/${encodeURIComponent(onlineId)}/forum/${encodeURIComponent(threadId)}`, { message });
  return res?.post || null;
}


export async function startBabyFootLeagueFixtureOnline(league: BabyFootLeague & any, fixtureId: string) {
  const onlineId = getBabyFootLeagueOnlineId(league);
  if (!onlineId) throw new Error("Ligue non publiée online");
  return apiPost(`/babyfoot/leagues/${encodeURIComponent(onlineId)}/fixtures/${encodeURIComponent(String(fixtureId || ""))}/lobby`, {});
}
