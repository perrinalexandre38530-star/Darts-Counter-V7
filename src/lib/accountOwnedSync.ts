// ============================================================
// src/lib/accountOwnedSync.ts
// Synchro privée multi-appareils des données appartenant au compte.
//
// Principe :
// - auth.uid() est le propriétaire canonique.
// - Supabase ne reçoit que les métadonnées JSON privées (RLS owner-only).
// - Les images lourdes restent dans le coffre média IndexedDB/R2 existant.
// - History est la source de vérité des stats ; l'index stats reste un cache.
// - Les changements locaux sont poussés en Realtime, avec refresh focus/online
//   et polling de secours comme pour le profil du compte.
// ============================================================

import { supabase, isSupabaseRestCircuitOpen, isSupabaseTransientUnavailableError, supabaseRestRetryAfterMs } from "./supabaseClient";
import { History, ACCOUNT_HISTORY_LOCAL_CHANGE_EVENT, type SavedMatch } from "./history";
import { loadBots, restoreBotsFromSnapshot } from "./bots";
import { isOfficialBotId } from "./officialBots";
import { loadTeams, saveTeams, type TeamEntity } from "./petanqueTeamsStore";
import { getAllDartSets, setAllDartSets, type DartSet } from "./dartSetsStore";
import { AVATAR_GALLERY_EVENT, readAvatarGallery, writeAvatarGallery, type AvatarGalleryItem } from "./avatarGallery";
import {
  loadStatsIndex,
  saveStatsIndex,
  scheduleStatsIndexRefresh,
  type StatsIndex,
} from "./stats/rebuildStatsFromHistory";
import {
  ORGANIZATION_WORKSPACE_EVENT,
  loadOrganizationWorkspace,
  saveOrganizationWorkspace,
  type OrganizationWorkspace,
} from "../organizations/organizationWorkspace";
import {
  ACCOUNT_MEDIA_SYNCED_EVENT,
  botAvatarMediaKey,
  captureStoreUserMedia,
  mirrorAllLocalUserMediaToAccountR2,
  dartSetMainMediaKey,
  dartSetThumbMediaKey,
  galleryItemMediaKey,
  profileAvatarMediaKey,
  resolveUserMediaFallback,
  teamCoverMediaKey,
  teamLogoMediaKey,
} from "./userMediaFallback";
import { ACCOUNT_LOCAL_STORAGE_MUTATION_EVENT } from "./storage";
import { accountScopedLocalStorageKey } from "./accountScope";

export const ACCOUNT_OWNED_STORE_MUTATED_EVENT = "dc:account-owned-store-mutated";
export const ACCOUNT_OWNED_SYNC_STATUS_EVENT = "dc:account-owned-sync-status";
export const ACCOUNT_OWNED_FORCE_SYNC_EVENT = "dc:account-owned-force-sync";

const TABLE = "account_sync_documents";
const DEFAULT_DOCUMENT_ID = "default";
const POLL_MS = 120_000;
const LOCAL_DEBOUNCE_MS = 420;
const HISTORY_BATCH_SIZE = 10;
const REVISION_KEY = "mss_account_owned_sync_revisions_v1";
const STATS_SOURCE_OWNER_KEY = "mss_account_stats_sources_owner_v1";
const STATS_SOURCE_MIRROR_KEY = "mss_account_stats_sources_mirror_v1";

const DOC = {
  profiles: "local_profiles",
  bots: "bots",
  teams: "teams",
  gallery: "avatar_gallery",
  dartSets: "dart_sets",
  statsIndex: "stats_index",
  statsSources: "stats_sources",
  organizationWorkspace: "organization_workspace",
  historyMatch: "history_match",
} as const;

type DocumentType = (typeof DOC)[keyof typeof DOC];

type SyncRow = {
  owner_user_id: string;
  document_type: DocumentType | string;
  document_id: string;
  payload: any;
  client_updated_at: number;
  deleted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type StartOptions = {
  userId: string;
  getProfiles: () => any[];
  applyLocalProfiles: (profiles: any[]) => void | Promise<void>;
};

type RevisionMap = Record<string, number>;

type Cleanup = () => void;

const STATS_SOURCE_EXACT_KEYS = new Set([
  "dc_training_hits_v1",
  "dc_training_sessions_v1",
  "dc_training_x01_full_v1",
  "dc_training_x01_stats_v1",
  "dc_training_clock_stats_v1",
  "dc_training_clock_sessions_v1",
  "dc_training_stats_v2",
  "dc_training_stats_v1",
  "dc_training_sessions_v3",
  "dc_training_group_sessions_v4",
  "dc_darts_firefighter_history_v1",
  "dc-petanque-history-v1",
  "dc_territories_history_v1",
  "dc_molkky_history_v2",
  "dc_molkky_history_v1",
  "dc_molkky_history_v1_migrated_to_v2",
  "pingpong_history",
  "babyfoot_league_store_v1",
  "dc-player-stats-v1",
  "dc-quick-stats",
  "dc5_stats_committed_leg_ids_v1",
  "dc_online_stats_excluded_ids_v1",
  "dc_online_stats_deleted_ids_v1",
]);
const STATS_SOURCE_PREFIXES = [
  "dc_stats_cricket_profile_v2:",
  "dc_stats_x01_legs_sets_v2:",
] as const;

function emitStatus(detail: any) {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ACCOUNT_OWNED_SYNC_STATUS_EVENT, { detail }));
    }
  } catch {}
}

function cleanId(v: unknown): string {
  return String(v ?? "").trim();
}

function toTimestamp(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
    const d = Date.parse(v);
    if (Number.isFinite(d)) return d;
  }
  return 0;
}

function itemTimestamp(item: any): number {
  return Math.max(
    toTimestamp(item?.updatedAt),
    toTimestamp(item?.updated_at),
    toTimestamp(item?.avatarUpdatedAt),
    toTimestamp(item?.createdAt),
    toTimestamp(item?.created_at),
  );
}

function isInlineImage(value: any): boolean {
  return typeof value === "string" && /^data:image\//i.test(value.trim());
}

function isSensitiveKey(key: string): boolean {
  const k = String(key || "").toLowerCase();
  return /(^|_)(password|passwd|secret|access_token|refresh_token|authorization|pkce|code_verifier)($|_)/.test(k);
}

function cloudSafe(value: any, depth = 0, seen?: WeakSet<object>): any {
  if (depth > 28) return null;
  if (value == null) return value;
  if (typeof value === "string") return isInlineImage(value) ? null : value;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "function" || typeof value === "symbol" || typeof value === "undefined") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof Blob !== "undefined" && value instanceof Blob) return null;

  const refs = seen || new WeakSet<object>();
  if (typeof value === "object") {
    if (refs.has(value)) return null;
    refs.add(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => cloudSafe(entry, depth + 1, refs));
  }

  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, raw] of Object.entries(value)) {
      if (isSensitiveKey(key)) continue;
      const cleaned = cloudSafe(raw, depth + 1, refs);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return null;
}

function stableStringify(value: any): string {
  const sort = (v: any): any => {
    if (Array.isArray(v)) return v.map(sort);
    if (!v || typeof v !== "object") return v;
    const out: Record<string, any> = {};
    for (const key of Object.keys(v).sort()) out[key] = sort(v[key]);
    return out;
  };
  try { return JSON.stringify(sort(value)); } catch { return ""; }
}

function fingerprint(value: any): string {
  const s = stableStringify(value);
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${s.length}:${(h >>> 0).toString(16)}`;
}

function revisionStorageKey(userId: string): string {
  return accountScopedLocalStorageKey(REVISION_KEY, userId);
}

function readRevisions(userId: string): RevisionMap {
  try {
    const raw = localStorage.getItem(revisionStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeRevisions(userId: string, value: RevisionMap): void {
  try { localStorage.setItem(revisionStorageKey(userId), JSON.stringify(value)); } catch {}
}

function revisionKey(type: string, id = DEFAULT_DOCUMENT_ID): string {
  return `${type}:${id}`;
}

function isCanonicalAccountProfile(profile: any, userId: string): boolean {
  const uid = cleanId(userId);
  if (!uid || !profile) return false;
  const pi = profile?.privateInfo || {};
  const ids = [
    profile?.id,
    profile?.onlineUserId,
    profile?.online_user_id,
    profile?.accountUserId,
    profile?.account_user_id,
    profile?.supabaseUserId,
    profile?.userId,
    profile?.user_id,
    pi?.onlineUserId,
    pi?.online_user_id,
    pi?.accountUserId,
    pi?.account_user_id,
    pi?.supabaseUserId,
    pi?.userId,
    pi?.user_id,
  ].map(cleanId).filter(Boolean);
  return ids.includes(uid);
}

export function getAccountOwnedLocalProfiles(input: any[], userId: string): any[] {
  return (Array.isArray(input) ? input : [])
    .filter((profile) => profile && !isCanonicalAccountProfile(profile, userId))
    .filter((profile) => !!cleanId(profile?.id));
}

function collectionPayloadItems(payload: any): any[] | null {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.items)) return payload.items;
  return null;
}

function normalizeSyncRow(value: any, expectedUserId: string): SyncRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const owner = cleanId(value.owner_user_id);
  const documentType = cleanId(value.document_type);
  const documentId = cleanId(value.document_id || DEFAULT_DOCUMENT_ID) || DEFAULT_DOCUMENT_ID;
  if (!owner || owner != cleanId(expectedUserId) || !documentType || !documentId) return null;
  return {
    ...value,
    owner_user_id: owner,
    document_type: documentType,
    document_id: documentId,
    payload: value.payload ?? {},
    client_updated_at: Number(value.client_updated_at || 0) || 0,
  } as SyncRow;
}

function serializeProfiles(input: any[], userId: string): any[] {
  return getAccountOwnedLocalProfiles(input, userId)
    .map((profile) => {
      const primary = cleanId(profile?.avatarDataUrl || profile?.avatar || profile?.avatarUrl);
      const row = cloudSafe(profile) || {};
      row.id = cleanId(profile?.id);
      row.__syncAvatarMedia = !!(row.id && isInlineImage(primary));
      if (isInlineImage(row.avatarDataUrl)) row.avatarDataUrl = null;
      return row;
    })
    .filter((profile) => cleanId(profile?.id));
}

function serializeBots(): any[] {
  return loadBots()
    .filter((bot: any) => bot && !isOfficialBotId(bot.id) && !bot?.systemBot)
    .map((bot: any) => {
      const primary = cleanId(bot?.avatarDataUrl || bot?.avatar || bot?.avatarUrl);
      const row = cloudSafe(bot) || {};
      row.__syncAvatarMedia = !!(row.id && isInlineImage(primary));
      row.avatarDataUrl = null;
      row.avatar = null;
      return row;
    });
}

function serializeTeams(): any[] {
  return loadTeams().map((team: any) => {
    const logo = cleanId(team?.logoDataUrl || team?.logoUrl || team?.avatarUrl || team?.imageUrl);
    const cover = cleanId(team?.coverDataUrl || team?.coverUrl);
    const row = cloudSafe(team) || {};
    row.__syncLogoMedia = !!(row.id && isInlineImage(logo));
    row.__syncCoverMedia = !!(row.id && isInlineImage(cover));
    row.logoDataUrl = null;
    row.coverDataUrl = null;
    row.regionLogoDataUrl = null;
    return row;
  });
}

function serializeGallery(userId: string): any[] {
  return readAvatarGallery(userId).map((item: any) => {
    const src = cleanId(item?.src);
    const row = cloudSafe(item) || {};
    row.__syncMedia = !!(row.id && isInlineImage(src));
    if (isInlineImage(src)) row.src = null;
    return row;
  });
}

function serializeDartSets(): any[] {
  return getAllDartSets()
    .map((set: any) => {
      const id = cleanId(set?.id);
      if (!id) return null;
      const main = cleanId(
        set?.photoDataUrl || set?.imageDataUrl || set?.mainImageDataUrl ||
        set?.dartSetImageDataUrl || set?.mainImageUrl || set?.photoUrl || set?.imageUrl
      );
      const thumb = cleanId(
        set?.photoThumbDataUrl || set?.thumbDataUrl || set?.thumbImageDataUrl ||
        set?.thumbImageUrl || set?.photoThumbUrl
      );
      const row = cloudSafe(set) || {};
      row.id = id;
      row.__syncMainMedia = !!(set?.kind === "photo" || isInlineImage(main));
      row.__syncThumbMedia = !!(set?.kind === "photo" || isInlineImage(thumb) || row.__syncMainMedia);
      row.photoDataUrl = null;
      row.imageDataUrl = null;
      row.mainImageDataUrl = null;
      row.dartSetImageDataUrl = null;
      row.photoThumbDataUrl = null;
      row.thumbDataUrl = null;
      row.thumbImageDataUrl = null;
      return row;
    })
    .filter(Boolean);
}

function mergeById(localInput: any[], remoteInput: any[]): any[] {
  const local = Array.isArray(localInput) ? localInput : [];
  const remote = Array.isArray(remoteInput) ? remoteInput : [];
  const map = new Map<string, any>();
  for (const item of local) {
    const id = cleanId(item?.id);
    if (id) map.set(id, item);
  }
  for (const item of remote) {
    const id = cleanId(item?.id);
    if (!id) continue;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, item);
      continue;
    }
    const localTs = itemTimestamp(prev);
    const remoteTs = itemTimestamp(item);
    // Realtime/serveur gagne les égalités et les objets sans timestamp.
    map.set(id, remoteTs >= localTs ? { ...prev, ...item } : { ...item, ...prev });
  }
  return Array.from(map.values());
}

async function mapWithConcurrency<T, R>(input: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(input.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, input.length || 1)) }, async () => {
    while (cursor < input.length) {
      const index = cursor++;
      out[index] = await fn(input[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function hydrateProfiles(input: any[]): Promise<any[]> {
  return mapWithConcurrency(Array.isArray(input) ? input : [], 4, async (raw: any) => {
    const row = { ...(raw || {}) };
    const id = cleanId(row.id);
    if (id && row.__syncAvatarMedia) {
      const primary = cleanId(row.avatarUrl || row.avatar);
      const recovered = await resolveUserMediaFallback(profileAvatarMediaKey(id), primary, { kind: "profile_avatar", allowR2: true }).catch(() => "");
      if (recovered) {
        row.avatarDataUrl = recovered.startsWith("data:image/") ? recovered : null;
        row.avatarUrl = recovered.startsWith("data:image/") ? row.avatarUrl || null : recovered;
      }
    }
    delete row.__syncAvatarMedia;
    return row;
  });
}

async function hydrateBots(input: any[]): Promise<any[]> {
  return mapWithConcurrency(Array.isArray(input) ? input : [], 4, async (raw: any) => {
    const row = { ...(raw || {}) };
    const id = cleanId(row.id);
    if (id && row.__syncAvatarMedia) {
      const primary = cleanId(row.avatarUrl);
      const recovered = await resolveUserMediaFallback(botAvatarMediaKey(id), primary, { kind: "bot_avatar", allowR2: true }).catch(() => "");
      if (recovered) {
        row.avatarDataUrl = recovered.startsWith("data:image/") ? recovered : null;
        row.avatarUrl = recovered.startsWith("data:image/") ? row.avatarUrl || null : recovered;
        row.avatar = recovered;
      }
    }
    delete row.__syncAvatarMedia;
    return row;
  });
}

async function hydrateTeams(input: any[]): Promise<any[]> {
  return mapWithConcurrency(Array.isArray(input) ? input : [], 3, async (raw: any) => {
    const row = { ...(raw || {}) };
    const id = cleanId(row.id);
    if (id && row.__syncLogoMedia) {
      const primary = cleanId(row.logoUrl || row.avatarUrl || row.imageUrl);
      const recovered = await resolveUserMediaFallback(teamLogoMediaKey(id), primary, { kind: "team_logo", allowR2: true }).catch(() => "");
      if (recovered) row.logoDataUrl = recovered;
    }
    if (id && row.__syncCoverMedia) {
      const primary = cleanId(row.coverUrl);
      const recovered = await resolveUserMediaFallback(teamCoverMediaKey(id), primary, { kind: "team_cover", allowR2: true }).catch(() => "");
      if (recovered) row.coverDataUrl = recovered;
    }
    delete row.__syncLogoMedia;
    delete row.__syncCoverMedia;
    return row;
  });
}

async function hydrateGallery(input: any[]): Promise<AvatarGalleryItem[]> {
  const rows = await mapWithConcurrency(Array.isArray(input) ? input : [], 4, async (raw: any) => {
    const row = { ...(raw || {}) };
    const id = cleanId(row.id);
    if (id && (!cleanId(row.src) || row.__syncMedia)) {
      const recovered = await resolveUserMediaFallback(galleryItemMediaKey(id), cleanId(row.src), { kind: "gallery_item", allowR2: true }).catch(() => "");
      if (recovered) row.src = recovered;
    }
    delete row.__syncMedia;
    return row;
  });
  return rows.filter((row: any) => cleanId(row?.id) && cleanId(row?.src)) as AvatarGalleryItem[];
}

async function hydrateDartSets(input: any[]): Promise<DartSet[]> {
  const rows = await mapWithConcurrency(Array.isArray(input) ? input : [], 3, async (raw: any) => {
    const row = { ...(raw || {}) };
    const id = cleanId(row.id);
    if (!id) return row as DartSet;

    if (row.__syncMainMedia) {
      const primary = cleanId(row.mainImageUrl || row.photoUrl || row.imageUrl);
      const recovered = await resolveUserMediaFallback(dartSetMainMediaKey(id), primary, { kind: "dartset_main", allowR2: true }).catch(() => "");
      if (recovered) {
        row.photoDataUrl = recovered;
        row.mainImageUrl = recovered;
      }
    }
    if (row.__syncThumbMedia) {
      const primary = cleanId(row.thumbImageUrl || row.photoThumbUrl);
      const recovered = await resolveUserMediaFallback(dartSetThumbMediaKey(id), primary, { kind: "dartset_thumb", allowR2: true }).catch(() => "");
      if (recovered) {
        row.photoThumbDataUrl = recovered;
        row.thumbImageUrl = recovered;
      }
    }
    delete row.__syncMainMedia;
    delete row.__syncThumbMedia;
    return row as DartSet;
  });
  return rows.filter((row: any) => cleanId(row?.id));
}

function isAccountSyncFinishedMatch(record: any): boolean {
  const status = String(record?.status || "").trim().toLowerCase();
  if (status === "in_progress" || status === "in-progress" || status === "running" || status === "active") return false;
  if (["finished", "done", "ended", "match_end", "completed", "complete"].includes(status)) return true;
  if (record?.winnerId || record?.winner?.id || record?.summary?.winnerId || record?.summary?.finished === true) return true;
  // Une grande partie de l'historique legacy n'avait pas le littéral
  // `finished` (champ vide ou ancien statut). Ces lignes vivent déjà dans
  // History, pas dans le store de reprise : sauf statut explicitement actif,
  // elles sont donc terminées afin de préserver toutes les Stats multi-appareils.
  return status !== "in_progress";
}

function historyUpdatedAt(record: any): number {
  const ts = Math.max(
    toTimestamp(record?.updatedAt),
    toTimestamp(record?.finishedAt),
    toTimestamp(record?.createdAt),
  );
  return ts || Date.now();
}

function serializeHistory(record: SavedMatch): any {
  const clean = cloudSafe(record) || {};
  // Les pixels ne sont jamais nécessaires pour recalculer les stats.
  const stripPlayerPixels = (players: any) => {
    if (!Array.isArray(players)) return;
    for (const player of players) {
      if (!player || typeof player !== "object") continue;
      if (isInlineImage(player.avatarDataUrl)) player.avatarDataUrl = null;
      if (isInlineImage(player.avatar)) player.avatar = null;
    }
  };
  stripPlayerPixels(clean.players);
  stripPlayerPixels(clean?.payload?.players);
  stripPlayerPixels(clean?.payload?.state?.players);
  return clean;
}

function isStatsSourceKey(key: string): boolean {
  const k = String(key || "");
  return STATS_SOURCE_EXACT_KEYS.has(k) || STATS_SOURCE_PREFIXES.some((prefix) => k.startsWith(prefix));
}

function listStatsSourceKeys(): string[] {
  if (typeof localStorage === "undefined") return [];
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      if (isStatsSourceKey(key)) out.push(key);
    }
  } catch {}
  return Array.from(new Set(out)).sort();
}

function readStatsSources(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of listStatsSourceKeys()) {
    try {
      const value = localStorage.getItem(key);
      if (value != null) out[key] = value;
    } catch {}
  }
  return out;
}

function statsMirrorKey(userId: string): string {
  return accountScopedLocalStorageKey(STATS_SOURCE_MIRROR_KEY, userId);
}

function readStatsMirror(userId: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(statsMirrorKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStatsMirror(userId: string, values: Record<string, string>): void {
  try { localStorage.setItem(statsMirrorKey(userId), JSON.stringify(values || {})); } catch {}
}

function applyStatsSourceValues(valuesInput: Record<string, string>, removeMissing = true): void {
  const values = valuesInput && typeof valuesInput === "object" ? valuesInput : {};
  if (removeMissing) {
    for (const key of listStatsSourceKeys()) {
      if (!(key in values)) {
        try { localStorage.removeItem(key); } catch {}
      }
    }
  }
  for (const [key, value] of Object.entries(values)) {
    if (!isStatsSourceKey(key) || typeof value !== "string") continue;
    try { localStorage.setItem(key, value); } catch {}
  }
  try { window.dispatchEvent(new Event("dc-history-updated")); } catch {}
  try { window.dispatchEvent(new Event("dc-training-history-updated")); } catch {}
  try { window.dispatchEvent(new Event("storage")); } catch {}
}

function activateStatsSourceNamespace(userId: string): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  const uid = cleanId(userId);
  if (!uid) return {};
  let owner = "";
  try { owner = cleanId(localStorage.getItem(STATS_SOURCE_OWNER_KEY)); } catch {}

  if (!owner) {
    const current = readStatsSources();
    writeStatsMirror(uid, current);
    try { localStorage.setItem(STATS_SOURCE_OWNER_KEY, uid); } catch {}
    return current;
  }

  if (owner !== uid) {
    // Avant de changer de compte, préserver les anciennes sources brutes dans
    // leur miroir privé. Ensuite seulement charger celles du nouveau UID.
    writeStatsMirror(owner, readStatsSources());
    const next = readStatsMirror(uid) || {};
    applyStatsSourceValues(next, true);
    try { localStorage.setItem(STATS_SOURCE_OWNER_KEY, uid); } catch {}
    return next;
  }

  const current = readStatsSources();
  writeStatsMirror(uid, current);
  return current;
}

function sanitizeStatsSources(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  let total = 0;
  for (const [key, value] of Object.entries(values || {})) {
    if (!isStatsSourceKey(key) || typeof value !== "string") continue;
    // Garde-fou : un document Supabase ne doit pas devenir un dump média géant.
    if (value.length > 1_500_000) continue;
    if (total + value.length > 4_000_000) break;
    out[key] = value;
    total += value.length;
  }
  return out;
}

export function prepareAccountOwnedLocalNamespaces(userId: string): void {
  const uid = cleanId(userId);
  if (!uid || typeof window === "undefined") return;
  activateStatsSourceNamespace(uid);
}

export function startAccountOwnedDataSync(options: StartOptions): Cleanup {
  const userId = cleanId(options?.userId);
  if (!userId || typeof window === "undefined") return () => {};

  let stopped = false;
  let remoteApplyDepth = 0;
  let tableUnavailable = false;
  let remotePausedUntil = 0;
  let lastTransientNoticeAt = 0;
  let pollTimer: number | null = null;

  const remotePaused = () => Date.now() < remotePausedUntil || isSupabaseRestCircuitOpen();
  const pauseRemote = (error: any, action: string) => {
    const retryMs = Math.max(20_000, supabaseRestRetryAfterMs() || 0);
    remotePausedUntil = Math.max(remotePausedUntil, Date.now() + retryMs);
    emitStatus({ state: "cloud-paused", action, retryAt: remotePausedUntil, error: String(error?.message || error || "Supabase indisponible") });
    if (Date.now() - lastTransientNoticeAt > 30_000) {
      lastTransientNoticeAt = Date.now();
      console.warn(`[account-sync] Supabase indisponible : synchro suspendue ${Math.ceil(retryMs / 1000)}s`, { action, code: error?.code || null });
    }
  };
  let channel: any = null;
  let statsNamespaceReady = false;
  const localTimers = new Map<string, number>();
  const revisions = readRevisions(userId);
  const signatures = new Map<string, string>();
  // Empêche de retraiter en Realtime nos propres écritures. Sans ce garde, un
  // upsert local peut être reçu par le websocket avant que la Promise Supabase
  // ne rende la main, ce qui déclenchait parfois une réapplication concurrente
  // du Store (et les erreurs `reading length` vues pendant le diagnostic).
  const pendingOutbound = new Map<string, number>();
  const outboundKey = (type: string, id = DEFAULT_DOCUMENT_ID) => revisionKey(type, id);
  const markOutbound = (type: string, id: string, ts: number) => {
    const key = outboundKey(type, id);
    const value = Number(ts || 0);
    pendingOutbound.set(key, value);
    window.setTimeout(() => {
      if (pendingOutbound.get(key) === value) pendingOutbound.delete(key);
    }, 30_000);
  };
  const clearOutbound = (type: string, id: string, ts?: number) => {
    const key = outboundKey(type, id);
    if (ts == null || pendingOutbound.get(key) === Number(ts || 0)) pendingOutbound.delete(key);
  };
  const isOwnRealtimeEcho = (row: SyncRow): boolean => {
    const type = String(row?.document_type || "");
    const id = cleanId(row?.document_id || DEFAULT_DOCUMENT_ID) || DEFAULT_DOCUMENT_ID;
    const ts = Number(row?.client_updated_at || 0) || 0;
    return !!type && !!ts && pendingOutbound.get(outboundKey(type, id)) === ts;
  };

  const persistRevisions = () => writeRevisions(userId, revisions);
  const getRevision = (type: string, id = DEFAULT_DOCUMENT_ID) => Number(revisions[revisionKey(type, id)] || 0) || 0;
  const setRevision = (type: string, id: string, ts: number) => {
    revisions[revisionKey(type, id)] = Math.max(getRevision(type, id), Number(ts || 0) || 0);
    persistRevisions();
  };

  const runRemoteApply = async <T>(fn: () => Promise<T> | T): Promise<T> => {
    remoteApplyDepth += 1;
    try { return await fn(); }
    finally { remoteApplyDepth = Math.max(0, remoteApplyDepth - 1); }
  };

  const noteSupabaseError = (error: any, action: string) => {
    const code = String(error?.code || "");
    const msg = String(error?.message || error || "");
    if (code === "42P01" || /account_sync_documents.*does not exist|relation .*account_sync_documents/i.test(msg)) {
      tableUnavailable = true;
      emitStatus({ state: "migration-required", action, error: msg });
      return;
    }
    if (isSupabaseTransientUnavailableError(error)) {
      pauseRemote(error, action);
      return;
    }
    console.warn(`[account-sync] ${action} failed`, error);
    emitStatus({ state: "error", action, error: msg });
  };

  const fetchDocument = async (type: DocumentType, id = DEFAULT_DOCUMENT_ID): Promise<SyncRow | null> => {
    if (stopped || tableUnavailable || remotePaused()) return null;
    const { data, error } = await supabase
      .from(TABLE)
      .select("owner_user_id,document_type,document_id,payload,client_updated_at,deleted_at,created_at,updated_at")
      .eq("owner_user_id", userId)
      .eq("document_type", type)
      .eq("document_id", id)
      .maybeSingle();
    if (error) {
      noteSupabaseError(error, `fetch:${type}`);
      return null;
    }
    return (data as SyncRow | null) || null;
  };

  const pushDocument = async (type: DocumentType, payload: any, id = DEFAULT_DOCUMENT_ID, explicitTs?: number): Promise<boolean> => {
    if (stopped || tableUnavailable || remotePaused() || remoteApplyDepth > 0) return false;
    const ts = Math.max(Date.now(), Number(explicitTs || 0) || 0);
    const safePayload = cloudSafe(payload);
    const row = {
      owner_user_id: userId,
      document_type: type,
      document_id: id,
      payload: safePayload ?? {},
      client_updated_at: ts,
      deleted_at: null,
    };
    markOutbound(type, id, ts);
    const { error } = await supabase.from(TABLE).upsert(row as any, { onConflict: "owner_user_id,document_type,document_id" });
    if (error) {
      clearOutbound(type, id, ts);
      noteSupabaseError(error, `push:${type}`);
      return false;
    }
    setRevision(type, id, ts);
    signatures.set(revisionKey(type, id), fingerprint(safePayload));
    emitStatus({ state: "synced", direction: "up", type, id, at: ts });
    return true;
  };

  const softDeleteHistory = async (id: string, explicitTs?: number): Promise<boolean> => {
    if (stopped || tableUnavailable || remotePaused() || remoteApplyDepth > 0) return false;
    const matchId = cleanId(id);
    if (!matchId) return false;
    const ts = Math.max(Date.now(), Number(explicitTs || 0) || 0);
    const row = {
      owner_user_id: userId,
      document_type: DOC.historyMatch,
      document_id: matchId,
      payload: {},
      client_updated_at: ts,
      deleted_at: new Date(ts).toISOString(),
    };
    markOutbound(DOC.historyMatch, matchId, ts);
    const { error } = await supabase.from(TABLE).upsert(row as any, { onConflict: "owner_user_id,document_type,document_id" });
    if (error) {
      clearOutbound(DOC.historyMatch, matchId, ts);
      noteSupabaseError(error, "history-delete");
      return false;
    }
    setRevision(DOC.historyMatch, matchId, ts);
    return true;
  };

  const applyProfilesPayload = async (payload: any) => {
    const rows = collectionPayloadItems(payload);
    if (!rows) return;
    const hydrated = await hydrateProfiles(rows);
    await options.applyLocalProfiles(hydrated);
  };

  const applyBotsPayload = async (payload: any) => {
    const rows = collectionPayloadItems(payload);
    if (!rows) return;
    const hydrated = await hydrateBots(rows);
    restoreBotsFromSnapshot(hydrated);
  };

  const applyTeamsPayload = async (payload: any) => {
    const rows = collectionPayloadItems(payload);
    if (!rows) return;
    const hydrated = await hydrateTeams(rows);
    saveTeams(hydrated as TeamEntity[]);
  };

  const applyGalleryPayload = async (payload: any) => {
    const rows = collectionPayloadItems(payload);
    if (!rows) return;
    const hydrated = await hydrateGallery(rows);
    writeAvatarGallery(userId, hydrated);
  };

  const applyDartSetsPayload = async (payload: any) => {
    const rows = collectionPayloadItems(payload);
    if (!rows) return;
    const hydrated = await hydrateDartSets(rows);
    setAllDartSets(hydrated);
  };

  const applyStatsIndexPayload = async (payload: any) => {
    const idx = payload && typeof payload === "object" ? payload as StatsIndex : null;
    if (idx && Number((idx as any)?.version || 0) > 0) {
      await saveStatsIndex(idx);
      try {
        window.dispatchEvent(new CustomEvent("dc-stats-index-updated", {
          detail: { reason: "account-realtime-stats", rebuiltAt: Number((idx as any)?.rebuiltAt || Date.now()) },
        }));
      } catch {}
    }
  };

  const applyStatsSourcesPayload = async (payload: any) => {
    const values = sanitizeStatsSources(payload?.values && typeof payload.values === "object" ? payload.values : payload || {});
    applyStatsSourceValues(values, true);
    writeStatsMirror(userId, values);
  };

  const applyOrganizationWorkspacePayload = async (payload: any) => {
    const workspace: OrganizationWorkspace = payload?.kind === "organization" && cleanId(payload?.organizationId)
      ? { kind: "organization", organizationId: cleanId(payload.organizationId) }
      : { kind: "personal" };
    saveOrganizationWorkspace(userId, workspace);
  };

  const applyHistoryRow = async (row: SyncRow) => {
    const id = cleanId(row?.document_id);
    if (!id) return;
    const remoteTs = Number(row?.client_updated_at || 0) || toTimestamp(row?.updated_at);
    if (remoteTs && remoteTs < getRevision(DOC.historyMatch, id)) return;
    setRevision(DOC.historyMatch, id, remoteTs || Date.now());
    if (row?.deleted_at) {
      await (History as any).removeFromCloud(id);
      void scheduleStatsIndexRefresh({ reason: "account-realtime-history-delete", debounceMs: 250, includeNonFinished: false });
      return;
    }
    const record = row?.payload && typeof row.payload === "object" ? row.payload as SavedMatch : null;
    if (!record || !cleanId((record as any)?.id || (record as any)?.matchId)) return;
    await History.upsertFromCloud({ ...record, id, matchId: cleanId((record as any)?.matchId || id) } as SavedMatch, {
      cloudEventId: `account-sync:${id}:${remoteTs || "remote"}`,
      cloudCreatedAt: row?.updated_at || row?.created_at || undefined,
    });
    void scheduleStatsIndexRefresh({ reason: "account-realtime-history", debounceMs: 350, includeNonFinished: false });
  };

  const applyRemoteRow = async (row: SyncRow, force = false) => {
    if (stopped || !row || cleanId(row.owner_user_id) !== userId) return;
    const type = String(row.document_type || "") as DocumentType;
    const id = cleanId(row.document_id || DEFAULT_DOCUMENT_ID) || DEFAULT_DOCUMENT_ID;
    const remoteTs = Number(row.client_updated_at || 0) || toTimestamp(row.updated_at);
    if (!force && remoteTs && remoteTs <= getRevision(type, id)) return;

    await runRemoteApply(async () => {
      if (type === DOC.historyMatch) {
        await applyHistoryRow(row);
        return;
      }
      if (row.deleted_at) return;
      if (type === DOC.profiles) await applyProfilesPayload(row.payload);
      else if (type === DOC.bots) await applyBotsPayload(row.payload);
      else if (type === DOC.teams) await applyTeamsPayload(row.payload);
      else if (type === DOC.gallery) await applyGalleryPayload(row.payload);
      else if (type === DOC.dartSets) await applyDartSetsPayload(row.payload);
      else if (type === DOC.statsIndex) await applyStatsIndexPayload(row.payload);
      else if (type === DOC.statsSources) await applyStatsSourcesPayload(row.payload);
      else if (type === DOC.organizationWorkspace) await applyOrganizationWorkspacePayload(row.payload);
    });

    setRevision(type, id, remoteTs || Date.now());
    signatures.set(revisionKey(type, id), fingerprint(row.payload));
    emitStatus({ state: "synced", direction: "down", type, id, at: remoteTs || Date.now() });
  };

  const syncCollection = async (
    type: DocumentType,
    getLocal: () => any[] | Promise<any[]>,
    applyMerged: (payload: any[]) => void | Promise<void>,
  ) => {
    if (stopped || tableUnavailable || remotePaused()) return;
    const localPayload = await getLocal();
    const remote = await fetchDocument(type);
    if (stopped || tableUnavailable || remotePaused()) return;
    if (!remote) {
      await pushDocument(type, localPayload);
      return;
    }
    const remotePayload = Array.isArray(remote.payload) ? remote.payload : remote?.payload?.items || [];
    const localRevision = getRevision(type);
    const remoteRevision = Number(remote.client_updated_at || 0) || toTimestamp(remote.updated_at);

    if (localRevision > remoteRevision) {
      await pushDocument(type, localPayload, DEFAULT_DOCUMENT_ID, localRevision);
      return;
    }

    // Première connexion d'un appareil : union par ID pour ne pas perdre ses
    // anciennes données locales, mais le serveur gagne les conflits/égalités.
    const merged = localRevision === 0 ? mergeById(localPayload, remotePayload) : remotePayload;
    await runRemoteApply(() => applyMerged(merged));
    setRevision(type, DEFAULT_DOCUMENT_ID, remoteRevision || Date.now());
    signatures.set(revisionKey(type), fingerprint(merged));
    if (fingerprint(merged) !== fingerprint(remotePayload)) {
      // L'union a ajouté des objets locaux absents du compte : les rattacher.
      await pushDocument(type, merged);
    }
  };

  const syncScalarDocument = async (
    type: DocumentType,
    localPayload: any,
    applyRemote: (payload: any) => void | Promise<void>,
    localTimestamp = 0,
  ) => {
    if (stopped || tableUnavailable || remotePaused()) return;
    const remote = await fetchDocument(type);
    if (!remote) {
      await pushDocument(type, localPayload, DEFAULT_DOCUMENT_ID, localTimestamp || Date.now());
      return;
    }
    const remoteTs = Number(remote.client_updated_at || 0) || toTimestamp(remote.updated_at);
    const localRev = Math.max(getRevision(type), Number(localTimestamp || 0) || 0);
    if (localRev > remoteTs) {
      await pushDocument(type, localPayload, DEFAULT_DOCUMENT_ID, localRev);
      return;
    }
    await runRemoteApply(() => applyRemote(remote.payload));
    setRevision(type, DEFAULT_DOCUMENT_ID, remoteTs || Date.now());
    signatures.set(revisionKey(type), fingerprint(remote.payload));
  };

  const pushProfiles = async () => {
    const payload = serializeProfiles(options.getProfiles(), userId);
    const sigKey = revisionKey(DOC.profiles);
    const sig = fingerprint(payload);
    if (signatures.get(sigKey) === sig) return;
    await pushDocument(DOC.profiles, payload);
  };
  const pushBots = async () => {
    const payload = serializeBots();
    const sigKey = revisionKey(DOC.bots);
    const sig = fingerprint(payload);
    if (signatures.get(sigKey) === sig) return;
    await pushDocument(DOC.bots, payload);
  };
  const pushTeams = async () => {
    const payload = serializeTeams();
    const sigKey = revisionKey(DOC.teams);
    const sig = fingerprint(payload);
    if (signatures.get(sigKey) === sig) return;
    await pushDocument(DOC.teams, payload);
  };
  const pushGallery = async () => {
    const payload = serializeGallery(userId);
    const sigKey = revisionKey(DOC.gallery);
    const sig = fingerprint(payload);
    if (signatures.get(sigKey) === sig) return;
    await pushDocument(DOC.gallery, payload);
  };

  const pushDartSets = async () => {
    const payload = serializeDartSets();
    const sigKey = revisionKey(DOC.dartSets);
    const sig = fingerprint(payload);
    if (signatures.get(sigKey) === sig) return;
    await pushDocument(DOC.dartSets, payload);
  };
  const pushStatsIndex = async () => {
    const idx = await loadStatsIndex().catch(() => null);
    if (!idx) return;
    const sigKey = revisionKey(DOC.statsIndex);
    const sig = fingerprint(idx);
    if (signatures.get(sigKey) === sig) return;
    await pushDocument(DOC.statsIndex, idx, DEFAULT_DOCUMENT_ID, Number((idx as any)?.rebuiltAt || Date.now()));
  };
  const pushStatsSources = async () => {
    const values = sanitizeStatsSources(readStatsSources());
    writeStatsMirror(userId, values);
    const payload = { values };
    const sigKey = revisionKey(DOC.statsSources);
    const sig = fingerprint(payload);
    if (signatures.get(sigKey) === sig) return;
    await pushDocument(DOC.statsSources, payload);
  };
  const pushOrganizationWorkspace = async () => {
    const payload = loadOrganizationWorkspace(userId);
    const sigKey = revisionKey(DOC.organizationWorkspace);
    const sig = fingerprint(payload);
    if (signatures.get(sigKey) === sig) return;
    await pushDocument(DOC.organizationWorkspace, payload);
  };

  const scheduleLocalPush = (key: string, fn: () => Promise<any>, delay = LOCAL_DEBOUNCE_MS) => {
    if (stopped || remoteApplyDepth > 0 || tableUnavailable || remotePaused()) return;
    const existing = localTimers.get(key);
    if (existing != null) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      localTimers.delete(key);
      if (stopped || remoteApplyDepth > 0) return;
      void fn().catch((error) => console.warn(`[account-sync] local push ${key} failed`, error));
    }, delay);
    localTimers.set(key, timer);
  };

  const fetchAllHistoryRows = async (): Promise<SyncRow[]> => {
    const out: SyncRow[] = [];
    let from = 0;
    const pageSize = 250;
    while (!stopped && !tableUnavailable && !remotePaused()) {
      // Inventaire léger uniquement : les payloads complets des parties peuvent
      // peser plusieurs Mo cumulés. Ils ne sont téléchargés que si la version
      // distante est réellement plus récente ou absente de cet appareil.
      const { data, error } = await supabase
        .from(TABLE)
        .select("owner_user_id,document_type,document_id,client_updated_at,deleted_at,created_at,updated_at")
        .eq("owner_user_id", userId)
        .eq("document_type", DOC.historyMatch)
        .order("client_updated_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) {
        noteSupabaseError(error, "history-list");
        break;
      }
      const rows = (Array.isArray(data) ? data : [])
        .map((candidate: any) => normalizeSyncRow(candidate, userId))
        .filter(Boolean) as SyncRow[];
      out.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    return out;
  };

  const upsertHistoryRowsResilient = async (rowsInput: any[], action: string): Promise<{ written: number; failedIds: string[] }> => {
    const rows = Array.isArray(rowsInput) ? rowsInput.filter(Boolean) : [];
    let written = 0;
    const failedIds: string[] = [];
    for (let i = 0; i < rows.length; i += HISTORY_BATCH_SIZE) {
      if (stopped || tableUnavailable || remotePaused()) break;
      const batch = rows.slice(i, i + HISTORY_BATCH_SIZE);
      for (const row of batch) markOutbound(DOC.historyMatch, cleanId(row?.document_id), Number(row?.client_updated_at || 0));
      const { error } = await supabase.from(TABLE).upsert(batch as any, { onConflict: "owner_user_id,document_type,document_id" });
      if (!error) {
        written += batch.length;
        for (const row of batch) setRevision(DOC.historyMatch, row.document_id, row.client_updated_at);
      } else {
        if (isSupabaseTransientUnavailableError(error)) {
          for (const row of batch) clearOutbound(DOC.historyMatch, cleanId(row?.document_id), Number(row?.client_updated_at || 0));
          noteSupabaseError(error, `${action}:batch`);
          break;
        }
        // Une ligne invalide ne doit pas bloquer les autres, mais ce fallback
        // n'est jamais execute pendant une panne Supabase globale.
        console.warn(`[account-sync] ${action} batch failed; retrying row by row`, error);
        for (const row of batch) {
          const id = cleanId(row?.document_id);
          if (!id) continue;
          const { error: rowError } = await supabase.from(TABLE).upsert(row as any, { onConflict: "owner_user_id,document_type,document_id" });
          if (rowError) {
            clearOutbound(DOC.historyMatch, id, Number(row?.client_updated_at || 0));
            failedIds.push(id);
            noteSupabaseError(rowError, `${action}:${id}`);
            if (tableUnavailable) break;
          } else {
            written += 1;
            setRevision(DOC.historyMatch, id, Number(row?.client_updated_at || Date.now()));
          }
        }
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    return { written, failedIds };
  };

  const bootstrapHistory = async () => {
    if (stopped || tableUnavailable || remotePaused()) return;
    const remoteRows = await fetchAllHistoryRows();
    if (stopped || tableUnavailable || remotePaused()) return;
    const remoteById = new Map(remoteRows.map((row) => [cleanId(row.document_id), row]));

    // Lire d'abord les en-têtes locaux : sur un appareil déjà synchronisé, cela
    // permet d'éviter de re-télécharger à chaque connexion toutes les parties.
    const headers = await ((History as any).listFinished?.() ?? History.list()).catch(() => [] as SavedMatch[]);
    const localHeaderById = new Map<string, any>();
    for (const header of (Array.isArray(headers) ? headers : [])) {
      const id = cleanId((header as any)?.id || (header as any)?.matchId);
      if (id) localHeaderById.set(id, header);
    }

    // 1) Matérialiser uniquement les parties distantes réellement nouvelles.
    const rowsToFetch = remoteRows.filter((row) => {
      const id = cleanId(row.document_id);
      const remoteTs = Number(row.client_updated_at || 0) || toTimestamp(row.updated_at);
      if (row.deleted_at) return true;
      const local = localHeaderById.get(id);
      const localTs = local ? Math.max(toTimestamp(local?.updatedAt), toTimestamp(local?.finishedAt), toTimestamp(local?.createdAt)) : 0;
      if (local && localTs >= remoteTs) {
        if (remoteTs) setRevision(DOC.historyMatch, id, remoteTs);
        return false;
      }
      return true;
    });

    for (let i = 0; i < rowsToFetch.length; i += HISTORY_BATCH_SIZE) {
      const batchMeta = rowsToFetch.slice(i, i + HISTORY_BATCH_SIZE);
      const fetched = await Promise.all(batchMeta.map(async (meta) => {
        if (meta.deleted_at) return meta;
        return await fetchDocument(DOC.historyMatch, cleanId(meta.document_id));
      }));
      await runRemoteApply(async () => {
        for (const row of fetched) if (row) await applyHistoryRow(row);
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    // 2) Rattacher les parties finalisées présentes uniquement sur cet appareil.
    const pending: any[] = [];
    for (let i = 0; i < (Array.isArray(headers) ? headers.length : 0); i += 1) {
      if (stopped) return;
      const header: any = headers[i];
      const id = cleanId(header?.id || header?.matchId);
      if (!id) continue;
      const remote = remoteById.get(id);
      const localTs = Math.max(toTimestamp(header?.updatedAt), toTimestamp(header?.finishedAt), toTimestamp(header?.createdAt));
      const remoteTs = Number(remote?.client_updated_at || 0) || toTimestamp(remote?.updated_at);
      if (remote && remoteTs >= localTs) continue;
      let full: any = header;
      if (!header?.payload) {
        try { full = (await History.get(id)) || header; } catch {}
      }
      if (!isAccountSyncFinishedMatch({ ...(header as any), ...(full as any) })) continue;
      pending.push({
        owner_user_id: userId,
        document_type: DOC.historyMatch,
        document_id: id,
        payload: serializeHistory(full),
        client_updated_at: localTs || Date.now(),
        deleted_at: null,
      });
      if (pending.length >= HISTORY_BATCH_SIZE) {
        const batch = pending.splice(0, pending.length);
        await upsertHistoryRowsResilient(batch, "history-bootstrap-push");
      }
    }
    if (pending.length && !stopped) {
      await upsertHistoryRowsResilient(pending, "history-bootstrap-push-final");
    }

    void scheduleStatsIndexRefresh({ reason: "account-history-bootstrap", debounceMs: 500, includeNonFinished: false });
  };

  const refreshRemoteDocuments = async () => {
    if (stopped || tableUnavailable || remotePaused()) return;
    // Polling de secours = métadonnées seulement. `stats_sources` peut à lui
    // seul approcher 4 Mo : le relire intégralement toutes les 30 s était une
    // source d'egress disproportionnée. Realtime reste instantané ; ce poll ne
    // télécharge un payload que si client_updated_at a réellement changé.
    const { data, error } = await supabase
      .from(TABLE)
      .select("owner_user_id,document_type,document_id,client_updated_at,deleted_at,created_at,updated_at")
      .eq("owner_user_id", userId)
      .neq("document_type", DOC.historyMatch);
    if (error) {
      noteSupabaseError(error, "refresh");
      return;
    }
    for (const candidate of (Array.isArray(data) ? data : [])) {
      const meta = normalizeSyncRow(candidate, userId);
      if (!meta) continue;
      const type = String(meta.document_type || "") as DocumentType;
      const id = cleanId(meta.document_id || DEFAULT_DOCUMENT_ID) || DEFAULT_DOCUMENT_ID;
      const remoteTs = Number(meta.client_updated_at || 0) || toTimestamp(meta.updated_at);
      if (remoteTs && remoteTs <= getRevision(type, id)) continue;
      const full = await fetchDocument(type, id);
      if (full) await applyRemoteRow(full, false);
    }
  };

  const initialSync = async () => {
    emitStatus({ state: "starting", userId });
    // Avant toute lecture cloud, verrouiller les anciennes sources stats brutes
    // sur le bon compte local (évite compte A -> compte B sur le même téléphone).
    await runRemoteApply(async () => {
      activateStatsSourceNamespace(userId);
      statsNamespaceReady = true;
    });

    await syncCollection(DOC.profiles, () => serializeProfiles(options.getProfiles(), userId), applyProfilesPayload);
    await syncCollection(DOC.bots, () => serializeBots(), applyBotsPayload);
    await syncCollection(DOC.teams, () => serializeTeams(), applyTeamsPayload);
    await syncCollection(DOC.gallery, () => serializeGallery(userId), applyGalleryPayload);
    await syncCollection(DOC.dartSets, () => serializeDartSets(), applyDartSetsPayload);

    const currentStats = await loadStatsIndex().catch(() => null);
    if (currentStats) {
      await syncScalarDocument(DOC.statsIndex, currentStats, applyStatsIndexPayload, Number((currentStats as any)?.rebuiltAt || 0));
    } else {
      const remoteStats = await fetchDocument(DOC.statsIndex);
      if (remoteStats) await applyRemoteRow(remoteStats, true);
    }

    const statsValues = sanitizeStatsSources(readStatsSources());
    await syncScalarDocument(DOC.statsSources, { values: statsValues }, applyStatsSourcesPayload);
    await syncScalarDocument(DOC.organizationWorkspace, loadOrganizationWorkspace(userId), applyOrganizationWorkspacePayload);

    if (!tableUnavailable && !remotePaused()) {
      emitStatus({ state: "ready", userId });
      // L'historique peut être volumineux : il arrive après les objets UI rapides.
      window.setTimeout(() => { void bootstrapHistory().catch((error) => console.warn("[account-sync] history bootstrap failed", error)); }, 900);
    }
  };

  const onStoreMutated = () => scheduleLocalPush(DOC.profiles, pushProfiles);
  const onBotsChanged = () => scheduleLocalPush(DOC.bots, pushBots);
  const onTeamsChanged = () => scheduleLocalPush(DOC.teams, pushTeams);
  const onGalleryChanged = (event: Event) => {
    const accountId = cleanId((event as CustomEvent)?.detail?.accountId);
    if (accountId && accountId !== userId) return;
    scheduleLocalPush(DOC.gallery, pushGallery);
  };

  const onDartSetsChanged = () => scheduleLocalPush(DOC.dartSets, pushDartSets);

  const forcePushHistoryReplacement = async () => {
    const localRows = await ((History as any).listFinished?.() ?? History.list()).catch(() => [] as SavedMatch[]);
    const localById = new Map<string, SavedMatch>();
    for (const header of (Array.isArray(localRows) ? localRows : [])) {
      const id = cleanId((header as any)?.id || (header as any)?.matchId);
      if (!id) continue;
      let full: any = header;
      if (!(header as any)?.payload) {
        try { full = (await History.get(id)) || header; } catch {}
      }
      if (!isAccountSyncFinishedMatch({ ...(header as any), ...(full as any) })) continue;
      localById.set(id, full as SavedMatch);
    }

    const remoteRows = await fetchAllHistoryRows();
    const now = Date.now();
    const writes: any[] = [];
    for (const [id, record] of localById) {
      writes.push({
        owner_user_id: userId,
        document_type: DOC.historyMatch,
        document_id: id,
        payload: serializeHistory(record),
        client_updated_at: Math.max(historyUpdatedAt(record), now),
        deleted_at: null,
      });
    }
    for (const remote of remoteRows) {
      const id = cleanId(remote?.document_id);
      if (!id || localById.has(id) || remote?.deleted_at) continue;
      writes.push({
        owner_user_id: userId,
        document_type: DOC.historyMatch,
        document_id: id,
        payload: {},
        client_updated_at: now,
        deleted_at: new Date(now).toISOString(),
      });
    }

    const result = await upsertHistoryRowsResilient(writes, "history-force-replace");
    if (result.failedIds.length) {
      throw new Error(`History : ${result.failedIds.length} partie(s) n'ont pas pu être synchronisées (${result.failedIds.slice(0, 6).join(", ")}).`);
    }
    return { expected: localById.size, writes: writes.length, written: result.written };
  };

  const collectReferencedAccountMediaKeys = (): Set<string> => {
    const keys = new Set<string>();
    for (const profile of getAccountOwnedLocalProfiles(options.getProfiles(), userId)) {
      const id = cleanId(profile?.id);
      if (id) keys.add(profileAvatarMediaKey(id));
    }
    for (const bot of loadBots()) {
      if (!bot || isOfficialBotId(bot?.id) || bot?.systemBot) continue;
      const id = cleanId(bot?.id);
      if (id) keys.add(botAvatarMediaKey(id));
    }
    for (const team of loadTeams()) {
      const id = cleanId(team?.id);
      if (!id) continue;
      keys.add(cleanId((team as any)?.logoMediaKey) || teamLogoMediaKey(id));
      keys.add(cleanId((team as any)?.coverMediaKey) || teamCoverMediaKey(id));
    }
    for (const item of readAvatarGallery(userId)) {
      const id = cleanId((item as any)?.id || (item as any)?.hash);
      if (id) keys.add(galleryItemMediaKey(id));
    }
    try {
      const rows = JSON.parse(localStorage.getItem("msc_avatar_ia_gallery_v1") || "[]");
      if (Array.isArray(rows)) {
        for (const item of rows) {
          const id = cleanId(item?.id || item?.galleryId);
          if (id) keys.add(`avatar_ai_gallery:${id}`);
        }
      }
    } catch {}
    for (const set of getAllDartSets()) {
      const id = cleanId((set as any)?.id);
      if (!id) continue;
      keys.add(cleanId((set as any)?.r2MainMediaKey) || dartSetMainMediaKey(id));
      keys.add(cleanId((set as any)?.r2ThumbMediaKey) || dartSetThumbMediaKey(id));
    }
    return new Set(Array.from(keys).filter(Boolean));
  };

  const forcePushAllLocalToAccount = async (reason = "manual") => {
    if (stopped || tableUnavailable || remotePaused() || remoteApplyDepth > 0) return;
    emitStatus({ state: "force-sync", direction: "up", userId, reason });

    // D'abord sceller toutes les images restaurées/créées dans le petit coffre
    // média du compte. mirrorR2:false désactive uniquement le BACKUP R2 premium.
    try {
      await captureStoreUserMedia({
        profiles: options.getProfiles(),
        bots: loadBots(),
        dartSets: getAllDartSets(),
        teams: loadTeams(),
      }, { mirrorR2: false });
      // Les snapshots Drive/NAS/SD peuvent contenir un média uniquement dans le
      // coffre IndexedDB séparé. On republie uniquement les médias réellement
      // rattachés au compte courant (plus les petits médias Organisation), jamais
      // les centaines d'orphelins historiques du cache.
      const referencedKeys = collectReferencedAccountMediaKeys();
      const mirrored = await mirrorAllLocalUserMediaToAccountR2({
        keys: referencedKeys,
        kinds: ["club_logo", "club_cover", "group_avatar", "group_cover", "avatar_ai_gallery", "team_logo", "team_cover"],
        concurrency: 1,
      });
      if (mirrored.failed) throw new Error(`R2 Account Media : ${mirrored.failed} média(s) non synchronisé(s).`);
    } catch (mediaError) {
      console.warn("[account-sync] account media mirror incomplete", mediaError);
      // La synchro JSON/History continue : le prochain focus ou diagnostic pourra
      // reprendre les médias sans bloquer une restauration locale valide.
    }

    const ts = Date.now();
    await pushDocument(DOC.profiles, serializeProfiles(options.getProfiles(), userId), DEFAULT_DOCUMENT_ID, ts);
    await pushDocument(DOC.bots, serializeBots(), DEFAULT_DOCUMENT_ID, ts + 1);
    await pushDocument(DOC.teams, serializeTeams(), DEFAULT_DOCUMENT_ID, ts + 2);
    await pushDocument(DOC.gallery, serializeGallery(userId), DEFAULT_DOCUMENT_ID, ts + 3);
    await pushDocument(DOC.dartSets, serializeDartSets(), DEFAULT_DOCUMENT_ID, ts + 4);
    const idx = await loadStatsIndex().catch(() => null);
    if (idx) await pushDocument(DOC.statsIndex, idx, DEFAULT_DOCUMENT_ID, ts + 5);
    const statsValues = sanitizeStatsSources(readStatsSources());
    writeStatsMirror(userId, statsValues);
    await pushDocument(DOC.statsSources, { values: statsValues }, DEFAULT_DOCUMENT_ID, ts + 6);
    await pushDocument(DOC.organizationWorkspace, loadOrganizationWorkspace(userId), DEFAULT_DOCUMENT_ID, ts + 7);
    await forcePushHistoryReplacement();
    emitStatus({ state: "synced", direction: "up", userId, reason, forced: true, at: Date.now() });
  };

  const onAccountMediaSynced = (event: Event) => {
    if (stopped || tableUnavailable || remotePaused() || remoteApplyDepth > 0) return;
    const kind = cleanId((event as CustomEvent)?.detail?.kind).toLowerCase();
    // Un média arrive parfois quelques centaines de ms après la métadonnée.
    // On repousse donc le document léger afin que l'autre appareil retente
    // immédiatement l'hydratation au lieu d'attendre le polling.
    if (kind.includes("dartset")) void pushDocument(DOC.dartSets, serializeDartSets());
    else if (kind.includes("team_")) void pushDocument(DOC.teams, serializeTeams());
    else if (kind.includes("bot_avatar")) void pushDocument(DOC.bots, serializeBots());
    else if (kind.includes("gallery")) void pushDocument(DOC.gallery, serializeGallery(userId));
    else if (kind.includes("profile_avatar") || kind.includes("local_profile")) void pushDocument(DOC.profiles, serializeProfiles(options.getProfiles(), userId));
  };

  const onForceSync = (event: Event) => {
    const detail: any = (event as CustomEvent)?.detail || {};
    if (detail?.userId && cleanId(detail.userId) !== userId) return;
    void forcePushAllLocalToAccount(cleanId(detail?.reason) || "external").catch((error) => console.warn("[account-sync] forced sync failed", error));
  };
  const onStatsIndexUpdated = () => scheduleLocalPush(DOC.statsIndex, pushStatsIndex, 650);
  const onWorkspaceChanged = () => scheduleLocalPush(DOC.organizationWorkspace, pushOrganizationWorkspace);
  const onLocalStorageMutation = (event: Event) => {
    if (!statsNamespaceReady || remoteApplyDepth > 0) return;
    const key = cleanId((event as CustomEvent)?.detail?.key);
    if (key === "*" || isStatsSourceKey(key)) scheduleLocalPush(DOC.statsSources, pushStatsSources, 700);
  };
  const onHistoryChanged = (event: Event) => {
    if (remoteApplyDepth > 0 || tableUnavailable || remotePaused()) return;
    const detail: any = (event as CustomEvent)?.detail || {};
    if (detail.op === "upsert" && detail.record) {
      const record: SavedMatch = detail.record;
      const id = cleanId((record as any)?.id || (record as any)?.matchId);
      if (!id || String((record as any)?.status || "").toLowerCase() !== "finished") return;
      const rowTs = historyUpdatedAt(record);
      scheduleLocalPush(`${DOC.historyMatch}:${id}`, async () => {
        const safeRecord = serializeHistory(record);
        const row = {
          owner_user_id: userId,
          document_type: DOC.historyMatch,
          document_id: id,
          payload: safeRecord,
          client_updated_at: rowTs,
          deleted_at: null,
        };
        const { error } = await supabase.from(TABLE).upsert(row as any, { onConflict: "owner_user_id,document_type,document_id" });
        if (error) noteSupabaseError(error, "history-live-push");
        else setRevision(DOC.historyMatch, id, rowTs);
      }, 250);
      return;
    }
    if (detail.op === "delete" && cleanId(detail.id)) {
      const id = cleanId(detail.id);
      scheduleLocalPush(`${DOC.historyMatch}:${id}`, () => softDeleteHistory(id), 200);
      return;
    }
    if (detail.op === "clear" && Array.isArray(detail.ids)) {
      for (const rawId of detail.ids) {
        const id = cleanId(rawId);
        if (id) scheduleLocalPush(`${DOC.historyMatch}:${id}`, () => softDeleteHistory(id), 250);
      }
    }
  };

  const onFocusOrOnline = () => {
    if (stopped || remotePaused() || document.visibilityState === "hidden") return;
    void refreshRemoteDocuments();
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") onFocusOrOnline();
  };

  const globalForceSync = async (detail?: any) => {
    const requestedUserId = cleanId(detail?.userId);
    if (requestedUserId && requestedUserId !== userId) return false;
    await forcePushAllLocalToAccount(cleanId(detail?.reason) || "global-bridge");
    return true;
  };
  try { (window as any).__forceAccountOwnedSyncNow = globalForceSync; } catch {}

  window.addEventListener(ACCOUNT_OWNED_STORE_MUTATED_EVENT, onStoreMutated as EventListener);
  window.addEventListener("dc:bots-changed", onBotsChanged as EventListener);
  window.addEventListener("dc:teams-changed", onTeamsChanged as EventListener);
  window.addEventListener(AVATAR_GALLERY_EVENT, onGalleryChanged as EventListener);
  window.addEventListener("dc-dartsets-updated", onDartSetsChanged as EventListener);
  window.addEventListener(ACCOUNT_MEDIA_SYNCED_EVENT, onAccountMediaSynced as EventListener);
  window.addEventListener(ACCOUNT_OWNED_FORCE_SYNC_EVENT, onForceSync as EventListener);
  window.addEventListener("dc-stats-index-updated", onStatsIndexUpdated as EventListener);
  window.addEventListener(ORGANIZATION_WORKSPACE_EVENT, onWorkspaceChanged as EventListener);
  window.addEventListener(ACCOUNT_LOCAL_STORAGE_MUTATION_EVENT, onLocalStorageMutation as EventListener);
  window.addEventListener(ACCOUNT_HISTORY_LOCAL_CHANGE_EVENT, onHistoryChanged as EventListener);
  window.addEventListener("focus", onFocusOrOnline);
  window.addEventListener("online", onFocusOrOnline);
  document.addEventListener("visibilitychange", onVisibility);

  try {
    channel = supabase
      .channel(`account-owned:${userId}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `owner_user_id=eq.${userId}` },
        (event: any) => {
          // Les payloads DELETE / partiels de Realtime ne doivent jamais vider
          // une collection locale. On valide propriétaire/type/id avant apply.
          const eventType = String(event?.eventType || event?.event || "").toUpperCase();
          const candidate = eventType === "DELETE" ? event?.old : (event?.new ?? event?.old);
          const row = normalizeSyncRow(candidate, userId);
          if (!row) return;
          if (eventType === "DELETE" && row.document_type !== DOC.historyMatch) return;
          if (isOwnRealtimeEcho(row)) {
            const type = String(row?.document_type || "");
            const id = cleanId(row?.document_id || DEFAULT_DOCUMENT_ID) || DEFAULT_DOCUMENT_ID;
            const ts = Number(row?.client_updated_at || 0) || toTimestamp(row?.updated_at) || Date.now();
            setRevision(type, id, ts);
            if (row?.payload !== undefined) signatures.set(revisionKey(type, id), fingerprint(row.payload));
            emitStatus({ state: "realtime-echo", direction: "up", type, id, at: ts });
            return;
          }
          void applyRemoteRow(row, false).catch((error) => console.warn("[account-sync] realtime apply failed", {
            type: row?.document_type, id: row?.document_id, message: String((error as any)?.message || error), error,
          }));
        },
      )
      .subscribe((status: string) => emitStatus({ state: "realtime", status, userId }));
  } catch (error) {
    console.warn("[account-sync] realtime subscribe failed", error);
  }

  pollTimer = window.setInterval(() => {
    if (stopped || remotePaused() || document.visibilityState === "hidden") return;
    void refreshRemoteDocuments();
  }, POLL_MS);

  void initialSync().catch((error) => console.warn("[account-sync] initial sync failed", error));

  return () => {
    stopped = true;
    for (const timer of localTimers.values()) window.clearTimeout(timer);
    localTimers.clear();
    if (pollTimer != null) window.clearInterval(pollTimer);
    pollTimer = null;
    window.removeEventListener(ACCOUNT_OWNED_STORE_MUTATED_EVENT, onStoreMutated as EventListener);
    window.removeEventListener("dc:bots-changed", onBotsChanged as EventListener);
    window.removeEventListener("dc:teams-changed", onTeamsChanged as EventListener);
    window.removeEventListener(AVATAR_GALLERY_EVENT, onGalleryChanged as EventListener);
    window.removeEventListener("dc-dartsets-updated", onDartSetsChanged as EventListener);
    window.removeEventListener(ACCOUNT_MEDIA_SYNCED_EVENT, onAccountMediaSynced as EventListener);
    window.removeEventListener(ACCOUNT_OWNED_FORCE_SYNC_EVENT, onForceSync as EventListener);
    window.removeEventListener("dc-stats-index-updated", onStatsIndexUpdated as EventListener);
    window.removeEventListener(ORGANIZATION_WORKSPACE_EVENT, onWorkspaceChanged as EventListener);
    window.removeEventListener(ACCOUNT_LOCAL_STORAGE_MUTATION_EVENT, onLocalStorageMutation as EventListener);
    window.removeEventListener(ACCOUNT_HISTORY_LOCAL_CHANGE_EVENT, onHistoryChanged as EventListener);
    window.removeEventListener("focus", onFocusOrOnline);
    window.removeEventListener("online", onFocusOrOnline);
    document.removeEventListener("visibilitychange", onVisibility);
    try {
      if ((window as any).__forceAccountOwnedSyncNow === globalForceSync) {
        delete (window as any).__forceAccountOwnedSyncNow;
      }
    } catch {}
    if (channel) {
      try { void supabase.removeChannel(channel); } catch {}
      channel = null;
    }
  };
}
