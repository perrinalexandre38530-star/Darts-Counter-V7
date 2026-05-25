
// @ts-nocheck
// =============================================================
// linkedProfileSync.ts
// Association profil local ↔ compte ami : lecture distante sécurisée.
// Objectif : quand un profil local est associé à un compte ami accepté,
// l'affichage local peut utiliser les stats, l'avatar et l'historique du compte ami
// sans écraser les données locales.
// =============================================================
import { apiGet, apiPost } from "./apiClient";
import { History } from "./history";
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

export function invalidateLinkedProfileProjectionCache() {
  cacheKey = "";
  cacheAt = 0;
  cacheValue = null;
}

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
  const storeHistRows = st?.history?.rows && typeof st.history.rows === "object"
    ? Object.values(st.history.rows)
    : [];
  const byIdRows = (obj: any) => obj && typeof obj === "object" && !Array.isArray(obj) ? Object.values(obj) : [];
  return uniq([
    ...arr(st.history),
    ...arr(st.matches),
    ...arr(st.savedMatches),
    ...arr(st.matchHistory),
    ...arr(st.finishedMatches),
    ...arr(st.inProgressMatches),
    ...byIdRows(st.historyById),
    ...byIdRows(st.matchesById),
    ...arr(payload?.history),
    ...arr(payload?.matches),
    ...arr(payload?.savedMatches),
    ...arr(payload?.matchHistory),
    ...arr(payload?.data?.history),
    ...arr(payload?.data?.matches),
    ...arr(payload?.localProfileHistory),
    ...arr(payload?.localProfileMatches),
    ...arr(payload?.filtered?.history),
    ...arr(payload?.filtered?.matches),
    ...arr(payload?.linkedLocalProfile?.history),
    ...arr(payload?.linkedLocalProfile?.matches),
    ...arr(histDumpRows),
    ...arr(storeHistRows),
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


function getRuntimeActiveLocalProfileId(): string {
  try {
    const st: any = (window as any)?.__appStore?.store || {};
    return s(st?.activeProfileId || st?.active_profile_id || "");
  } catch {
    return "";
  }
}

function profileHasOnlineUserId(profile: any, userId: any): boolean {
  const uid = s(userId);
  if (!uid || !profile || typeof profile !== "object") return false;
  const pi = profile.privateInfo || profile.private_info || {};
  return [
    profile.userId,
    profile.user_id,
    profile.onlineUserId,
    profile.linkedUserId,
    pi.onlineUserId,
    pi.online_user_id,
    pi.userId,
  ].some((v) => s(v) === uid);
}

function findBestLocalProfileForIncomingLink(localById: Map<string, any>, localProfiles: any[], link: any, friendUser: any): any {
  // Pour une association entrante, le profil à alimenter est le COMPTE connecté
  // qui reçoit les stats : link.friendUserId / link.targetUser.id.
  // L'ancienne logique testait d'abord friendUser.id ; or dans /linked-snapshots
  // friendUser représente souvent le propriétaire distant du profil local, donc
  // les stats étaient rattachées au mauvais profil ou à aucun profil exploitable.
  const targetUser = link?.targetUser || link?.friend || link?.linkedAccountProfile || {};
  const directIds = uniq([
    link?.targetLocalProfileId,
    link?.targetProfileId,
    link?.friendUserId,
    link?.friend_user_id,
    targetUser?.profileId,
    targetUser?.profile_id,
    targetUser?.userId,
    targetUser?.id,
  ].map(s));

  for (const id of directIds) {
    const p = localById.get(id);
    if (p) return p;
  }

  for (const uid of directIds) {
    const p = arr(localProfiles).find((profile: any) => profileHasOnlineUserId(profile, uid));
    if (p) return p;
  }

  const activeId = getRuntimeActiveLocalProfileId();
  if (activeId && localById.get(activeId)) return localById.get(activeId);

  const wantedNames = uniq([
    targetUser?.displayName,
    targetUser?.nickname,
    link?.friendDisplayName,
    link?.targetUser?.displayName,
    link?.targetUser?.nickname,
    link?.localProfileName,
    friendUser?.displayName,
    friendUser?.nickname,
  ].map(low));
  const byName = arr(localProfiles).find((p: any) => wantedNames.includes(low(pickName(p))));
  if (byName) return byName;

  return arr(localProfiles)[0] || null;
}

function normalizeIncomingStatsMeta(link: any, friendProfile: any, snapshot?: any): any {
  const meta = firstObj(
    snapshot?.filtered?.stats,
    snapshot?.localProfileStats,
    snapshot?.linkedLocalProfile?.stats,
    snapshot?.statsMeta,
    link?.statsMeta,
    link?.stats_meta,
    link?.metadata?.statsMeta,
    link?.metadata?.stats_meta
  ) || {};
  const mini = firstObj(meta?.miniStats, meta?.mini, meta?.stats, meta) || {};
  return {
    ...meta,
    miniStats: mini,
    stats: firstObj(meta?.stats, mini, friendProfile?.stats) || {},
  };
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

function collectRemoteIdentityValues(friendProfile: any, friendUser: any): string[] {
  const values: any[] = [
    friendProfile?.id,
    friendProfile?.profileId,
    friendProfile?.playerId,
    friendProfile?.localProfileId,
    friendProfile?.userId,
    friendProfile?.user_id,
    friendUser?.id,
    friendUser?.userId,
    friendUser?.profileId,
    friendUser?.profile_id,
  ];
  return uniq(values.map(s));
}

function rewriteMapKeys(obj: any, remoteIds: string[], localId: string): any {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  let changed = false;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = remoteIds.includes(String(k)) ? localId : k;
    if (nk !== k) changed = true;
    out[nk] = v;
  }
  return changed ? out : obj;
}

function rewritePlayersInObject(obj: any, localProfile: any, friendProfile: any, friendUser: any, depth = 0): any {
  if (!obj || typeof obj !== "object") return obj;
  if (depth > 12) return obj;

  const localId = s(localProfile?.id || localProfile?.profileId || localProfile?.playerId || localProfile?.userId);
  if (!localId) return obj;
  const localName = pickName(friendProfile) || pickName(localProfile) || pickName(friendUser) || localId;
  const localAvatar = pickAvatar(friendProfile) || pickAvatar(friendUser) || pickAvatar(localProfile) || null;
  const remoteIds = collectRemoteIdentityValues(friendProfile, friendUser).filter((id) => id && id !== localId);

  const maybeRewritePlayer = (p: any) => {
    if (!p || typeof p !== "object") return p;
    if (!playerMatchesFriend(p, friendProfile, friendUser)) return p;
    return {
      ...p,
      id: localId,
      playerId: localId,
      profileId: localId,
      userId: localProfile?.userId ?? localId,
      linkedRemoteUserId: friendUser?.id || friendUser?.userId || null,
      linkedRemoteProfileId: friendProfile?.id || friendProfile?.profileId || friendProfile?.playerId || null,
      name: localName,
      displayName: localName,
      nickname: localName,
      avatarUrl: localAvatar,
      avatarDataUrl: localAvatar,
      avatar: localAvatar,
    };
  };

  if (Array.isArray(obj)) {
    return obj.map((v) => rewritePlayersInObject(v, localProfile, friendProfile, friendUser, depth + 1));
  }

  let clone: any = { ...obj };

  if (playerMatchesFriend(clone, friendProfile, friendUser)) {
    clone = maybeRewritePlayer(clone);
  }

  // Réécriture des champs scalaires fréquents qui pilotent les stats/wins/turns.
  for (const key of [
    "winnerId", "winnerPlayerId", "winnerProfileId", "playerIdWinner", "winPlayerId",
    "loserId", "activePlayerId", "currentPlayerId", "startingPlayerId", "throwerId",
    "p", "pid", "uid", "profileId", "playerId", "selectedPlayerId"
  ]) {
    if (remoteIds.includes(String(clone[key]))) clone[key] = localId;
  }

  // Ne pas réécrire l'id d'un match arbitraire. On le fait seulement si l'objet
  // ressemble vraiment à une ligne joueur.
  if (playerMatchesFriend(obj, friendProfile, friendUser) && remoteIds.includes(String(clone.id))) {
    clone.id = localId;
  }

  // Réécriture des maps indexées par playerId/profileId : avg3ByPlayer, detailedByPlayer, etc.
  for (const key of [
    "avg3ByPlayer", "avgByPlayer", "scoreByPlayer", "pointsByPlayer", "dartsByPlayer",
    "visitsByPlayer", "detailedByPlayer", "statsByPlayer", "byPlayer", "playersById",
    "legsByPlayer", "setsByPlayer", "checkoutByPlayer", "coByPlayer", "rankByPlayer"
  ]) {
    if (clone[key] && typeof clone[key] === "object" && !Array.isArray(clone[key])) {
      clone[key] = rewriteMapKeys(clone[key], remoteIds, localId);
    }
  }

  // Parcours récursif générique : les historiques X01 stockent les joueurs à plusieurs niveaux
  // selon les versions (payload, payload.payload, summary, result, legs, sets, turns, darts...).
  for (const [key, value] of Object.entries(clone)) {
    if (!value || typeof value !== "object") continue;
    clone[key] = rewritePlayersInObject(value, localProfile, friendProfile, friendUser, depth + 1);
  }

  return clone;
}

function makeVirtualHistoryForLink(snapshot: LinkedProfileSnapshot, localProfile: any): any[] {
  const link = snapshot?.link || {};
  const direction = String(link?.direction || (snapshot as any)?.direction || "").toLowerCase();
  const isIncoming = direction === "incoming" || direction === "incoming-linked-account" || Boolean(link?.incoming === true);
  const friendUser = snapshot?.friendUser || link?.targetUser || {};
  const serverLocalProfile = (snapshot as any)?.linkedLocalProfile || (snapshot as any)?.localProfile || (snapshot as any)?.filtered?.localProfile || null;
  const friendProfile = serverLocalProfile || snapshot?.friendProfile || findFriendProfile(snapshot?.payload, friendUser, link) || friendUser;
  const localId = s(localProfile?.id || link?.localProfileId);
  if (!localId) return [];

  const remoteRows = [
    ...arr((snapshot as any)?.localProfileHistory),
    ...arr((snapshot as any)?.localProfileMatches),
    ...arr((snapshot as any)?.filtered?.history),
    ...arr((snapshot as any)?.filtered?.matches),
    ...arr((snapshot as any)?.linkedLocalProfile?.history),
    ...arr((snapshot as any)?.linkedLocalProfile?.matches),
  ];
  const sourceRows = remoteRows.length ? remoteRows : extractHistory(snapshot?.payload);

  return sourceRows.map((row: any, idx: number) => {
    const cloned = rewritePlayersInObject(row, { ...localProfile, id: localId }, friendProfile, friendUser);
    const id = s(cloned?.id || cloned?.matchId || cloned?.resumeId || idx);
    return {
      ...cloned,
      id: `linked:${link?.id || localId}:${id}`,
      originalId: id,
      linkedRemote: true,
      linkedRemoteUserId: friendUser?.id || friendUser?.userId || null,
      linkedRemoteProfileId: friendProfile?.id || friendProfile?.profileId || friendProfile?.playerId || null,
      linkedLocalProfileId: localId,
      linkedSourceLocalProfileId: link?.localProfileId || link?.local_profile_id || null,
      linkedProfileName: pickName(friendProfile) || pickName(localProfile),
      linkedProfileDirection: isIncoming ? "incoming" : "outgoing",
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
    const direction = String(link?.direction || (snap as any)?.direction || "").toLowerCase();
    const friendUser = snap?.friendUser || link?.targetUser || link?.friendUser || {};
    const serverLocalProfile = (snap as any)?.linkedLocalProfile || (snap as any)?.localProfile || (snap as any)?.filtered?.localProfile || null;
    const friendProfile = serverLocalProfile || snap?.friendProfile || findFriendProfile(snap?.payload, friendUser, link) || {};
    const isIncoming = direction === "incoming" || direction === "incoming-linked-account" || Boolean(link?.incoming === true);

    const rawLocalId = s(link?.localProfileId || link?.local_profile_id);
    const incomingLocal = isIncoming ? findBestLocalProfileForIncomingLink(localById, localProfiles, link, friendUser) : null;
    const localId = isIncoming
      ? s(incomingLocal?.id || incomingLocal?.profileId || incomingLocal?.playerId || getRuntimeActiveLocalProfileId() || rawLocalId)
      : rawLocalId;
    const local = (localId && localById.get(localId)) || incomingLocal || { id: localId, name: link?.localProfileName || "Profil lié" };
    if (!localId) continue;

    const statsMeta = normalizeIncomingStatsMeta(link, friendProfile, snap);
    const sourceName = isIncoming
      ? (link?.localProfileName || pickName(friendProfile) || pickName(friendUser) || pickName(local))
      : (pickName(friendProfile) || pickName(friendUser) || pickName(local));
    const name = sourceName || localId;
    const avatar = link?.localProfileAvatarUrl || link?.local_profile_avatar_url || pickAvatar(serverLocalProfile) || pickAvatar(friendProfile) || pickAvatar(friendUser) || link?.friendAvatarUrl || pickAvatar(local);

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
      linkedProfileDirection: isIncoming ? "incoming" : "outgoing",
      linkedSourceLocalProfileId: rawLocalId || null,
      linkedProfileUpdatedAt: snap?.updatedAt || link?.updatedAt || null,
      stats: statsMeta?.stats || statsMeta?.miniStats || friendProfile?.stats || local?.stats || {},
      statsMeta,
    };

    profiles.push(projected);
    byLocalProfileId[localId] = { link, friendUser, friendProfile, profile: projected, snapshot: snap };
    history.push(...makeVirtualHistoryForLink(snap, projected));
  }

  return { profiles, history, normalizedHint: [], byLocalProfileId, snapshots };
}

const materializedLinkedHistorySignatures = new Map<string, string>();

function isIncomingLinkedHistoryRow(row: any): boolean {
  return Boolean(row?.__linkedRemote || row?.linkedRemote) && String(row?.linkedProfileDirection || "").toLowerCase() === "incoming";
}

export async function materializeLinkedProfileProjection(projection: LinkedProfileProjection): Promise<number> {
  try {
    const rows = Array.isArray(projection?.history) ? projection.history.filter(isIncomingLinkedHistoryRow) : [];
    if (!rows.length) return 0;
    let written = 0;
    for (const row of rows) {
      const id = s(row?.id || row?.matchId || row?.resumeId);
      if (!id) continue;
      const signature = JSON.stringify({
        updatedAt: row?.updatedAt || row?.createdAt || row?.date || null,
        players: Array.isArray(row?.players) ? row.players.map((p: any) => [p?.id, p?.playerId, p?.profileId, p?.name]) : [],
        winnerId: row?.winnerId || row?.summary?.winnerId || row?.payload?.winnerId || null,
      });
      if (materializedLinkedHistorySignatures.get(id) === signature) continue;
      materializedLinkedHistorySignatures.set(id, signature);
      await History.upsert({
        ...(row as any),
        id,
        matchId: id,
        status: String(row?.status || "finished").toLowerCase().includes("progress") ? "finished" : (row?.status || "finished"),
        linkedRemote: true,
        __linkedRemote: true,
      } as any).catch(() => undefined);
      written += 1;
    }
    if (written > 0 && typeof window !== "undefined") {
      try { window.dispatchEvent(new Event("dc-history-updated")); } catch {}
      try { window.dispatchEvent(new Event("dc-stats-index-updated")); } catch {}
      try { window.dispatchEvent(new CustomEvent("dc-linked-history-materialized", { detail: { written } })); } catch {}
    }
    return written;
  } catch {
    return 0;
  }
}

export async function loadLinkedProfileProjection(localProfiles: any[] = []): Promise<LinkedProfileProjection> {
  const ids = arr(localProfiles).map((p: any) => s(p?.id || p?.profileId || p?.playerId)).filter(Boolean).sort();
  const nextKey = ids.join("|");
  const now = Date.now();
  if (cacheValue && cacheKey === nextKey && now - cacheAt < CACHE_TTL_MS) return cacheValue;

  try {
    let snapshots: LinkedProfileSnapshot[] = [];
    try {
      const res = await apiPost("/online/profile-links/linked-snapshots", { localProfileIds: ids });
      snapshots = Array.isArray(res?.snapshots) ? res.snapshots : [];
    } catch {
      const res = await apiGet("/online/profile-links");
      const links = Array.isArray(res?.links) ? res.links : [];
      snapshots = links
        .filter((link: any) => String(link?.status || "").toLowerCase() === "accepted")
        .map((link: any) => ({
          link,
          friendUser: link?.direction === "incoming" ? (link?.requesterUser || link?.ownerUser || {}) : (link?.targetUser || {}),
          friendProfile: link?.friendProfile || null,
          payload: null,
          updatedAt: link?.updatedAt || link?.acceptedAt || link?.createdAt || null,
        }));
    }
    const projected = projectLinkedSnapshots(localProfiles, snapshots);
    cacheKey = nextKey;
    cacheAt = now;
    cacheValue = projected;
    try {
      localStorage.setItem("dc_linked_profile_projection_v1", JSON.stringify({ at: Date.now(), projection: projected }));
      window.dispatchEvent(new CustomEvent("dc-linked-profile-projection-updated", { detail: projected }));
    } catch {}
    // Matérialise les parties distantes entrantes dans History/IndexedDB avec les ids du compte local.
    // C'est la partie manquante de la fusion : les pages détaillées (X01 multi, historique, comparateurs)
    // lisent History, pas seulement la projection mémoire/Home.
    void materializeLinkedProfileProjection(projected);
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
