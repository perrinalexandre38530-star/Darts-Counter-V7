
// @ts-nocheck
// =============================================================
// linkedProfileSync.ts
// Association profil local ↔ compte ami : lecture distante sécurisée.
// Objectif : quand un profil local est associé à un compte ami accepté,
// l'affichage local peut utiliser les stats, l'avatar et l'historique du compte ami
// sans écraser les données locales.
// =============================================================
import { apiPost } from "./apiClient";
import type { Profile } from "./types";

export type LinkedProfileSnapshot = {
  link: any;
  friendUser?: any;
  friendProfile?: any;
  payload?: any;
  updatedAt?: string | null;
};

export type LinkedProfileProjection = {
  profiles: any[];
  history: any[];
  normalizedHint: any[];
  byLocalProfileId: Record<string, any>;
  snapshots: LinkedProfileSnapshot[];
};

const CACHE_TTL_MS = 30_000;
let cacheKey = "";
let cacheAt = 0;
let cacheValue: LinkedProfileProjection | null = null;

function s(v: any) { return String(v ?? "").trim(); }
function low(v: any) { return s(v).toLowerCase(); }

function arr(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs.filter(Boolean as any) as any)) as T[];
}

function firstObj(...vals: any[]) {
  for (const v of vals) if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return null;
}

function extractStoreLike(payload: any): any {
  if (!payload || typeof payload !== "object") return {};
  const idb = payload.idb && typeof payload.idb === "object" ? payload.idb : {};
  const storeKeys = Object.keys(idb).filter((k) => {
    const key = String(k || "");
    return key === "dc-store-v1" || key.endsWith(":dc-store-v1") || key.includes("store");
  });
  const idbStore = storeKeys.length ? idb[storeKeys[0]] : null;
  return firstObj(
    payload.store,
    payload.data,
    payload.payload,
    payload.snapshot,
    idbStore,
    payload
  ) || {};
}

function extractProfiles(payload: any): any[] {
  const st = extractStoreLike(payload);
  return uniq([
    ...arr(st.profiles),
    ...arr(st.localProfiles),
    ...arr(st.players),
    ...arr(st?.profiles?.list),
    ...arr(payload?.profiles),
    ...arr(payload?.data?.profiles),
  ].filter((p: any) => p && typeof p === "object") as any[]);
}

function extractHistory(payload: any): any[] {
  const st = extractStoreLike(payload);
  const histDumpRows = payload?.history?.rows && typeof payload.history.rows === "object"
    ? Object.values(payload.history.rows)
    : [];
  return uniq([
    ...arr(st.history),
    ...arr(st.matches),
    ...arr(payload?.history),
    ...arr(payload?.matches),
    ...arr(payload?.data?.history),
    ...arr(histDumpRows),
  ].filter((r: any) => r && typeof r === "object") as any[]);
}

function pickName(p: any): string {
  return s(p?.displayName || p?.name || p?.nickname || p?.public_name || p?.label);
}

function pickAvatar(p: any): string | null {
  return (
    p?.avatarUrl ||
    p?.avatar_url ||
    p?.avatarDataUrl ||
    p?.avatar_data_url ||
    p?.avatar ||
    p?.photoURL ||
    null
  );
}

function findFriendProfile(payload: any, friendUser: any, link: any): any {
  const profiles = extractProfiles(payload);
  const friendIds = uniq([
    friendUser?.id,
    friendUser?.userId,
    link?.friendUserId,
    link?.targetUser?.id,
    link?.targetUser?.userId,
  ].map(s));
  const friendNames = uniq([
    friendUser?.displayName,
    friendUser?.nickname,
    link?.friendDisplayName,
    link?.targetUser?.displayName,
    link?.targetUser?.nickname,
  ].map(low));

  return (
    profiles.find((p: any) => friendIds.includes(s(p?.userId || p?.user_id || p?.accountId || p?.ownerUserId))) ||
    profiles.find((p: any) => friendIds.includes(s(p?.id || p?.profileId || p?.playerId))) ||
    profiles.find((p: any) => friendNames.includes(low(pickName(p)))) ||
    null
  );
}

function playerMatchesFriend(p: any, friendProfile: any, friendUser: any): boolean {
  const ids = uniq([
    friendProfile?.id,
    friendProfile?.profileId,
    friendProfile?.playerId,
    friendProfile?.userId,
    friendProfile?.user_id,
    friendUser?.id,
    friendUser?.userId,
  ].map(s));
  const names = uniq([pickName(friendProfile), friendUser?.displayName, friendUser?.nickname].map(low));
  const pids = uniq([p?.id, p?.playerId, p?.profileId, p?.userId, p?.user_id].map(s));
  if (pids.some((id) => ids.includes(id))) return true;
  return names.includes(low(pickName(p)));
}

function rewritePlayersInObject(obj: any, localProfile: any, friendProfile: any, friendUser: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const localId = s(localProfile?.id || localProfile?.profileId || localProfile?.playerId);
  if (!localId) return obj;
  const localName = pickName(friendProfile) || pickName(localProfile) || pickName(friendUser) || localId;
  const localAvatar = pickAvatar(friendProfile) || pickAvatar(friendUser) || pickAvatar(localProfile) || null;

  const clone = Array.isArray(obj) ? obj.map((v) => rewritePlayersInObject(v, localProfile, friendProfile, friendUser)) : { ...obj };

  const maybeRewritePlayer = (p: any) => {
    if (!p || typeof p !== "object") return p;
    if (!playerMatchesFriend(p, friendProfile, friendUser)) return p;
    return {
      ...p,
      id: localId,
      playerId: localId,
      profileId: localId,
      userId: localProfile?.userId ?? p?.userId,
      linkedRemoteUserId: friendUser?.id || friendUser?.userId || null,
      name: localName,
      displayName: localName,
      nickname: localName,
      avatarUrl: localAvatar,
      avatarDataUrl: localAvatar,
      avatar: localAvatar,
    };
  };

  const playerArrayKeys = ["players", "participants", "teams"];
  for (const key of playerArrayKeys) {
    if (Array.isArray(clone[key])) clone[key] = clone[key].map(maybeRewritePlayer);
  }

  // Champs fréquents X01 / stats / summary
  for (const key of ["visits", "turns", "throws", "darts", "rounds", "legs", "sets"]) {
    if (Array.isArray(clone[key])) clone[key] = clone[key].map((v: any) => rewritePlayersInObject(v, localProfile, friendProfile, friendUser));
  }
  for (const key of ["payload", "summary", "result", "stats", "session", "game", "x01"]) {
    if (clone[key] && typeof clone[key] === "object") clone[key] = rewritePlayersInObject(clone[key], localProfile, friendProfile, friendUser);
  }

  if (playerMatchesFriend(clone, friendProfile, friendUser)) {
    Object.assign(clone, maybeRewritePlayer(clone));
  }
  return clone;
}

function makeVirtualHistoryForLink(snapshot: LinkedProfileSnapshot, localProfile: any): any[] {
  const link = snapshot?.link || {};
  const friendUser = snapshot?.friendUser || link?.targetUser || {};
  const friendProfile = snapshot?.friendProfile || findFriendProfile(snapshot?.payload, friendUser, link) || friendUser;
  const localId = s(localProfile?.id || link?.localProfileId);
  if (!localId) return [];

  return extractHistory(snapshot?.payload).map((row: any, idx: number) => {
    const cloned = rewritePlayersInObject(row, { ...localProfile, id: localId }, friendProfile, friendUser);
    const id = s(cloned?.id || cloned?.matchId || cloned?.resumeId || idx);
    return {
      ...cloned,
      id: `linked:${link?.id || localId}:${id}`,
      originalId: id,
      linkedRemote: true,
      linkedRemoteUserId: friendUser?.id || friendUser?.userId || null,
      linkedLocalProfileId: localId,
      linkedProfileName: pickName(friendProfile) || pickName(localProfile),
      __linkedRemote: true,
    };
  });
}

export function projectLinkedSnapshots(localProfiles: any[], snapshots: LinkedProfileSnapshot[]): LinkedProfileProjection {
  const localById = new Map<string, any>();
  for (const p of arr(localProfiles)) {
    const id = s(p?.id || p?.profileId || p?.playerId);
    if (id) localById.set(id, p);
  }

  const byLocalProfileId: Record<string, any> = {};
  const profiles: any[] = [];
  const history: any[] = [];

  for (const snap of arr(snapshots)) {
    const link = snap?.link || {};
    if (String(link?.status || "").toLowerCase() !== "accepted") continue;
    const localId = s(link?.localProfileId || link?.local_profile_id);
    const local = localById.get(localId) || { id: localId, name: link?.localProfileName || "Profil lié" };
    if (!localId) continue;

    const friendUser = snap?.friendUser || link?.targetUser || {};
    const friendProfile = snap?.friendProfile || findFriendProfile(snap?.payload, friendUser, link) || {};
    const name = pickName(friendProfile) || pickName(friendUser) || pickName(local) || localId;
    const avatar = pickAvatar(friendProfile) || pickAvatar(friendUser) || link?.friendAvatarUrl || pickAvatar(local);

    const projected = {
      ...local,
      id: localId,
      profileId: localId,
      playerId: localId,
      userId: local?.userId ?? null,
      name,
      displayName: name,
      nickname: name,
      avatarUrl: avatar || null,
      avatarDataUrl: avatar || null,
      avatar: avatar || null,
      linkedFriendUserId: friendUser?.id || friendUser?.userId || link?.friendUserId || null,
      linkedProfileSync: true,
      linkedProfileUpdatedAt: snap?.updatedAt || link?.updatedAt || null,
      stats: friendProfile?.stats || link?.statsMeta?.stats || local?.stats || {},
      statsMeta: link?.statsMeta || {},
    };

    profiles.push(projected);
    byLocalProfileId[localId] = { link, friendUser, friendProfile, profile: projected, snapshot: snap };
    history.push(...makeVirtualHistoryForLink(snap, projected));
  }

  return { profiles, history, normalizedHint: [], byLocalProfileId, snapshots };
}

export async function loadLinkedProfileProjection(localProfiles: any[] = []): Promise<LinkedProfileProjection> {
  const ids = arr(localProfiles).map((p: any) => s(p?.id || p?.profileId || p?.playerId)).filter(Boolean).sort();
  const nextKey = ids.join("|");
  const now = Date.now();
  if (cacheValue && cacheKey === nextKey && now - cacheAt < CACHE_TTL_MS) return cacheValue;

  try {
    const res = await apiPost("/online/profile-links/linked-snapshots", { localProfileIds: ids });
    const snapshots: LinkedProfileSnapshot[] = Array.isArray(res?.snapshots) ? res.snapshots : [];
    const projected = projectLinkedSnapshots(localProfiles, snapshots);
    cacheKey = nextKey;
    cacheAt = now;
    cacheValue = projected;
    return projected;
  } catch (error) {
    return { profiles: [], history: [], normalizedHint: [], byLocalProfileId: {}, snapshots: [] };
  }
}

export function mergeLinkedProfiles(localProfiles: any[], linkedProfiles: any[]): any[] {
  const byId = new Map<string, any>();
  for (const p of arr(localProfiles)) {
    const id = s(p?.id || p?.profileId || p?.playerId);
    if (id) byId.set(id, p);
  }
  for (const p of arr(linkedProfiles)) {
    const id = s(p?.id || p?.profileId || p?.playerId);
    if (id) byId.set(id, { ...(byId.get(id) || {}), ...p });
  }
  return Array.from(byId.values());
}
