import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import * as React from "react";
import { Capacitor } from "@capacitor/core";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { gzipSync, strToU8 } from "fflate";
import { useTheme } from "../contexts/ThemeContext";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useLang } from "../contexts/LangContext";
import tickerStorageBackupFr from "../assets/tickers/ticker_storage_backup_fr.webp";
import tickerStorageBackupEn from "../assets/tickers/ticker_storage_backup_en.webp";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { apiPost, buildApiUrl, readNasAccessToken } from "../lib/apiClient";
import { exportCloudSnapshot, importCloudSnapshot, loadStore, setStorageUser } from "../lib/storage";
import {
  createLocalMemorySlot,
  createLocalMemorySlotFromSnapshot,
  createNasVersionedSnapshot,
  decodeMaybeCompressedNasPayload,
  deleteLocalMemorySlot,
  deleteNasMemorySlot,
  emptyNasDeletedMemorySlots,
  exportJsonDownload,
  listLocalMemorySlots,
  listNasDeletedMemorySlots,
  listNasMemorySlots,
  pullNasMemorySlot,
  restoreNasDeletedMemorySlot,
  scanLocalStorageAndIndexedDb,
  summarizeVaultPayload,
  getVaultCurrentUserId,
  type MemorySlot,
  type NasSlot,
  type StorageBlock,
  type VaultSummary,
} from "../lib/storageVault";
import {
  markStatsIndexDirty,
  scheduleStatsIndexRefresh,
} from "../lib/stats/rebuildStatsFromHistory";
import {
  deleteCloudMatchBackup,
  deleteLocalMatchBackup,
  deleteNasMatchBackup,
  listCloudMatchBackups,
  listLocalMatchBackups,
  listNasMatchBackups,
  pullCloudMatchBackup,
  pullNasMatchBackup,
  restoreMatchBackupItem,
  type MatchBackupItem,
} from "../lib/matchAutoBackup";
import {
  CLOUD_BACKUP_OBJECT_TYPE,
  CLOUD_VAULT_OBJECT_TYPE,
  deleteCloudObjectIndex,
  downloadCloudObject,
  emptyCloudObjectTrash,
  getAccountStorageUsage,
  saveAccountStoragePreferences,
  listCloudVaultBackups,
  purgeCloudObjectRemote,
  restoreCloudObjectFromTrash,
  uploadCloudVaultSnapshotJson,
  type CloudObjectIndexItem,
} from "../lib/cloudStorageApi";
import { restoreCloudBackupFromJson } from "../lib/cloudBackup";
import {
  getDirectR2Status,
  getDirectR2Usage,
  isDirectR2PremiumWriteAllowed,
  type DirectR2Status,
  type DirectR2Usage,
} from "../lib/directR2BackupApi";
import {
  estimateBrowserStorage,
  formatStorageBytes,
  getPublicStorageDestinations,
  getStorageDestination,
  getStoragePlan,
  loadStoragePrefs,
  saveStoragePrefs,
  type StorageDestinationId,
} from "../lib/storagePlans";
import {
  chooseExternalBackupFile,
  chooseExternalBackupFileWithJson,
  chooseExternalBackupTargetOnly,
  downloadExternalBackupFallback,
  downloadExternalBackupJson,
  getExternalBackupStatus,
  writeExternalBackupJsonNow,
  writeExternalBackupNow,
  type ExternalBackupStatus,
} from "../lib/externalBackupTarget";
import {
  isBackgroundBackupRunning,
  startBackgroundBackupJob,
  useBackgroundBackupState,
} from "../lib/backgroundBackup";
import {
  isBackgroundRestoreRunning,
  startBackgroundRestoreJob,
  useBackgroundRestoreState,
  type BackgroundRestoreReporter,
} from "../lib/backgroundRestore";

type Props = { go?: (tab: any, params?: any) => void };
type TabKey = "restore" | "backup" | "matches" | "diagnostic";
type RestoreView = "current" | "archives" | "trash";
type SaveSource = "nas" | "local" | "cloud" | "file";
type BackupProvider = "nas" | "cloud";
type RestoreSource = BackupProvider | "local" | "file";
type SaveGrade = "complete" | "history" | "stats-only" | "profiles-only" | "technical";

type SaveQuality = {
  grade: SaveGrade;
  label: string;
  short: string;
  color: string;
  score: number;
  restorable: boolean;
  reason: string;
};

type SaveEntry = {
  key: string;
  source: SaveSource;
  slot: NasSlot | MemorySlot | CloudSlot;
  summary: VaultSummary;
  title: string;
  subtitle: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  latest?: boolean;
  index: number;
  quality: SaveQuality;
};

type BackupModeBreakdown = {
  mode: string;
  count: number;
};

type BackupSportBreakdown = {
  sport: string;
  count: number;
  modes: BackupModeBreakdown[];
};

type BackupDetails = {
  date: string | null;
  sizeBytes: number;
  matches: number;
  profiles: number;
  statsMatches: number;
  images: number;
  teams: number;
  bots: number;
  dartsets: number;
  visits: number;
  darts: number;
  sports: BackupSportBreakdown[];
  sourceLabel: string;
  appVersion: string | null;
  formatVersion: string | null;
  integrityLabel: string;
};

type CloudSlot = CloudObjectIndexItem & {
  __summary?: VaultSummary;
  __payload?: any;
  latest?: boolean;
  deletedAt?: string | null;
};

const REMOTE_SOURCE_PREF_KEY = "dc_storage_vault_remote_source_v1";

function readPreferredRemoteSource(): BackupProvider | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = String(window.localStorage.getItem(REMOTE_SOURCE_PREF_KEY) || "").trim();
    return raw === "cloud" || raw === "nas" ? raw : null;
  } catch {
    return null;
  }
}

function writePreferredRemoteSource(provider: BackupProvider) {
  try { window.localStorage.setItem(REMOTE_SOURCE_PREF_KEY, provider); } catch {}
}

const NAS_SLOTS_CACHE_PREFIX = "dc_storage_vault_nas_slots_cache_v2:";

function nasSlotsCacheKey(): string {
  return `${NAS_SLOTS_CACHE_PREFIX}${getVaultCurrentUserId() || "anonymous"}`;
}

function readCachedNasSlots(): NasSlot[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(nasSlotsCacheKey()) || "[]");
    return Array.isArray(parsed) ? parsed.filter((row: any) => row && typeof row === "object" && row.id).slice(0, 120) : [];
  } catch {
    return [];
  }
}

function writeCachedNasSlots(slots: NasSlot[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(nasSlotsCacheKey(), JSON.stringify((Array.isArray(slots) ? slots : []).slice(0, 120)));
  } catch {}
}

const neon = "var(--dc-accent-soft, #22d3ee)";
const gold = "var(--dc-accent, #d9ff33)";
const red = "#fb7185";
const green = "#34d399";
const amber = "#fbbf24";
const muted = "#94a3b8";
const accentSoftBg = "color-mix(in srgb, var(--dc-accent, #d9ff33) 14%, transparent)";
const accentSoftBorder = "color-mix(in srgb, var(--dc-accent, #d9ff33) 32%, transparent)";
const accentGlow = "color-mix(in srgb, var(--dc-accent, #d9ff33) 45%, transparent)";
const accentSoftGlow = "color-mix(in srgb, var(--dc-accent-soft, #22d3ee) 28%, transparent)";

function StorageDestinationIcon({ id, size = 31 }: { id: StorageDestinationId; size?: number }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (id) {
    case "app_local":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <rect {...p} x="6.5" y="2.5" width="11" height="19" rx="2.4" />
          <path {...p} d="M9.5 5h5" />
          <path {...p} d="M10 18.5h4" />
          <path {...p} d="M9 9.5h6M9 12.5h6M9 15.5h4" />
        </svg>
      );
    case "device_file":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M3.5 6.5h6l2 2H20.5v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-12Z" />
          <path {...p} d="M8.5 13h7M8.5 16h5" />
        </svg>
      );
    case "external_sd_manual":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M7 2.5h8l4 4v15H7Z" />
          <path {...p} d="M15 2.5v5h4" />
          <path {...p} d="M9.5 12v4M12.5 12v4M15.5 12v4" />
        </svg>
      );
    case "personal_cloud_manual":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M3.5 7h6l2 2H20.5v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z" />
          <path {...p} d="M7.5 15.5h1a3 3 0 0 1 .5-5.95A4.6 4.6 0 0 1 17.9 11a3.2 3.2 0 0 1-.4 6.35h-1" />
        </svg>
      );
    case "cloud_r2":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M7 18.5H5.5a3.5 3.5 0 0 1-.5-7A6.5 6.5 0 0 1 17.6 9a4.6 4.6 0 0 1 .9 9.1H17" />
          <path {...p} d="m9 15 3-3 3 3" />
          <path {...p} d="M12 12v8" />
        </svg>
      );
    case "founder_nas":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <rect {...p} x="3" y="4" width="18" height="6" rx="1.6" />
          <rect {...p} x="3" y="14" width="18" height="6" rx="1.6" />
          <path {...p} d="M7 7h.01M7 17h.01M11 7h7M11 17h7" />
        </svg>
      );
    default:
      return null;
  }
}

const AUTH_KEYS = [
  "dc_nas_access_token_v1",
  "dc_nas_refresh_token_v1",
  "dc_online_auth_supabase_v1",
  "dc_api_url",
  "dc_api_timeout_ms",
];

function readAuthTokenFromObject(value: any): string {
  if (!value || typeof value !== "object") return "";
  return String(
    value.token ||
    value.accessToken ||
    value.access_token ||
    value.jwt ||
    value.access ||
    value.session?.token ||
    value.session?.accessToken ||
    value.session?.access_token ||
    value.data?.token ||
    value.data?.accessToken ||
    value.data?.access_token ||
    value.data?.session?.token ||
    value.data?.session?.accessToken ||
    value.data?.session?.access_token ||
    ""
  ).trim();
}

function readRefreshTokenFromObject(value: any): string {
  if (!value || typeof value !== "object") return "";
  return String(
    value.refreshToken ||
    value.refresh_token ||
    value.session?.refreshToken ||
    value.session?.refresh_token ||
    value.data?.refreshToken ||
    value.data?.refresh_token ||
    value.data?.session?.refreshToken ||
    value.data?.session?.refresh_token ||
    ""
  ).trim();
}

function readUserIdFromObject(value: any): string {
  if (!value || typeof value !== "object") return "";
  return String(
    value.userId ||
    value.user?.id ||
    value.profile?.userId ||
    value.profile?.user_id ||
    value.session?.user?.id ||
    value.data?.userId ||
    value.data?.user?.id ||
    value.data?.profile?.userId ||
    ""
  ).trim();
}

function readVaultAuthProvider(authLike?: any): string {
  return String(
    authLike?.authProvider ||
    authLike?.auth_provider ||
    authLike?.user?.user_metadata?.auth_provider ||
    authLike?.user?.app_metadata?.provider ||
    authLike?.session?.authProvider ||
    authLike?.session?.auth_provider ||
    authLike?.session?.user?.user_metadata?.auth_provider ||
    ""
  ).trim().toLowerCase();
}

function isPublicSupabaseVaultAuth(authLike?: any): boolean {
  const provider = readVaultAuthProvider(authLike);
  return provider === "supabase" ||
    provider === "supabase_failover" ||
    authLike?.degradedMode === true ||
    authLike?.degraded_mode === true ||
    authLike?.user?.user_metadata?.degraded_mode === true;
}

function persistNasAuthForVault(authLike?: any): string {
  if (typeof window === "undefined") return "";

  const publicSupabaseSession = isPublicSupabaseVaultAuth(authLike);
  let token = publicSupabaseSession ? "" : readAuthTokenFromObject(authLike || {});
  let refreshToken = publicSupabaseSession ? "" : readRefreshTokenFromObject(authLike || {});
  let userId = String(authLike?.userId || authLike?.user?.id || readUserIdFromObject(authLike || "") || "").trim();

  try {
    const raw = window.localStorage.getItem("dc_online_auth_supabase_v1") || "";
    if (raw) {
      const cached = JSON.parse(raw);
      const cachedIsPublicSupabase = isPublicSupabaseVaultAuth(cached);
      if (!publicSupabaseSession && !cachedIsPublicSupabase) {
        token = token || readAuthTokenFromObject(cached);
        refreshToken = refreshToken || readRefreshTokenFromObject(cached);
      }
      userId = userId || readUserIdFromObject(cached);
    }
  } catch {}

  try {
    if (!publicSupabaseSession) token = token || readNasAccessToken();
  } catch {}

  if (userId) {
    try { window.localStorage.setItem("dc_user_id", userId); } catch {}
    try { window.localStorage.setItem("dc_storage_user_id_v1", userId); } catch {}
    try { setStorageUser(userId); } catch {}
  }

  if (token) {
    try { window.localStorage.setItem("dc_nas_access_token_v1", token); } catch {}
    if (refreshToken) {
      try { window.localStorage.setItem("dc_nas_refresh_token_v1", refreshToken); } catch {}
    }
    try {
      const raw = window.localStorage.getItem("dc_online_auth_supabase_v1") || "{}";
      const previous = JSON.parse(raw);
      const next = {
        ...(previous && typeof previous === "object" ? previous : {}),
        token,
        accessToken: token,
        refreshToken: refreshToken || previous?.refreshToken || previous?.refresh_token || "",
        userId: userId || previous?.userId || previous?.user?.id || null,
        user: {
          ...(previous?.user || {}),
          ...(authLike?.user || {}),
          id: userId || previous?.user?.id || authLike?.user?.id || null,
        },
      };
      window.localStorage.setItem("dc_online_auth_supabase_v1", JSON.stringify(next));
    } catch {}
  }

  return publicSupabaseSession ? "" : (token || "");
}

async function ensureNasTokenFromOnlineRuntime(authLike?: any): Promise<string> {
  let token = persistNasAuthForVault(authLike);
  if (token) return token;
  try {
    const mod: any = await import("../lib/onlineApi");
    const session = await mod?.onlineApi?.getCurrentSession?.();
    token = persistNasAuthForVault(session);
    if (token) return token;
  } catch {}
  return persistNasAuthForVault(authLike);
}

function rememberAuthKeys() {
  const saved: Record<string, string> = {};
  try {
    for (const key of AUTH_KEYS) {
      const value = window.localStorage.getItem(key);
      if (value != null) saved[key] = value;
    }
  } catch {}
  return () => {
    try {
      for (const [key, value] of Object.entries(saved)) window.localStorage.setItem(key, value);
    } catch {}
  };
}

function looksLikeCloudSnapshot(value: any): boolean {
  return !!value && typeof value === "object" && (
    value._v === 1 ||
    value._v === 2 ||
    value.idb ||
    value.localStorage ||
    value.history ||
    value.store ||
    value.data ||
    value.tournaments ||
    value.competitions
  );
}

function unwrapSnapshotEnvelope(input: any): any {
  if (input?.payload && looksLikeCloudSnapshot(input.payload)) return input.payload;
  if (input?.data?.payload && looksLikeCloudSnapshot(input.data.payload)) return input.data.payload;
  if (input?.snapshot && looksLikeCloudSnapshot(input.snapshot)) return input.snapshot;
  return input;
}

function rowsFrom(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function isCatalogOnlySnapshot(snapshot: any): boolean {
  return !!snapshot &&
    typeof snapshot === "object" &&
    Array.isArray(snapshot.blocks) &&
    !snapshot.idb &&
    !snapshot.history &&
    !snapshot.tournaments &&
    !snapshot.competitions;
}

function countStatsIndexMatches(snapshot: any): number {
  const idb = snapshot?.idb;
  if (!idb || typeof idb !== "object") return 0;
  let best = 0;
  for (const [key, value] of Object.entries<any>(idb)) {
    if (!String(key).startsWith("dc_stats_index_v2")) continue;
    const byMode = value?.matchIdsByMode || value?.matchesByMode;
    if (!byMode || typeof byMode !== "object") continue;
    const total = Object.values<any>(byMode).reduce((sum, ids) => sum + (Array.isArray(ids) ? ids.length : 0), 0);
    best = Math.max(best, total);
  }
  return best;
}

function countRealHistoryRows(snapshot: any): { rows: number; detailed: number } {
  const rawRows = snapshot?.history?.rows;
  const rows = rowsFrom(rawRows);
  let valid = 0;
  let detailed = 0;

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const hasId = Boolean(row.id || row.matchId);
    const hasPlayers = Array.isArray(row.players) && row.players.length > 0;
    const hasSummary = !!row.summary && typeof row.summary === "object";
    const hasCompact = !!row.compact || (typeof row.payloadCompressed === "string" && row.payloadCompressed.length > 80);
    const hasTurns =
      (Array.isArray(row.visitHistory) && row.visitHistory.length > 0) ||
      (Array.isArray(row.visitsHistory) && row.visitsHistory.length > 0) ||
      (!!row.resume && typeof row.resume === "object") ||
      (!!row.__legStats && typeof row.__legStats === "object");

    if (hasId && hasPlayers && (hasSummary || hasCompact || hasTurns)) valid += 1;
    if (hasId && hasPlayers && (hasCompact || hasTurns)) detailed += 1;
  }

  return { rows: valid, detailed };
}

function strictSummaryForRestore(payload: any, fallback?: Partial<VaultSummary> | null): VaultSummary {
  const snapshot = unwrapSnapshotEnvelope(payload);
  const base = normalizeSummary(fallback || summarizeVaultPayload(snapshot));

  if (isCatalogOnlySnapshot(snapshot)) {
    return {
      ...base,
      matches: 0,
      historyRows: 0,
      statsBlocks: 0,
      probableContent: ["catalogue technique"],
    };
  }

  const realHistory = countRealHistoryRows(snapshot);
  const statsIds = countStatsIndexMatches(snapshot);

  if (realHistory.rows > 0) {
    return {
      ...base,
      matches: realHistory.rows,
      historyRows: realHistory.rows,
      statsMatches: Math.max(n(base.statsMatches), statsIds),
      statsBlocks: Math.max(base.statsBlocks, statsIds),
      probableContent: Array.from(new Set([...(base.probableContent || []), "historique réel", "parties"])),
    };
  }

  if (statsIds > 0) {
    return {
      ...base,
      matches: statsIds,
      historyRows: 0,
      statsMatches: Math.max(n(base.statsMatches), statsIds),
      statsBlocks: Math.max(base.statsBlocks, statsIds),
      probableContent: Array.from(new Set([...(base.probableContent || []), "stats seules"])),
    };
  }

  return base;
}

function explainStrictPayload(payload: any): string {
  const snapshot = unwrapSnapshotEnvelope(payload);
  if (isCatalogOnlySnapshot(snapshot)) {
    return "Ce fichier est seulement un catalogue de blocs détectés. Il ne contient pas les vraies lignes de parties à restaurer.";
  }
  const realHistory = countRealHistoryRows(snapshot);
  const statsIds = countStatsIndexMatches(snapshot);
  if (realHistory.rows > 0) return `${realHistory.rows} vraie(s) ligne(s) historique, dont ${realHistory.detailed} détaillée(s).`;
  if (statsIds > 0) return `${statsIds} référence(s) de stats, mais aucune vraie carte historique détaillée.`;
  return "Aucune vraie donnée de partie restaurable détectée.";
}

function looksLikeCloudBackupV1(value: any): boolean {
  return !!value &&
    typeof value === "object" &&
    typeof value.version === "number" &&
    typeof value.exportedAt === "string" &&
    typeof value.appVersion === "string" &&
    Array.isArray(value.history) &&
    Array.isArray(value.localProfiles) &&
    Array.isArray(value.dartsets);
}

function normalizeCloudPayload(input: any): any {
  if (typeof input === "string") {
    const raw = input.trim();
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return input;
}

function cloudObjectMetadataSummary(item: CloudObjectIndexItem): Partial<VaultSummary> | null {
  const meta: any = item?.metadata || {};
  const nested: any = meta.summary && typeof meta.summary === "object" ? meta.summary : {};
  const historyCount = Number(nested.matches ?? nested.historyRows ?? meta.historyCount ?? meta.matches ?? meta.historyRows ?? 0) || 0;
  const profilesCount = Number(nested.profiles ?? meta.profilesCount ?? meta.profiles ?? 0) || 0;
  const dartsetsCount = Number(meta.dartsetsCount ?? 0) || 0;
  const rawSize = Number(nested.bytes ?? meta.rawSizeBytes ?? meta.originalByteSize ?? item?.size_bytes ?? 0) || 0;
  const statsMatches = Number(nested.statsMatches ?? meta.statsMatches ?? 0) || 0;
  const statsBlocks = Math.max(Number(nested.statsBlocks ?? meta.statsBlocks ?? 0) || 0, statsMatches);
  if (!historyCount && !profilesCount && !dartsetsCount && !rawSize) return null;
  return {
    bytes: rawSize,
    keys: 0,
    profiles: profilesCount,
    matches: historyCount,
    historyRows: historyCount,
    statsMatches,
    statsBlocks,
    mediaRefs: Number(nested.mediaRefs || 0) || 0,
    dataImages: Number(nested.dataImages || 0) || 0,
    images: Number(nested.images || meta.imagesCount || 0) || 0,
    teams: Number(nested.teams || meta.teamsCount || 0) || 0,
    bots: Number(nested.bots || meta.botsCount || 0) || 0,
    dartsets: Math.max(dartsetsCount, Number(nested.dartsets || 0) || 0),
    visits: Number(nested.visits || 0) || 0,
    darts: Number(nested.darts || 0) || 0,
    sports: Array.isArray(nested.sports) ? nested.sports : [],
    names: Array.isArray(nested.names) ? nested.names : [],
    exportedAt: nested.exportedAt || meta.exportedAt || item?.created_at || null,
    probableContent: [
      historyCount ? "historique réel" : "",
      profilesCount ? "profils" : "",
      dartsetsCount ? "dartsets" : "",
      statsBlocks ? "stats" : "",
    ].filter(Boolean),
  };
}

function strictSummaryForCloudPayload(payload: any, fallback?: Partial<VaultSummary> | null): VaultSummary {
  const normalized = normalizeCloudPayload(payload);
  if (looksLikeCloudBackupV1(normalized)) {
    const base = normalizeSummary(fallback || summarizeVaultPayload(normalized));
    return {
      ...base,
      matches: Math.max(base.matches, normalized.history.length),
      historyRows: Math.max(base.historyRows, normalized.history.length),
      profiles: Math.max(base.profiles, normalized.localProfiles.length),
      exportedAt: normalized.exportedAt || base.exportedAt,
      probableContent: Array.from(new Set([...(base.probableContent || []), normalized.history.length ? "historique réel" : "", normalized.localProfiles.length ? "profils" : "", normalized.dartsets.length ? "dartsets" : ""].filter(Boolean))),
    };
  }
  return strictSummaryForRestore(normalized, fallback);
}

function assessSaveForProvider(summary?: Partial<VaultSummary> | null, provider: BackupProvider | "local" = "nas"): SaveQuality {
  const q = assessSave(summary);
  const s = normalizeSummary(summary || {});
  if (provider === "cloud" && !q.restorable && (s.profiles > 0 || s.matches > 0 || s.historyRows > 0)) {
    return {
      ...q,
      restorable: true,
      label: s.historyRows > 0 ? "SAUVEGARDE CLOUD" : "PROFILS CLOUD",
      short: s.historyRows > 0 ? "Cloud" : "Profils",
      color: s.historyRows > 0 ? green : neon,
      score: Math.max(q.score, s.historyRows > 0 ? 68 : 35),
      reason: "État cloud restaurable pour ce compte public, même si aucune partie n’est encore enregistrée.",
    };
  }
  return q;
}

async function pullCloudVaultSlot(item: CloudObjectIndexItem, opts?: { trash?: boolean }): Promise<{ slot: CloudSlot; payload: any; summary: VaultSummary }> {
  const downloaded = await downloadCloudObject(item.id, { trash: !!opts?.trash });
  const payload = normalizeCloudPayload(
    typeof downloaded.text === "string"
      ? downloaded.text
      : downloaded.content != null
        ? downloaded.content
        : downloaded.contentBase64 || null
  );
  const summary = strictSummaryForCloudPayload(payload, cloudObjectMetadataSummary(item));
  return {
    slot: { ...(downloaded.object || item), __payload: payload, __summary: summary, latest: (item as any).latest, deletedAt: (item as any).deletedAt || null },
    payload,
    summary,
  };
}

function cloudTitle(_item: CloudObjectIndexItem, idx: number, latest = false) {
  if (latest || idx === 0) return "Sauvegarde cloud courante";
  if (idx === 1) return "Sauvegarde cloud précédente";
  return `Sauvegarde cloud ${String(idx + 1).padStart(2, "0")}`;
}

function n(value: any): number {
  const out = Number(value || 0);
  return Number.isFinite(out) ? out : 0;
}

function normalizeSummary(raw: Partial<VaultSummary> | undefined | null): VaultSummary {
  const s: any = raw || {};
  const rawMatches = n(s.matches);
  const rawHistoryRows = n(s.historyRows);
  const rawStatsMatches = n(s.statsMatches || s.statsBlocks || s.stats);

  // Compatibilité avec les résumés créés avant la correction V57 :
  // l'ancien parcours additionnait les volées/fléchettes situées sous
  // "history.*" et comptait parfois deux fois les lignes d'historique.
  const clearlyInflatedLegacySummary =
    rawMatches > 1_000 &&
    rawStatsMatches > 0 &&
    rawMatches > Math.max(rawHistoryRows, rawStatsMatches) * 20;
  const duplicatedLegacyHistory =
    rawHistoryRows > 0 &&
    rawStatsMatches > 0 &&
    rawHistoryRows === rawStatsMatches * 2;

  const correctedHistoryRows =
    clearlyInflatedLegacySummary && duplicatedLegacyHistory
      ? rawStatsMatches
      : rawHistoryRows;
  const correctedMatches =
    clearlyInflatedLegacySummary
      ? (correctedHistoryRows || rawStatsMatches)
      : rawMatches;

  return {
    bytes: n(s.bytes),
    keys: n(s.keys),
    profiles: n(s.profiles),
    matches: correctedMatches,
    historyRows: correctedHistoryRows,
    statsMatches: rawStatsMatches,
    statsBlocks: rawStatsMatches,
    mediaRefs: n(s.mediaRefs),
    dataImages: n(s.dataImages),
    images: n(s.images || (n(s.mediaRefs) + n(s.dataImages))),
    teams: n(s.teams),
    bots: n(s.bots),
    dartsets: n(s.dartsets || s.dartSets),
    visits: n(s.visits),
    darts: n(s.darts),
    sports: Array.isArray(s.sports) ? s.sports.map(String).filter(Boolean).slice(0, 16) : [],
    names: Array.isArray(s.names) ? s.names.map(String).filter(Boolean).slice(0, 20) : [],
    exportedAt: s.exportedAt || null,
    matchFrom: s.matchFrom || null,
    matchTo: s.matchTo || null,
    x01Matches: n(s.x01Matches),
    probableContent: Array.isArray(s.probableContent) ? s.probableContent.map(String).filter(Boolean) : [],
  };
}

function detailRows(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function historyRowsForDetails(payload: any): any[] {
  const snapshot = unwrapSnapshotEnvelope(payload);
  const candidates = [
    snapshot?.history?.rows,
    snapshot?.history,
    snapshot?.matches,
    snapshot?.localHistory,
  ];
  for (const candidate of candidates) {
    const rows = detailRows(candidate).filter((row) => row && typeof row === "object");
    if (rows.length) return rows;
  }
  return [];
}

function detailCollectionLength(value: any): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

function detailTelemetry(match: any): { usable: boolean; visits: number; darts: number } {
  const sources = [match, match?.summary, match?.stats, match?.game, match?.resume, match?.__legStats, match?.telemetry]
    .filter((value) => value && typeof value === "object");
  let visits = 0;
  let darts = 0;
  let usable = false;
  const seen = new Set<any>();
  for (const source of sources) {
    if (seen.has(source)) continue;
    seen.add(source);
    visits = Math.max(
      visits,
      detailCollectionLength(source.visitHistory),
      detailCollectionLength(source.visitsHistory),
      detailCollectionLength(source.visits),
      detailCollectionLength(source.volleys),
      detailCollectionLength(source.vollees),
      detailCollectionLength(source.rounds),
      detailCollectionLength(source.turns),
    );
    darts = Math.max(
      darts,
      detailCollectionLength(source.dartsDetail),
      detailCollectionLength(source.darts),
      detailCollectionLength(source.throws),
      detailCollectionLength(source.hits),
      detailCollectionLength(source.dartHits),
    );
    if (Object.keys(source).some((key) => /avg|average|checkout|bestvisit|hitsbysegment|dartdetail|visit|volley|volee|throw|bull|double|triple/i.test(key))) {
      usable = true;
    }
  }
  if (visits > 0 || darts > 0) usable = true;
  if (!darts && visits) darts = visits * 3;
  return { usable, visits, darts };
}

function cleanDetailLabel(value: any, fallback: string): string {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .slice(0, 72);
}

function inferDetailSport(match: any): string {
  const raw = match?.sport || match?.game?.sport || match?.category || match?.gameCategory || "";
  if (raw) return cleanDetailLabel(raw, "Autres jeux");
  const mode = String(match?.mode || match?.gameMode || match?.kind || match?.game?.mode || "").toLowerCase();
  if (/x01|cricket|killer|shanghai|golf|loterie|territor|dart|halve|scram|five|5.?vie|capital|racer|baseball|shooter/.test(mode)) return "Fléchettes";
  if (/petanque|pétanque/.test(mode)) return "Pétanque";
  if (/molkky|mölkky/.test(mode)) return "Mölkky";
  if (/baby.?foot|foosball/.test(mode)) return "Baby-foot";
  if (/ping.?pong|table.?tennis/.test(mode)) return "Ping-pong";
  if (/football|soccer|foot/.test(mode)) return "Football";
  return "Autres jeux";
}

function inferDetailMode(match: any): string {
  return cleanDetailLabel(
    match?.mode || match?.gameMode || match?.kind || match?.game?.mode || match?.game?.kind || match?.variant,
    "Mode non renseigné",
  );
}

function sourceLabelForEntry(entry: SaveEntry): string {
  if (entry.source === "nas") return "NAS privé";
  if (entry.source === "cloud") return "Cloud R2";
  if (entry.source === "file") return "Fichier externe";
  return "Mémoire de l’appareil";
}

function buildBackupDetails(entry: SaveEntry, payloadInput: any): BackupDetails {
  const payload = unwrapSnapshotEnvelope(payloadInput);
  const summary = normalizeSummary(strictSummaryForRestore(payload, entry.summary));
  const portable = payload?.portableAccountData && typeof payload.portableAccountData === "object"
    ? payload.portableAccountData
    : {};
  const counts = portable?.counts && typeof portable.counts === "object" ? portable.counts : {};
  const store = payload?.store && typeof payload.store === "object"
    ? payload.store
    : payload?.data && typeof payload.data === "object"
      ? payload.data
      : {};
  const history = historyRowsForDetails(payload);
  const sportMap = new Map<string, Map<string, number>>();
  let statsMatches = 0;
  let visits = 0;
  let darts = 0;

  for (const match of history) {
    const sport = inferDetailSport(match);
    const mode = inferDetailMode(match);
    if (!sportMap.has(sport)) sportMap.set(sport, new Map());
    const modes = sportMap.get(sport)!;
    modes.set(mode, (modes.get(mode) || 0) + 1);
    const telemetry = detailTelemetry(match);
    if (telemetry.usable) statsMatches += 1;
    visits += telemetry.visits;
    darts += telemetry.darts;
  }

  const sports = Array.from(sportMap.entries())
    .map(([sport, modes]) => {
      const modeRows = Array.from(modes.entries())
        .map(([mode, count]) => ({ mode, count }))
        .sort((a, b) => b.count - a.count || a.mode.localeCompare(b.mode, "fr"));
      return { sport, count: modeRows.reduce((sum, row) => sum + row.count, 0), modes: modeRows };
    })
    .sort((a, b) => b.count - a.count || a.sport.localeCompare(b.sport, "fr"));

  const fallbackImages = n(summary.images || (summary.mediaRefs + summary.dataImages));
  const userMediaCount = payload?.userMediaFallbacks?.media && typeof payload.userMediaFallbacks.media === "object"
    ? Object.keys(payload.userMediaFallbacks.media).length
    : 0;
  const avatarFallbackCount = payload?.avatarFallbacks?.profiles && typeof payload.avatarFallbacks.profiles === "object"
    ? Object.keys(payload.avatarFallbacks.profiles).length
    : 0;
  const images = Math.max(fallbackImages, userMediaCount + avatarFallbackCount, n(counts.galleryItems));
  const profiles = Math.max(summary.profiles, n(counts.profiles), detailCollectionLength(portable.profiles), detailCollectionLength(store.profiles), detailCollectionLength(payload?.localProfiles));
  const teams = Math.max(n(summary.teams), n(counts.teams), detailCollectionLength(portable.teams), detailCollectionLength(store.teams), detailCollectionLength(payload?.teams));
  const bots = Math.max(n(summary.bots), n(counts.bots), detailCollectionLength(portable.bots), detailCollectionLength(store.bots), detailCollectionLength(store.cpuBots), detailCollectionLength(payload?.bots));
  const dartsets = Math.max(n(summary.dartsets), n(counts.dartSets || counts.dartsets), detailCollectionLength(portable.dartSets), detailCollectionLength(portable.dartsets), detailCollectionLength(store.dartSets), detailCollectionLength(store.dartsets), detailCollectionLength(payload?.dartsets));
  const resolvedStatsMatchesRaw = Math.max(statsMatches, n(summary.statsMatches || summary.statsBlocks));
  const resolvedStatsMatches = history.length > 0
    ? Math.min(resolvedStatsMatchesRaw, history.length)
    : resolvedStatsMatchesRaw;
  const resolvedDate = entry.createdAt || entry.updatedAt || summary.exportedAt || payload?.exportedAt || portable?.exportedAt || null;
  const appVersion = payload?.appVersion || payload?.app_version || payload?.meta?.appVersion || null;
  const rawFormat = payload?._v ?? payload?.version ?? payload?.formatVersion ?? null;

  return {
    date: resolvedDate ? String(resolvedDate) : null,
    sizeBytes: Math.max(summary.bytes, n(entry.summary.bytes)),
    matches: history.length > 0 ? history.length : summary.matches,
    profiles,
    statsMatches: resolvedStatsMatches,
    images,
    teams,
    bots,
    dartsets,
    visits: Math.max(visits, n(summary.visits)),
    darts: Math.max(darts, n(summary.darts)),
    sports,
    sourceLabel: sourceLabelForEntry(entry),
    appVersion: appVersion ? String(appVersion) : null,
    formatVersion: rawFormat == null ? null : String(rawFormat),
    integrityLabel: entry.quality.restorable ? entry.quality.label : "SAUVEGARDE PARTIELLE",
  };
}

function summaryWithBackupDetails(summaryInput: Partial<VaultSummary> | null | undefined, details: BackupDetails): VaultSummary {
  const summary = normalizeSummary(summaryInput || {});
  return {
    ...summary,
    bytes: Math.max(summary.bytes, details.sizeBytes),
    profiles: Math.max(summary.profiles, details.profiles),
    matches: details.matches > 0 ? details.matches : summary.matches,
    historyRows: details.matches > 0 ? details.matches : summary.historyRows,
    statsMatches: details.matches > 0
      ? Math.min(details.statsMatches, details.matches)
      : Math.max(n(summary.statsMatches), details.statsMatches),
    statsBlocks: details.matches > 0
      ? Math.min(details.statsMatches, details.matches)
      : Math.max(summary.statsBlocks, details.statsMatches),
    images: Math.max(n(summary.images), details.images),
    teams: Math.max(n(summary.teams), details.teams),
    bots: Math.max(n(summary.bots), details.bots),
    dartsets: Math.max(n(summary.dartsets), details.dartsets),
    visits: Math.max(n(summary.visits), details.visits),
    darts: Math.max(n(summary.darts), details.darts),
    sports: details.sports.length ? details.sports.map((row) => row.sport) : summary.sports,
  };
}

function assessSave(summary?: Partial<VaultSummary> | null): SaveQuality {
  const s = normalizeSummary(summary || {});
  const probable = s.probableContent.map((x) => x.toLowerCase()).join(" ");
  const isCatalog = probable.includes("catalogue");
  const hasHistory = s.historyRows > 0 || probable.includes("historique réel");
  const hasStats = s.statsBlocks > 0;
  const hasProfiles = s.profiles > 0;
  const hasSports = s.sports.length > 0;
  const hasPayloadSize = s.bytes > 25_000 || s.keys > 20;

  const score =
    Math.min(45, s.historyRows * 8) +
    Math.min(20, hasStats ? s.statsBlocks * 2 : 0) +
    (hasProfiles ? 14 : 0) +
    (hasSports ? 8 : 0) +
    (hasPayloadSize ? 5 : 0);

  if (isCatalog) {
    return {
      grade: "technical",
      label: "CATALOGUE TECHNIQUE",
      short: "Non restaurable",
      color: muted,
      score: 0,
      restorable: false,
      reason: "Catalogue de blocs seulement : pas de vraies parties à restaurer.",
    };
  }

  if (hasHistory && hasProfiles && hasStats && hasSports) {
    return {
      grade: "complete",
      label: "SAUVEGARDE COMPLÈTE",
      short: "Complet",
      color: green,
      score: Math.max(92, score),
      restorable: true,
      reason: "Vraies lignes d’historique + profils + stats détectés.",
    };
  }

  if (hasHistory && (hasProfiles || hasSports || hasStats)) {
    return {
      grade: "history",
      label: "PARTIES / HISTORIQUE",
      short: "Parties",
      color: gold,
      score: Math.max(68, score),
      restorable: true,
      reason: "Historique réel détecté, mais le bloc semble moins complet.",
    };
  }

  if (hasStats) {
    return {
      grade: "stats-only",
      label: "STATS SEULES",
      short: "Stats seules",
      color: amber,
      score: Math.max(42, score),
      restorable: false,
      reason: "Stats détectées, mais pas assez d'historique pour recréer les cartes de parties.",
    };
  }

  if (hasProfiles) {
    return {
      grade: "profiles-only",
      label: "PROFILS SEULS",
      short: "Profils",
      color: neon,
      score: Math.max(25, score),
      restorable: false,
      reason: "Profils détectés, mais pas de parties exploitables.",
    };
  }

  return {
    grade: "technical",
    label: "TECHNIQUE",
    short: "Technique",
    color: muted,
    score,
    restorable: false,
    reason: "Bloc interne ou incomplet : masqué pour éviter une mauvaise restauration.",
  };
}

function isRestorable(summary?: Partial<VaultSummary> | null) {
  return assessSave(summary).restorable;
}

function fmtBytes(bytes?: number | null) {
  const b = n(bytes);
  if (!b) return "—";
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} ko`;
  return `${(b / 1024 / 1024).toFixed(2)} Mo`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR");
}

function localDateKey(value?: string | number | null): string {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function blockContainsExpertDate(block: StorageBlock, dateKey: string): boolean {
  if (!dateKey) return true;
  const summary = normalizeSummary(block.summary);
  const fromKey = localDateKey(summary.matchFrom);
  const toKey = localDateKey(summary.matchTo);
  if (fromKey && toKey && dateKey >= fromKey && dateKey <= toKey) return true;
  if (fromKey === dateKey || toKey === dateKey) return true;
  return localDateKey(block.updatedAt || block.createdAt || null) === dateKey;
}

function normalizeExpertQuery(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expertSearchTerms(query: string): string[] {
  return Array.from(new Set(normalizeExpertQuery(query).split(" ").filter((term) => term.length > 0)));
}

function expertBlockMetadataText(block: StorageBlock): string {
  const summary = normalizeSummary(block.summary);
  return normalizeExpertQuery([
    block.id,
    block.source,
    block.title,
    block.subtitle,
    block.location,
    block.dbName,
    block.storeName,
    block.key,
    block.updatedAt,
    block.createdAt,
    summary.matchFrom,
    summary.matchTo,
    summary.exportedAt,
    ...(summary.sports || []),
    ...(summary.names || []),
    ...(summary.probableContent || []),
  ].filter(Boolean).join(" "));
}

function blockContainsExpertSearch(block: StorageBlock, query: string): boolean {
  const terms = expertSearchTerms(query);
  if (!terms.length) return true;
  const metadata = expertBlockMetadataText(block);
  const index = `${metadata} ${block.searchIndex || ""}`;
  return terms.every((term) => index.includes(term));
}

function expertBlockSearchScore(block: StorageBlock, query: string): number {
  const terms = expertSearchTerms(query);
  if (!terms.length) return 0;
  const metadata = expertBlockMetadataText(block);
  const title = normalizeExpertQuery(`${block.title} ${block.subtitle || ""} ${block.key || ""} ${block.location}`);
  const summary = normalizeSummary(block.summary);
  const important = normalizeExpertQuery(`${(summary.names || []).join(" ")} ${(summary.sports || []).join(" ")} ${summary.matchFrom || ""} ${summary.matchTo || ""}`);
  const index = block.searchIndex || "";
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 80;
    if (important.includes(term)) score += 45;
    if (metadata.includes(term)) score += 20;
    if (index.includes(term)) score += 8;
  }
  const full = normalizeExpertQuery(query);
  if (full && title.includes(full)) score += 120;
  else if (full && important.includes(full)) score += 70;
  else if (full && index.includes(full)) score += 25;
  return score;
}

function join(values?: string[], fallback = "—") {
  const list = Array.isArray(values) ? values.filter(Boolean).slice(0, 10) : [];
  return list.length ? list.join(", ") : fallback;
}

function saveCategory(summary: Partial<VaultSummary>) {
  const s = normalizeSummary(summary);
  const sports = s.sports.map((x) => x.toLowerCase());
  const probable = s.probableContent.map((x) => x.toLowerCase()).join(" ");
  if (sports.some((x) => /baby|foot|foos/.test(x))) return "Baby-foot";
  if (probable.includes("tournoi") || probable.includes("ligue") || probable.includes("compétition") || probable.includes("competition")) return "Compétitions";
  if (sports.some((x) => /x01|dart|cricket|killer|golf|shanghai|scram|warfare|territories|capital/.test(x))) return "Fléchettes";
  if (sports.length > 1) return "Multi-sports";
  return "Jeux";
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "18px 10px 96px",
  color: "#e5e7eb",
  background: "radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--dc-accent, #d9ff33) 14%, transparent), transparent 34%), radial-gradient(circle at 85% 12%, color-mix(in srgb, var(--dc-accent-soft, #22d3ee) 10%, transparent), transparent 32%), #020617",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const shellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 980,
  margin: "0 auto",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const panel: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(15,23,42,.94), rgba(2,6,23,.96))",
  border: "1px solid color-mix(in srgb, var(--dc-accent, #d9ff33) 20%, transparent)",
  borderRadius: 20,
  boxShadow: "0 0 28px color-mix(in srgb, var(--dc-accent, #d9ff33) 8%, transparent)",
  padding: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
};

const wrapText: React.CSSProperties = {
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const btn: React.CSSProperties = {
  border: `1px solid ${neon}`,
  color: neon,
  background: "color-mix(in srgb, var(--dc-accent-soft, #22d3ee) 10%, transparent)",
  borderRadius: 14,
  padding: "10px 12px",
  fontWeight: 1000,
  fontSize: 12,
  cursor: "pointer",
  minWidth: 0,
  maxWidth: "100%",
  whiteSpace: "normal",
};

const primaryBtn: React.CSSProperties = {
  ...btn,
  borderColor: gold,
  color: "#08111f",
  background: `linear-gradient(180deg, ${gold}, #b8ef19)`,
  boxShadow: "0 0 18px color-mix(in srgb, var(--dc-accent, #d9ff33) 24%, transparent)",
};

const dangerBtn: React.CSSProperties = {
  ...btn,
  borderColor: red,
  color: red,
  background: "rgba(251,113,133,.10)",
};

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      style={{
        ...btn,
        borderColor: active ? gold : "rgba(148,163,184,.24)",
        color: active ? gold : "#d1d5db",
        background: active ? "color-mix(in srgb, var(--dc-accent, #d9ff33) 13%, transparent)" : "rgba(15,23,42,.62)",
        boxShadow: active ? "0 0 18px color-mix(in srgb, var(--dc-accent, #d9ff33) 22%, transparent)" : "none",
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatBox({ label, value, color = gold }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ ...panel, borderRadius: 16, padding: 12, minHeight: 70 }}>
      <div style={{ color: muted, fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: 25, lineHeight: 1.1, fontWeight: 1000, marginTop: 5 }}>{value}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "98px minmax(0,1fr)", gap: 10, alignItems: "start", minWidth: 0 }}>
      <span style={{ color: muted, fontSize: 12, fontWeight: 800 }}>{label}</span>
      <strong style={{ color: "#f8fafc", fontSize: 12, textAlign: "right", ...wrapText }}>{value}</strong>
    </div>
  );
}

function QualityBadge({ quality }: { quality: SaveQuality }) {
  return (
    <span style={{ border: `1px solid ${quality.color}`, color: quality.color, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 1000, whiteSpace: "nowrap" }}>
      {quality.short}
    </span>
  );
}

function SummaryLines({ summary }: { summary: Partial<VaultSummary> }) {
  const s = normalizeSummary(summary);
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 0 }}>
      <Line label="Parties" value={s.matches} />
      <Line label="Profils" value={s.profiles} />
      <Line label="Stats" value={`${s.statsMatches || s.statsBlocks} partie(s) exploitable(s)`} />
      <Line label="Médias" value={s.images || (s.mediaRefs + s.dataImages)} />
      <Line label="Taille" value={fmtBytes(s.bytes)} />
    </div>
  );
}

function MiniInfoButton({ title, content, color = neon }: { title: string; content: React.ReactNode; color?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); setOpen(true); }}
        aria-label={`Informations : ${title}`}
        title="Informations"
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.18)",
          background: "rgba(255,255,255,.06)",
          color: "#fff",
          fontWeight: 1000,
          fontSize: 14,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 12px color-mix(in srgb, ${color} 24%, rgba(0,0,0,.55))`,
          cursor: "pointer",
          flex: "0 0 auto",
        }}
      >i</button>
      {open ? (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.76)", display: "grid", placeItems: "center", padding: 18 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(520px, 100%)", maxHeight: "78vh", overflowY: "auto", borderRadius: 20, border: `1px solid ${color}`, background: "linear-gradient(180deg,#0f172a,#020617)", boxShadow: `0 0 32px color-mix(in srgb, ${color} 28%, transparent)`, padding: 16 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <strong style={{ color, fontSize: 18, ...wrapText }}>{title}</strong>
              <button type="button" onClick={() => setOpen(false)} style={{ ...btn, width: 38, height: 38, padding: 0, borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,.24)" }}>×</button>
            </div>
            <div style={{ color: "#dbe5f1", fontSize: 13, lineHeight: 1.5 }}>{content}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SaveCard({ entry, busy, onDetails, onRestore, onExport, onDelete, onCloudCopy, restoreLabel = "Restaurer", exportLabel = "Exporter", deleteLabel = "Supprimer", cloudCopyLabel = "Copier vers Cloud R2" }: {
  entry: SaveEntry;
  busy: boolean;
  onDetails: () => void;
  onRestore: () => void;
  onExport: () => void;
  onDelete?: () => void;
  onCloudCopy?: () => void;
  restoreLabel?: string;
  exportLabel?: string;
  deleteLabel?: string;
  cloudCopyLabel?: string;
}) {
  const q = entry.quality;
  const s = normalizeSummary(entry.summary);
  const sourceIcon: VaultGlyphName = entry.source === "nas" ? "nas" : entry.source === "cloud" ? "cloud" : entry.source === "file" ? "file" : "local";
  const sourceLabel = sourceLabelForEntry(entry);
  const dateValue = entry.createdAt || entry.updatedAt || s.exportedAt || null;
  return (
    <div style={{ ...panel, padding: 13, borderColor: q.restorable ? "rgba(52,211,153,.38)" : "rgba(251,191,36,.28)", overflow: "visible" }}>
      <div style={{ display: "grid", gridTemplateColumns: "50px minmax(0,1fr) auto", gap: 10, alignItems: "center", minWidth: 0 }}>
        <div style={{ width: 48, height: 48, borderRadius: 15, display: "grid", placeItems: "center", border: `1px solid ${q.color}`, background: `color-mix(in srgb, ${q.color} 11%, transparent)`, color: q.color, boxShadow: `0 0 18px color-mix(in srgb, ${q.color} 24%, transparent)` }}>
          <VaultGlyph name={sourceIcon} size={27}/>
        </div>
        <div style={wrapText}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ color: "#fff", fontSize: 15.5, ...wrapText }}>{entry.title}</strong>
            <QualityBadge quality={q}/>
          </div>
          <div style={{ color: muted, fontSize: 10.5, fontWeight: 800, marginTop: 4 }}>{sourceLabel} · {fmtDate(dateValue)} · {fmtBytes(s.bytes)}</div>
          <div style={{ color: q.color, fontSize: 11, fontWeight: 900, marginTop: 4 }}>{q.label}</div>
        </div>
        <button type="button" onClick={onDetails} disabled={busy} style={{ ...btn, minWidth: 42, height: 42, padding: 0, borderRadius: 13, display: "grid", placeItems: "center", borderColor: "rgba(148,163,184,.38)", color: "#fff" }} aria-label="Afficher les détails">
          <VaultGlyph name="expert" size={22}/>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
        {[
          ["PARTIES", s.matches, gold],
          ["PROFILS", s.profiles, neon],
          ["STATS", s.statsMatches || s.statsBlocks, green],
        ].map(([label, value, color]) => (
          <div key={String(label)} style={{ border: "1px solid rgba(148,163,184,.18)", borderRadius: 14, padding: "9px 7px", textAlign: "center", background: "rgba(2,6,23,.62)" }}>
            <div style={{ color: muted, fontSize: 9.5, fontWeight: 1000 }}>{label}</div>
            <div style={{ color: String(color), fontSize: 20, lineHeight: 1.15, fontWeight: 1000, marginTop: 3 }}>{String(value)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button style={q.restorable ? primaryBtn : { ...btn, borderColor: muted, color: muted }} disabled={busy || !q.restorable} onClick={onRestore}>{restoreLabel}</button>
        <button style={btn} disabled={busy} onClick={onExport}>{exportLabel}</button>
        {onCloudCopy ? <button style={{ ...btn, borderColor: gold, color: gold }} disabled={busy} onClick={onCloudCopy}>{cloudCopyLabel}</button> : null}
        {onDelete ? <button style={dangerBtn} disabled={busy} onClick={onDelete}>{deleteLabel}</button> : null}
      </div>
    </div>
  );
}

function BackupDetailsModal({ state, onClose }: { state: { entry: SaveEntry; details?: BackupDetails | null; loading: boolean; error?: string | null } | null; onClose: () => void }) {
  if (!state) return null;
  const details = state.details;
  const date = details?.date ? new Date(details.date) : null;
  const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
  const containsDarts = !!details && (details.dartsets > 0 || details.sports.some((row) => /fléchettes|darts/i.test(row.sport)));
  const mainRows: Array<[string, React.ReactNode]> = details ? [
    ["Date", validDate ? validDate.toLocaleDateString("fr-FR") : "—"],
    ["Heure", validDate ? validDate.toLocaleTimeString("fr-FR") : "—"],
    ["Taille", fmtBytes(details.sizeBytes)],
    ["Parties", details.matches],
    ["Profils", details.profiles],
    ["Images / médias", details.images],
    ["Équipes / teams", details.teams],
    ["Bots", details.bots],
    ...(containsDarts ? [["Dartsets", details.dartsets] as [string, React.ReactNode]] : []),
    ["Parties avec stats", details.statsMatches],
    ["Volées / tours", details.visits || "—"],
    ["Fléchettes / saisies", details.darts || "—"],
  ] : [];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(0,0,0,.82)", display: "grid", alignItems: "end", justifyItems: "center", padding: "18px 10px max(18px, env(safe-area-inset-bottom))" }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(680px,100%)", maxHeight: "88vh", overflowY: "auto", borderRadius: 24, border: `1px solid ${neon}`, background: "linear-gradient(180deg,#0f172a,#020617)", boxShadow: `0 0 36px ${accentSoftGlow}`, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
          <div style={wrapText}>
            <div style={{ color: neon, fontSize: 11, fontWeight: 1000, letterSpacing: ".08em" }}>DÉTAILS DE LA SAUVEGARDE</div>
            <strong style={{ color: "#fff", fontSize: 20, display: "block", marginTop: 4 }}>{state.entry.title}</strong>
            <div style={{ color: muted, fontSize: 11, marginTop: 3 }}>{details?.sourceLabel || sourceLabelForEntry(state.entry)}</div>
          </div>
          <button type="button" onClick={onClose} style={{ ...btn, width: 42, height: 42, padding: 0, borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,.24)", fontSize: 22 }}>×</button>
        </div>

        {state.loading ? <div style={{ ...panel, marginTop: 14, textAlign: "center", color: neon }}>Lecture et analyse de la sauvegarde…</div> : null}
        {state.error ? <div style={{ ...panel, marginTop: 14, color: red }}>{state.error}</div> : null}
        {details ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 14 }}>
              {mainRows.map(([label, value]) => (
                <div key={label} style={{ border: "1px solid rgba(148,163,184,.18)", borderRadius: 14, padding: 10, background: "rgba(2,6,23,.62)" }}>
                  <div style={{ color: muted, fontSize: 9.5, fontWeight: 1000, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ color: "#fff", fontSize: 17, fontWeight: 1000, marginTop: 4, ...wrapText }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ ...panel, marginTop: 12, padding: 12 }}>
              <div style={{ color: gold, fontWeight: 1000, fontSize: 15 }}>RÉPARTITION PAR SPORT ET MODE</div>
              {details.sports.length ? details.sports.map((sport) => (
                <details key={sport.sport} open={details.sports.length <= 3} style={{ marginTop: 10, border: "1px solid rgba(148,163,184,.18)", borderRadius: 13, padding: 10, background: "rgba(15,23,42,.55)" }}>
                  <summary style={{ cursor: "pointer", color: "#fff", fontWeight: 1000 }}>{sport.sport} — {sport.count} partie(s)</summary>
                  <div style={{ display: "grid", gap: 6, marginTop: 9 }}>
                    {sport.modes.map((mode) => <Line key={`${sport.sport}:${mode.mode}`} label={mode.mode} value={mode.count}/>) }
                  </div>
                </details>
              )) : <div style={{ color: muted, marginTop: 10 }}>Aucune répartition sport/mode exploitable dans ce format de sauvegarde.</div>}
            </div>

            <div style={{ ...panel, marginTop: 12, padding: 12 }}>
              <Line label="Intégrité" value={details.integrityLabel}/>
              <Line label="Version app" value={details.appVersion || "—"}/>
              <Line label="Format" value={details.formatVersion || "—"}/>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function DestinationSetupModal({ destination, status, busy, onClose, onChoose }: {
  destination: ReturnType<typeof getStorageDestination> | null;
  status: ExternalBackupStatus;
  busy: boolean;
  onClose: () => void;
  onChoose: () => void;
}) {
  if (!destination) return null;
  const cloudNas = destination.id === "personal_cloud_manual";
  const external = destination.id === "external_sd_manual";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1450, background: "rgba(0,0,0,.82)", display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "86vh", overflowY: "auto", borderRadius: 22, border: `1px solid ${gold}`, background: "linear-gradient(180deg,#0f172a,#020617)", boxShadow: `0 0 34px ${accentGlow}`, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", border: `1px solid ${gold}`, color: gold, background: accentSoftBg }}><StorageDestinationIcon id={destination.id} size={28}/></div>
          <div style={wrapText}>
            <div style={{ color: muted, fontSize: 10, fontWeight: 1000 }}>CONFIGURER LA DESTINATION</div>
            <strong style={{ color: "#fff", fontSize: 18 }}>{destination.label}</strong>
          </div>
          <button type="button" onClick={onClose} style={{ ...btn, width: 40, height: 40, padding: 0, borderRadius: 999, color: "#fff", borderColor: "rgba(255,255,255,.24)", fontSize: 21 }}>×</button>
        </div>

        <div style={{ ...panel, marginTop: 14, padding: 12 }}>
          <div style={{ color: "#dbe5f1", lineHeight: 1.5, fontSize: 13 }}>{destination.description}</div>
          {destination.warning ? <div style={{ color: amber, marginTop: 9, lineHeight: 1.45, fontSize: 12 }}>{destination.warning}</div> : null}
        </div>

        {cloudNas ? (
          <div style={{ ...panel, marginTop: 10, padding: 12 }}>
            <div style={{ color: neon, fontWeight: 1000 }}>COMMENT UTILISER TON CLOUD OU TON NAS</div>
            <div style={{ display: "grid", gap: 7, marginTop: 9, color: "#dbe5f1", fontSize: 12.5, lineHeight: 1.45 }}>
              <div>1. Ajoute Google Drive, OneDrive, Dropbox, Nextcloud, Synology Drive ou QNAP dans le gestionnaire de fichiers de l’appareil.</div>
              <div>2. Pour un NAS, monte son partage réseau ou utilise l’application du constructeur afin qu’il apparaisse dans le sélecteur système.</div>
              <div>3. Choisis ensuite le fichier de sauvegarde ici. Aucun mot de passe de ton NAS n’est transmis à MULTISPORTS SCORING.</div>
            </div>
          </div>
        ) : null}

        {external ? (
          <div style={{ ...panel, marginTop: 10, padding: 12, color: "#dbe5f1", fontSize: 12.5, lineHeight: 1.45 }}>
            La carte SD, la clé USB ou le disque doit être reconnu par Android/Windows. Il apparaîtra alors directement dans le sélecteur de fichiers.
          </div>
        ) : null}

        <div style={{ ...panel, marginTop: 10, padding: 12, borderColor: status.configured ? "rgba(52,211,153,.38)" : "rgba(148,163,184,.22)" }}>
          <div style={{ color: status.configured ? green : amber, fontWeight: 1000 }}>{status.configured ? "EMPLACEMENT PRÊT" : "EMPLACEMENT NON CHOISI"}</div>
          <div style={{ color: "#fff", marginTop: 5, ...wrapText }}>{status.fileName || "Aucun fichier mémorisé"}</div>
          {!status.supported ? <div style={{ color: muted, fontSize: 11.5, marginTop: 7 }}>Sur cet appareil, le choix final sera proposé par Android ou le navigateur au moment de l’export.</div> : null}
        </div>

        <button type="button" disabled={busy} onClick={onChoose} style={{ ...primaryBtn, width: "100%", minHeight: 54, marginTop: 12, fontSize: 13.5 }}>
          {busy ? "OUVERTURE DU SÉLECTEUR…" : status.configured ? "CHANGER L’EMPLACEMENT" : "CHOISIR L’EMPLACEMENT"}
        </button>
        <button type="button" onClick={onClose} style={{ ...btn, width: "100%", marginTop: 8, color: "#fff", borderColor: "rgba(148,163,184,.28)" }}>Conserver ce réglage et revenir</button>
      </div>
    </div>
  );
}

function MatchBackupCard({ item, busy, onRestore, onExport, onDelete }: {
  item: MatchBackupItem;
  busy: boolean;
  onRestore: () => void;
  onExport: () => void;
  onDelete?: () => void;
}) {
  const players = Array.isArray(item.players) ? item.players : [];
  const names = players
    .map((p: any) => String(p?.name || p?.displayName || p?.nickname || p?.id || "").trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" · ");
  const origin = item.origin === "nas" ? "NAS" : item.origin === "cloud" ? "CLOUD" : "LOCAL";
  const originColor = item.origin === "nas" ? neon : item.origin === "cloud" ? gold : green;
  const when = item.updatedAt || item.createdAt || Date.parse(item.savedAt || "") || 0;
  return (
    <div style={{ ...panel, borderColor: "rgba(52,211,153,.38)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "54px minmax(0,1fr) auto", gap: 12, alignItems: "center", minWidth: 0 }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          background: "color-mix(in srgb, var(--dc-accent-soft, #22d3ee) 14%, transparent)",
          border: `1px solid ${originColor}`,
          color: originColor,
          fontWeight: 1000,
          boxShadow: `0 0 18px color-mix(in srgb, ${originColor} 28%, transparent)`,
        }}>{origin}</div>
        <div style={wrapText}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ color: "#fff", fontSize: 16, ...wrapText }}>{item.title || "Partie sauvegardée"}</strong>
            <span style={{ border: `1px solid ${green}`, color: green, borderRadius: 999, padding: "4px 8px", fontSize: 10, fontWeight: 1000 }}>RESTAURABLE</span>
          </div>
          <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 4, ...wrapText }}>
            {String(item.sport || "darts")} • {String(item.kind || "match")} • {fmtDate(when)}
          </div>
          <div style={{ color: neon, fontSize: 12, fontWeight: 900, marginTop: 6, ...wrapText }}>
            {names || "Joueurs détectés dans le détail"}
          </div>
        </div>
        <div style={{ color: gold, fontWeight: 1000, fontSize: 13, textAlign: "right" }}>{fmtBytes(item.payloadBytes || 0)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
        <div style={{ ...panel, borderRadius: 14, padding: 10 }}>
          <div style={{ color: muted, fontSize: 10, fontWeight: 900 }}>JOUEURS</div>
          <div style={{ color: gold, fontWeight: 1000, fontSize: 18 }}>{players.length || "—"}</div>
        </div>
        <div style={{ ...panel, borderRadius: 14, padding: 10 }}>
          <div style={{ color: muted, fontSize: 10, fontWeight: 900 }}>VAINQUEUR</div>
          <div style={{ color: green, fontWeight: 1000, fontSize: 18 }}>{item.winnerId ? "OK" : "—"}</div>
        </div>
        <div style={{ ...panel, borderRadius: 14, padding: 10 }}>
          <div style={{ color: muted, fontSize: 10, fontWeight: 900 }}>DÉTAIL</div>
          <div style={{ color: neon, fontWeight: 1000, fontSize: 18 }}>{item.payloadCompressed || item.origin === "nas" || item.origin === "cloud" ? "OK" : "—"}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button style={primaryBtn} disabled={busy || !item.matchId} onClick={onRestore}>Restaurer cette partie</button>
        <button style={btn} disabled={busy} onClick={onExport}>Exporter JSON</button>
        {onDelete && <button style={dangerBtn} disabled={busy} onClick={onDelete}>Supprimer</button>}
      </div>
    </div>
  );
}

function TechnicalBlockCard({ block, busy, onExport }: {
  block: StorageBlock;
  busy: boolean;
  onExport: () => void;
}) {
  const summary = normalizeSummary(block.summary);
  const q = assessSave(summary);
  return (
    <div style={{ ...panel, borderColor: "rgba(148,163,184,.18)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, minWidth: 0 }}>
        <div style={wrapText}>
          <strong style={{ color: "#fff", fontSize: 14, ...wrapText }}>{block.title}</strong>
          <div style={{ color: muted, fontSize: 11, marginTop: 3, ...wrapText }}>{block.subtitle || block.location}</div>
        </div>
        <QualityBadge quality={q} />
      </div>
      <div style={{ display: "grid", gap: 6, marginTop: 10, padding: 10, borderRadius: 13, border: "1px solid rgba(251,191,36,.24)", background: "rgba(251,191,36,.05)" }}>
        <Line label="Date du bloc" value={fmtDate(block.updatedAt || block.createdAt || null)} />
        <Line label="Parties du" value={summary.matchFrom ? fmtDate(summary.matchFrom) : "Date non détectée"} />
        <Line label="Parties au" value={summary.matchTo ? fmtDate(summary.matchTo) : "Date non détectée"} />
        <Line label="X01 détectées" value={summary.x01Matches || 0} />
        {summary.sports.length ? <Line label="Modes" value={join(summary.sports)} /> : null}
        {summary.names.length ? <Line label="Joueurs" value={join(summary.names)} /> : null}
      </div>
      <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 8, ...wrapText }}>
        Bloc brut détecté pour diagnostic. Utilise surtout les dates ci-dessus pour retrouver la bonne période avant d’exporter quoi que ce soit.
      </div>
      <div style={{ marginTop: 10 }}>
        <SummaryLines summary={summary} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button style={btn} disabled={busy} onClick={onExport}>Exporter bloc</button>
      </div>
    </div>
  );
}

async function pushSnapshotToAccount(payload: any, reason: string) {
  const snapshot = unwrapSnapshotEnvelope(payload);
  const version = Number(snapshot?._v || snapshot?.v || 2) || 2;
  return apiPost("/sync/push", { payload: snapshot, version, reason });
}

type PreparedBackupKind = "full" | "cloud-fast";

type PreparedBackup = {
  kind: PreparedBackupKind;
  revision: number;
  snapshot: any;
  snapshotJson: string;
  summary: VaultSummary;
  bytes: number;
  preparedAt: number;
  gzipPromise?: Promise<Uint8Array>;
};

let preparedBackupRevision = 1;
const preparedBackupInFlight = new Map<PreparedBackupKind, Promise<PreparedBackup>>();
const preparedBackupCache = new Map<PreparedBackupKind, PreparedBackup>();
let preparedBackupInvalidationInstalled = false;

function installPreparedBackupInvalidation(): void {
  if (preparedBackupInvalidationInstalled || typeof window === "undefined") return;
  preparedBackupInvalidationInstalled = true;
  const invalidate = () => {
    preparedBackupRevision += 1;
    preparedBackupCache.clear();
  };
  [
    "dc-history-updated",
    "dc-store-updated",
    "dc-dartsets-updated",
    "dc-teams-updated",
    "dc:bots-changed",
    "dc:profiles-changed",
  ].forEach((eventName) => window.addEventListener(eventName, invalidate as EventListener, { passive: true }));
}

installPreparedBackupInvalidation();

async function prepareCurrentBackupOnce(kind: PreparedBackupKind = "full"): Promise<PreparedBackup> {
  const inFlight = preparedBackupInFlight.get(kind);
  if (inFlight) return inFlight;

  const cached = preparedBackupCache.get(kind);
  if (cached && cached.revision === preparedBackupRevision && Date.now() - cached.preparedAt < 90_000) return cached;

  const revisionAtStart = preparedBackupRevision;
  const promise = (async () => {
    const exportOptions = kind === "cloud-fast"
      ? { mediaMirror: "background" as const, includeEmbeddedMedia: false, includeAvatarFallbacks: false }
      : { mediaMirror: "skip" as const, includeEmbeddedMedia: true, includeAvatarFallbacks: true };
    const snapshot = normalizeCloudPayload(unwrapSnapshotEnvelope(await exportCloudSnapshot(exportOptions)));
    if (!looksLikeCloudSnapshot(snapshot) && !looksLikeCloudBackupV1(snapshot)) {
      throw new Error("L’état courant ne contient pas une sauvegarde Multisports exploitable.");
    }
    const summary = strictSummaryForRestore(snapshot);
    const snapshotJson = JSON.stringify(snapshot);
    const prepared: PreparedBackup = {
      kind,
      revision: revisionAtStart,
      snapshot,
      snapshotJson,
      summary,
      bytes: new TextEncoder().encode(snapshotJson).byteLength,
      preparedAt: Date.now(),
    };
    if (revisionAtStart === preparedBackupRevision) preparedBackupCache.set(kind, prepared);
    return prepared;
  })();

  preparedBackupInFlight.set(kind, promise);
  try {
    return await promise;
  } finally {
    preparedBackupInFlight.delete(kind);
  }
}

async function getPreparedGzip(prepared: PreparedBackup): Promise<Uint8Array> {
  if (!prepared.gzipPromise) prepared.gzipPromise = gzipSnapshotJson(prepared.snapshotJson);
  return prepared.gzipPromise;
}

async function withFastFallback<T>(promise: Promise<T>, fallback: T, timeoutMs = 2_500): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize)));
  }
  return btoa(binary);
}

async function gzipSnapshotJson(json: string): Promise<Uint8Array> {
  // Chrome/Android : compression native asynchrone, beaucoup plus fluide que gzipSync.
  const CompressionStreamCtor = (globalThis as any).CompressionStream;
  if (typeof CompressionStreamCtor === "function") {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStreamCtor("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  // Fallback vieux WebView : niveau 1 = très rapide pour un NAS local.
  return gzipSync(strToU8(json), { level: 1 });
}

async function encodeNasTransportSnapshotJson(snapshotJson: string, compressedInput?: Uint8Array): Promise<{ payload: any; rawBytes: number; compressedBytes: number }> {
  const rawBytes = new TextEncoder().encode(snapshotJson).byteLength;
  const compressed = compressedInput || await gzipSnapshotJson(snapshotJson);
  return {
    rawBytes,
    compressedBytes: compressed.byteLength,
    payload: {
      _format: "gzip+store-v2",
      compressed: true,
      encoding: "base64",
      data: bytesToBase64(compressed),
      meta: { rawBytes, compressedBytes: compressed.byteLength, compressedAt: new Date().toISOString(), engine: "native-gzip-fast-v1" },
    },
  };
}

const NAS_PUSH_TIMEOUT_MS = 30_000;

async function pushSnapshotToNasFast(snapshotJson: string, version: number, reason: string, token: string, summary?: any, compressedInput?: Uint8Array): Promise<any> {
  const transport = await encodeNasTransportSnapshotJson(snapshotJson, compressedInput);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), NAS_PUSH_TIMEOUT_MS);
  try {
    const response = await fetch(buildApiUrl("/sync/push"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        payload: transport.payload,
        version,
        reason,
        transport: "gzip+store-v2",
        transportStats: { rawBytes: transport.rawBytes, compressedBytes: transport.compressedBytes },
        summary: summary || undefined,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text().catch(() => "");
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      if (response.status === 413) {
        throw new Error("Le proxy/NAS refuse encore le paquet malgré la compression. Déploie aussi le backend NAS corrigé : l'app ne restera plus bloquée et la copie locale est conservée.");
      }
      const readable = /<!doctype|<html/i.test(text)
        ? `NAS HTTP ${response.status} (réponse HTML du proxy)`
        : String(data?.message || data?.error || text || `NAS HTTP ${response.status}`);
      throw new Error(readable);
    }
    return { ...data, transportStats: data?.transportStats || { rawBytes: transport.rawBytes, compressedBytes: transport.compressedBytes } };
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error(`Le NAS n’a pas confirmé la sauvegarde après ${Math.round(NAS_PUSH_TIMEOUT_MS / 1000)} secondes. La copie locale de sécurité est conservée ; vérifie le NAS puis relance sans supprimer les données locales.`);
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}


type VaultGlyphName =
  | "restore" | "matches" | "save" | "expert" | "refresh"
  | "cloud" | "nas" | "local" | "file" | "sd" | "folder"
  | "upload" | "download" | "trash" | "archive" | "current" | "shield";

function VaultGlyph({ name, size = 24 }: { name: VaultGlyphName; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "restore": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M4 8v5h5"/><path {...p} d="M5.2 13A7.5 7.5 0 1 0 7 6.7L4 9"/></svg>;
    case "matches": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><circle {...p} cx="12" cy="12" r="8"/><circle {...p} cx="12" cy="12" r="3.5"/><path {...p} d="M12 4V2M20 12h2M12 22v-2M2 12h2"/></svg>;
    case "save": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M5 3h12l2 2v16H5z"/><path {...p} d="M8 3v6h8V3M8 16h8"/><path {...p} d="m12 11 0 7m-3-3 3 3 3-3"/></svg>;
    case "expert": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h5M13 12h7"/><circle {...p} cx="16" cy="7" r="2"/><circle {...p} cx="8" cy="17" r="2"/><circle {...p} cx="11" cy="12" r="2"/></svg>;
    case "refresh": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M20 7v5h-5"/><path {...p} d="M18.8 12A7 7 0 1 1 17 6.8L20 9"/></svg>;
    case "cloud": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M6.5 18.5H5a3.5 3.5 0 0 1-.4-7A6.2 6.2 0 0 1 16.7 9a4.6 4.6 0 0 1 1.1 9.1H17"/><path {...p} d="m9 15 3-3 3 3M12 12v8"/></svg>;
    case "nas": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><rect {...p} x="3" y="4" width="18" height="6" rx="1.5"/><rect {...p} x="3" y="14" width="18" height="6" rx="1.5"/><path {...p} d="M7 7h.01M7 17h.01M11 7h7M11 17h7"/></svg>;
    case "local": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><rect {...p} x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path {...p} d="M9.5 5h5M10 18.5h4"/><path {...p} d="m12 9 0 6m-2-2 2 2 2-2"/></svg>;
    case "file": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M6 2.5h8l4 4V21H6z"/><path {...p} d="M14 2.5v5h4M9 13h6M9 16h6"/></svg>;
    case "sd": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M7 2.5h8l4 4V21H7z"/><path {...p} d="M15 2.5v5h4M9.5 12v4M12.5 12v4M15.5 12v4"/></svg>;
    case "folder": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M3.5 6.5h6l2 2H20.5v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path {...p} d="M8 14h8"/></svg>;
    case "upload": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M12 16V4m-4 4 4-4 4 4"/><path {...p} d="M5 14v6h14v-6"/></svg>;
    case "download": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M12 4v12m-4-4 4 4 4-4"/><path {...p} d="M5 20h14"/></svg>;
    case "trash": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>;
    case "archive": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M4 5h16v4H4zM6 9v11h12V9M9 13h6"/></svg>;
    case "current": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><circle {...p} cx="12" cy="12" r="8"/><path {...p} d="M12 8v4l3 2"/></svg>;
    case "shield": return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><path {...p} d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6z"/><path {...p} d="m9 12 2 2 4-5"/></svg>;
    default: return null;
  }
}

const STORAGE_AWENA_AVATAR = "/awena/awena-avatar.webp";

function StorageAwenaDot({ title, size = 36 }: { title: string; size?: number }) {
  const awena = useAwenaOptional();
  const open = async () => {
    if (!awena) return;
    awena.setRuntime({ route: "storage_vault", mode: "settings-help", phase: "menu", inGame: false, screenLabel: title, extra: { settingsSection: "Sauvegarde" } });
    awena.openPanel();
    await awena.ask("Explique-moi en détail la page Sauvegarde de MULTISPORTS SCORING : Restaurer, Parties, Sauver, Expert, NAS privé, Cloud R2, sauvegarde locale, fichier/SD/cloud personnel, archives, corbeille, sécurité et précautions. Reste ensuite dans ce contexte pour répondre à mes questions.", { canonicalFrench: true });
  };
  return (
    <button type="button" onClick={() => void open()} aria-label={`Awena · ${title}`} title={`Awena · ${title}`} style={{ width: size, height: size, borderRadius: 999, border: "none", padding: 3, background: "linear-gradient(135deg,#ffe600 0%,#27ff88 24%,#16e8ff 48%,#ff38c7 73%,#8d52ff 100%)", boxShadow: "0 0 14px rgba(22,232,255,.42),0 0 22px rgba(255,56,199,.22),0 0 0 2px rgba(0,0,0,.45)", cursor: awena ? "pointer" : "default", opacity: awena ? 1 : .55, display: "grid", placeItems: "center" }}>
      <span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "block", background: "#050713" }}><img src={STORAGE_AWENA_AVATAR} alt="Awena" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></span>
    </button>
  );
}

function StorageTickerHeader({ ticker, alt, onBack, onRefresh, busy, help }: { ticker: string; alt: string; onBack: () => void; onRefresh: () => void; busy: boolean; help: React.ReactNode }) {
  return (
    <div style={{ position: "relative", width: "100%", minWidth: 0, marginBottom: 10 }}>
      <img
        src={ticker}
        alt={alt}
        draggable={false}
        style={{
          width: "100%",
          maxWidth: "none",
          height: "auto",
          display: "block",
          filter: `drop-shadow(0 0 14px ${accentSoftGlow})`,
        }}
      />
      <div style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", zIndex: 5 }}>
        <BackDot size={42} color={neon} glow={`${neon}77`} onClick={onBack}/>
      </div>
      <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", zIndex: 5, display: "flex", alignItems: "center", gap: 5 }}>
        <StorageAwenaDot title={alt} size={36}/>
        <button type="button" disabled={busy} onClick={onRefresh} aria-label="Actualiser" style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${neon}`, background: "rgba(0,0,0,.72)", color: neon, display: "grid", placeItems: "center", boxShadow: `0 0 14px ${accentSoftGlow}`, cursor: busy ? "wait" : "pointer", opacity: busy ? .55 : 1 }}><VaultGlyph name="refresh" size={20}/></button>
      </div>
    </div>
  );
}

function VaultNavButton({ active, icon, label, onClick, disabled = false }: { active: boolean; icon: VaultGlyphName; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{
      minWidth: 0, height: 66, padding: "7px 4px", borderRadius: 16,
      display: "grid", placeItems: "center", gap: 3,
      border: active ? `1px solid ${neon}` : "1px solid rgba(148,163,184,.22)",
      background: active ? "rgba(34,211,238,.10)" : "rgba(15,23,42,.72)",
      color: active ? "#f8fafc" : "#aeb9c8",
      boxShadow: active ? `0 0 18px ${accentSoftGlow}, inset 0 0 14px rgba(34,211,238,.05)` : "none",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1,
    }}>
      <span style={{ color: active ? neon : "currentColor", lineHeight: 0 }}><VaultGlyph name={icon} size={25}/></span>
      <span style={{ fontSize: 10.5, fontWeight: 900, whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

function VaultActionButton({ icon, label, onClick, active = false, disabled = false, danger = false }: { icon: VaultGlyphName; label: string; onClick: () => void; active?: boolean; disabled?: boolean; danger?: boolean }) {
  const color = danger ? red : active ? gold : neon;
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{
      ...btn, padding: "9px 8px", minHeight: 58, display: "grid", placeItems: "center", gap: 4,
      borderColor: active ? color : `color-mix(in srgb, ${color} 58%, transparent)`, color,
      background: active ? `color-mix(in srgb, ${color} 13%, transparent)` : "rgba(15,23,42,.65)",
      boxShadow: active ? `0 0 16px color-mix(in srgb, ${color} 28%, transparent)` : "none",
      opacity: disabled ? .46 : 1,
    }}>
      <VaultGlyph name={icon} size={23}/>
      <span style={{ fontSize: 10.5, lineHeight: 1.1 }}>{label}</span>
    </button>
  );
}

function CompactSectionTitle({ title, info, color = "#fff", right }: { title: string; info: React.ReactNode; color?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <strong style={{ color, fontSize: 15.5, letterSpacing: ".02em", ...wrapText }}>{title}</strong>
        <MiniInfoButton title={title} color={color === "#fff" ? neon : color} content={info}/>
      </div>
      {right || null}
    </div>
  );
}

function CompactEmpty({ title, detail }: { title: string; detail?: string }) {
  return <div style={{ ...panel, padding: 13, borderStyle: "dashed", textAlign: "center" }}><strong style={{ color: amber }}>{title}</strong>{detail ? <div style={{ color: muted, fontSize: 11.5, marginTop: 5 }}>{detail}</div> : null}</div>;
}

export default function StorageVaultPage({ go }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const auth = useAuthOnline();
  const themeVars = React.useMemo(() => ({ "--dc-accent": theme?.primary || "#d9ff33", "--dc-accent-soft": theme?.accent1 || theme?.primary || "#22d3ee" }) as React.CSSProperties, [theme]);
  const [tab, setTab] = React.useState<TabKey>("restore");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Scan en attente…");
  const backgroundBackup = useBackgroundBackupState();
  const backgroundRestore = useBackgroundRestoreState();
  const restoreRunning = backgroundRestore.status === "running";
  const lastUserActionAtRef = React.useRef(0);
  const [localSlots, setLocalSlots] = React.useState<MemorySlot[]>([]);
  const [nasSlots, setNasSlots] = React.useState<NasSlot[]>([]);
  const [trashNasSlots, setTrashNasSlots] = React.useState<NasSlot[]>([]);
  const [cloudSlots, setCloudSlots] = React.useState<CloudSlot[]>([]);
  const [trashCloudSlots, setTrashCloudSlots] = React.useState<CloudSlot[]>([]);
  const [backupProvider, setBackupProvider] = React.useState<BackupProvider>(() => readPreferredRemoteSource() || "nas");
  const [restoreSource, setRestoreSource] = React.useState<RestoreSource>(() => readPreferredRemoteSource() || "nas");
  const [storagePrefs, setStoragePrefs] = React.useState(() => loadStoragePrefs());
  const [externalBackupStatus, setExternalBackupStatus] = React.useState<ExternalBackupStatus>(() => ({
    supported: typeof window !== "undefined" && typeof (window as any).showSaveFilePicker === "function",
    configured: false,
    permission: "unknown",
  }));
  const [externalBackupBusy, setExternalBackupBusy] = React.useState<null | "choose" | "save" | "download">(null);
  const [cloudTransferBusy, setCloudTransferBusy] = React.useState<null | "current" | "file" | "entry">(null);
  const [storageEstimate, setStorageEstimate] = React.useState({ usage: 0, quota: 0, free: 0 });
  const [directR2Status, setDirectR2Status] = React.useState<DirectR2Status | null>(null);
  const [directR2Usage, setDirectR2Usage] = React.useState<DirectR2Usage | null>(null);
  const [restoreView, setRestoreView] = React.useState<RestoreView>("current");
  const restoreViewRef = React.useRef<RestoreView>("current");
  React.useEffect(() => { restoreViewRef.current = restoreView; }, [restoreView]);
  const [matchBackups, setMatchBackups] = React.useState<MatchBackupItem[]>([]);
  const [blocks, setBlocks] = React.useState<StorageBlock[]>([]);
  const [showDiagnostic, setShowDiagnostic] = React.useState(false);
  const [expertSearchQuery, setExpertSearchQuery] = React.useState("");
  const [expertDateFilter, setExpertDateFilter] = React.useState("");
  const [detailsState, setDetailsState] = React.useState<{ entry: SaveEntry; details?: BackupDetails | null; loading: boolean; error?: string | null } | null>(null);
  const [destinationSetup, setDestinationSetup] = React.useState<StorageDestinationId | null>(null);
  const [importedRestoreEntry, setImportedRestoreEntry] = React.useState<SaveEntry | null>(null);
  const [accountScopeId, setAccountScopeId] = React.useState<string | null>(() => getVaultCurrentUserId());
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const cloudImportRef = React.useRef<HTMLInputElement | null>(null);
  const restoreFileRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (backgroundRestore.status !== "idle" && backgroundRestore.message) {
      setMessage(backgroundRestore.message);
    }
  }, [backgroundRestore.status, backgroundRestore.message]);

  const currentAuthForVault = React.useMemo(() => ({
    token: (auth.session as any)?.access_token || (auth.session as any)?.token || "",
    refreshToken: (auth.session as any)?.refresh_token || (auth.session as any)?.refreshToken || "",
    userId: auth.userId || (auth.user as any)?.id || null,
    user: auth.user || null,
    authProvider:
      (auth.user as any)?.user_metadata?.auth_provider ||
      (auth.session as any)?.authProvider ||
      (auth.session as any)?.auth_provider ||
      "",
    degradedMode:
      (auth.user as any)?.user_metadata?.degraded_mode === true ||
      (auth.session as any)?.degradedMode === true,
  }), [auth.session, auth.user, auth.userId]);

  const [privateNasCapability, setPrivateNasCapability] = React.useState<{ checked: boolean; authorized: boolean }>({ checked: false, authorized: false });
  const founderNasSelected = storagePrefs.selectedDestination === "founder_nas";
  const hasNasAccessToken = Boolean(readNasAccessToken());

  // Le compte fondateur reste authentifié publiquement via Supabase (Google/email)
  // même lorsque ses sauvegardes privées utilisent le NAS. L'ancien test
  // !isPublicSupabaseVaultAuth(...) masquait donc à tort la restauration NAS
  // après la refonte de l'authentification sociale. Le droit réel est contrôlé
  // par /auth/supabase/nas-capability et le bridge NAS côté serveur.
  const canUsePrivateNas = hasNasAccessToken || privateNasCapability.authorized || founderNasSelected;

  React.useEffect(() => {
    let alive = true;
    if (!auth.userId && !auth.user) {
      setPrivateNasCapability({ checked: true, authorized: false });
      return () => { alive = false; };
    }

    void import("../lib/onlineApi").then(async (mod: any) => {
      const capability = await mod?.onlineApi?.getPrivateNasCapability?.();
      if (!alive) return;
      setPrivateNasCapability({
        checked: capability?.checked !== false,
        authorized: capability?.authorized === true,
      });
    }).catch(() => {
      if (alive) setPrivateNasCapability((current) => ({ ...current, checked: false }));
    });

    return () => { alive = false; };
  }, [auth.userId, auth.user]);

  React.useEffect(() => {
    // Une préférence NAS fondateur valide ne doit jamais être remplacée par R2
    // simplement parce que le bridge est encore en cours de restauration.
    if (canUsePrivateNas || founderNasSelected || !privateNasCapability.checked) return;
    if (backupProvider === "nas") setBackupProvider("cloud");
    if (restoreSource === "nas") setRestoreSource("cloud");
    if (readPreferredRemoteSource() === "nas") writePreferredRemoteSource("cloud");
  }, [canUsePrivateNas, founderNasSelected, privateNasCapability.checked, backupProvider, restoreSource]);

  React.useEffect(() => {
    // Au redémarrage, la préférence peut encore être NAS alors que la session
    // React vient juste d'être reconstruite depuis Supabase. On recrée alors le
    // bridge NAS automatiquement au lieu de faire disparaître la source.
    if (!founderNasSelected || hasNasAccessToken || !(accountScopeId || auth.userId || auth.user)) return;
    let alive = true;
    void import("../lib/onlineApi").then(async (mod: any) => {
      const capability = await mod?.onlineApi?.getPrivateNasCapability?.({ force: true });
      if (!alive) return;
      setPrivateNasCapability({ checked: capability?.checked !== false, authorized: capability?.authorized === true });
      // Un timeout du pré-contrôle ne doit pas condamner le NAS. La bascule
      // explicite tente le bridge serveur, qui est l'autorité finale.
      if (capability?.authorized === true || capability?.checked === false || founderNasSelected) {
        const bridged = await mod?.onlineApi?.switchAccountInfrastructure?.("nas");
        if (alive && (bridged?.token || readNasAccessToken())) {
          setPrivateNasCapability({ checked: true, authorized: true });
          await auth.refresh?.();
        }
      }
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [founderNasSelected, hasNasAccessToken, accountScopeId, auth.userId, auth.user, auth.refresh]);

  const ensureVaultNasToken = React.useCallback(() => {
    const token = persistNasAuthForVault(currentAuthForVault);
    setAccountScopeId(getVaultCurrentUserId());
    return token;
  }, [currentAuthForVault]);

  React.useEffect(() => {
    ensureVaultNasToken();
  }, [ensureVaultNasToken]);

  React.useEffect(() => {
    let alive = true;
    const refreshStorageContext = async () => {
      const [external, estimate] = await Promise.all([
        getExternalBackupStatus(),
        estimateBrowserStorage(),
      ]);
      if (!alive) return;
      setExternalBackupStatus(external);
      setStorageEstimate(estimate);
      setStoragePrefs(loadStoragePrefs());
    };
    void refreshStorageContext();
    const onPrefs = () => {
      setStoragePrefs(loadStoragePrefs());
      void refreshStorageContext();
    };
    const onExternal = (event: Event) => {
      const detail = (event as CustomEvent<ExternalBackupStatus>).detail;
      if (detail) setExternalBackupStatus(detail);
    };
    window.addEventListener("dc-storage-prefs-changed", onPrefs as EventListener);
    window.addEventListener("dc-external-backup-status", onExternal as EventListener);
    window.addEventListener("storage", onPrefs as EventListener);
    return () => {
      alive = false;
      window.removeEventListener("dc-storage-prefs-changed", onPrefs as EventListener);
      window.removeEventListener("dc-external-backup-status", onExternal as EventListener);
      window.removeEventListener("storage", onPrefs as EventListener);
    };
  }, []);

  const selectedDestination = storagePrefs.selectedDestination;
  const activeDestination = getStorageDestination(selectedDestination);
  const hasConnectedAccount = Boolean(accountScopeId || auth.userId || auth.user);

  React.useEffect(() => {
    let alive = true;
    if (selectedDestination !== "cloud_r2" && backupProvider !== "cloud") return () => { alive = false; };
    void Promise.all([
      getDirectR2Status(),
      hasConnectedAccount ? getDirectR2Usage().catch(() => null) : Promise.resolve(null),
    ])
      .then(([status, usage]) => {
        if (!alive) return;
        setDirectR2Status(status);
        if (usage) setDirectR2Usage(usage);
      })
      .catch((error: any) => {
        if (alive) setDirectR2Status({ ok: false, error: String(error?.message || error || "Diagnostic R2 impossible") });
      });
    return () => { alive = false; };
  }, [selectedDestination, backupProvider, hasConnectedAccount]);

  const nasEntries = React.useMemo<SaveEntry[]>(() => {
    return nasSlots
      .map((slot, idx) => {
        const summary = normalizeSummary(slot.summary || {});
        const q = assessSave(summary);
        const id = String(slot.id || "latest");
        return {
          key: `nas:${id}`,
          source: "nas" as const,
          slot,
          summary,
          latest: Boolean((slot as any).latest || id === "latest"),
          createdAt: slot.createdAt || slot.updatedAt || null,
          updatedAt: slot.updatedAt || slot.createdAt || null,
          index: idx + 1,
          quality: q,
          title: (slot as any).latest || id === "latest" ? "Emplacement courant NAS" : `Emplacement NAS ${String(idx + 1).padStart(2, "0")}`,
          subtitle: q.restorable ? `${saveCategory(summary)} · ${fmtDate(slot.createdAt || slot.updatedAt || null)}` : `Masqué par garde-fou · ${q.label}`,
        };
      })
      .filter((entry) => entry.latest || entry.quality.grade === "complete" || entry.quality.grade === "history")
      .sort((a, b) => {
        const gradeA = a.quality.grade === "complete" ? 2 : 1;
        const gradeB = b.quality.grade === "complete" ? 2 : 1;
        if (gradeA !== gradeB) return gradeB - gradeA;
        return (Date.parse(b.createdAt || b.updatedAt || "") || 0) - (Date.parse(a.createdAt || a.updatedAt || "") || 0);
      });
  }, [nasSlots]);

  const trashNasEntries = React.useMemo<SaveEntry[]>(() => {
    return trashNasSlots
      .map((slot, idx) => {
        const summary = normalizeSummary(slot.summary || {});
        const q = assessSave(summary);
        const id = String(slot.id || "");
        return {
          key: `trash-nas:${id}`,
          source: "nas" as const,
          slot,
          summary,
          latest: false,
          createdAt: slot.createdAt || slot.updatedAt || null,
          updatedAt: slot.deletedAt || slot.updatedAt || slot.createdAt || null,
          index: idx + 1,
          quality: q.restorable ? q : { ...q, restorable: true, color: amber, short: q.short || "Corbeille", reason: "Emplacement supprimé : récupérable tant que la corbeille n’est pas vidée." },
          title: `Corbeille NAS ${String(idx + 1).padStart(2, "0")}`,
          subtitle: `${saveCategory(summary)} · supprimé le ${fmtDate(slot.deletedAt || slot.updatedAt || slot.createdAt || null)}`,
        };
      })
      .sort((a, b) => (Date.parse(b.updatedAt || "") || 0) - (Date.parse(a.updatedAt || "") || 0));
  }, [trashNasSlots]);

  const latestNasEntry = React.useMemo(() => {
    const latest = nasEntries.find((entry) => entry.latest) || nasEntries[0] || null;
    return latest;
  }, [nasEntries]);

  const archivedNasEntries = React.useMemo(() => {
    return nasEntries.filter((entry) => !entry.latest && entry.key !== latestNasEntry?.key);
  }, [nasEntries, latestNasEntry]);
  const cloudEntries = React.useMemo<SaveEntry[]>(() => {
    return cloudSlots
      .map((slot, idx) => {
        const summary = strictSummaryForCloudPayload(slot.__payload, slot.__summary || cloudObjectMetadataSummary(slot));
        const q = assessSaveForProvider(summary, "cloud");
        const latest = Boolean((slot as any).latest || idx === 0);
        return {
          key: `cloud:${slot.id}`,
          source: "cloud" as const,
          slot,
          summary,
          latest,
          createdAt: slot.created_at || slot.updated_at || null,
          updatedAt: slot.updated_at || slot.created_at || null,
          index: idx + 1,
          quality: q,
          title: cloudTitle(slot, idx, latest),
          subtitle: q.restorable ? `${saveCategory(summary)} · ${fmtDate(slot.created_at || slot.updated_at || null)}` : `Masqué par garde-fou · ${q.label}`,
        };
      })
      .filter((entry) => entry.quality.restorable || entry.summary.profiles > 0 || entry.summary.matches > 0)
      .sort((a, b) => (Date.parse(b.updatedAt || "") || 0) - (Date.parse(a.updatedAt || "") || 0));
  }, [cloudSlots]);

  const trashCloudEntries = React.useMemo<SaveEntry[]>(() => {
    return trashCloudSlots
      .map((slot, idx) => {
        const summary = strictSummaryForCloudPayload(slot.__payload, slot.__summary || cloudObjectMetadataSummary(slot));
        const q = assessSaveForProvider(summary, "cloud");
        return {
          key: `trash-cloud:${slot.id}`,
          source: "cloud" as const,
          slot,
          summary,
          latest: false,
          createdAt: slot.created_at || slot.updated_at || null,
          updatedAt: slot.updated_at || slot.created_at || null,
          index: idx + 1,
          quality: q.restorable ? q : { ...q, restorable: true, color: amber, short: q.short || "Corbeille", reason: "Sauvegarde cloud supprimée : récupérable tant que la corbeille n’est pas vidée." },
          title: `Corbeille cloud ${String(idx + 1).padStart(2, "0")}`,
          subtitle: `${saveCategory(summary)} · supprimé le ${fmtDate(slot.updated_at || slot.created_at || null)}`,
        };
      })
      .sort((a, b) => (Date.parse(b.updatedAt || "") || 0) - (Date.parse(a.updatedAt || "") || 0));
  }, [trashCloudSlots]);

  const remoteEntries = backupProvider === "cloud" ? cloudEntries : nasEntries;
  const trashRemoteEntries = backupProvider === "cloud" ? trashCloudEntries : trashNasEntries;
  const latestRemoteEntry = React.useMemo(() => {
    // NAS : ne jamais rebaptiser une archive en « sauvegarde courante ».
    // Si le serveur ne confirme pas explicitement latest, on conserve l'état
    // précédent/cache au lieu d'afficher une archive comme si elle était courante.
    if (backupProvider === "nas") return remoteEntries.find((entry) => entry.latest) || null;
    return remoteEntries.find((entry) => entry.latest) || remoteEntries[0] || null;
  }, [backupProvider, remoteEntries]);

  const archivedRemoteEntries = React.useMemo(() => {
    return remoteEntries.filter((entry) => !entry.latest && entry.key !== latestRemoteEntry?.key);
  }, [remoteEntries, latestRemoteEntry]);


  const localEntries = React.useMemo<SaveEntry[]>(() => {
    return localSlots
      .map((slot, idx) => {
        const summary = slot.summary ? normalizeSummary(slot.summary) : strictSummaryForRestore(decodeMaybeCompressedNasPayload(slot.payload));
        const q = assessSave(summary);
        return {
          key: `local:${slot.id}`,
          source: "local" as const,
          slot,
          summary,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
          index: idx + 1,
          quality: q,
          title: `Bloc local ${String(idx + 1).padStart(2, "0")}`,
          subtitle: `${slot.label || "Sécurité locale"} · ${fmtDate(slot.createdAt)}`,
        };
      })
      .filter((entry) => entry.quality.restorable);
  }, [localSlots]);

  const currentRestoreEntry = restoreSource === "local"
    ? localEntries[0] || null
    : restoreSource === "file"
      ? importedRestoreEntry
      : latestRemoteEntry;
  const currentRestoreArchives = restoreSource === "local"
    ? localEntries.slice(1)
    : restoreSource === "file"
      ? []
      : archivedRemoteEntries;
  const headerSummary = normalizeSummary(currentRestoreEntry?.summary || latestRemoteEntry?.summary || localEntries[0]?.summary || {});
  const headerDate = currentRestoreEntry?.createdAt || currentRestoreEntry?.updatedAt || latestRemoteEntry?.createdAt || localEntries[0]?.createdAt || null;
  const matchBackupEntries = React.useMemo(() => {
    const byId = new Map<string, MatchBackupItem>();
    const priority = (origin?: string) => origin === "cloud" ? 3 : origin === "nas" ? 2 : 1;
    const savedMs = (item: MatchBackupItem) => Date.parse(String(item.savedAt || "")) || Number(item.updatedAt || item.createdAt || 0) || 0;
    for (const item of matchBackups || []) {
      const id = String(item.matchId || item.id || "").trim();
      if (!id) continue;
      const existing = byId.get(id);
      if (!existing) {
        byId.set(id, item);
        continue;
      }
      const pNext = priority(item.origin);
      const pPrev = priority(existing.origin);
      if (pNext > pPrev) {
        byId.set(id, item);
        continue;
      }
      if (pNext < pPrev) continue;

      // Anti-corruption: among revisions from the same destination, expose the
      // richest surviving payload. Never let a newer 423 B record hide an older
      // 18 KB detailed Cricket match.
      const nextBytes = Number(item.payloadBytes || 0);
      const prevBytes = Number(existing.payloadBytes || 0);
      if (nextBytes > prevBytes || (nextBytes === prevBytes && savedMs(item) > savedMs(existing))) {
        byId.set(id, item);
      }
    }
    return Array.from(byId.values()).sort((a, b) => {
      const ta = Number(a.updatedAt || a.createdAt || Date.parse(a.savedAt || "") || 0);
      const tb = Number(b.updatedAt || b.createdAt || Date.parse(b.savedAt || "") || 0);
      return tb - ta;
    });
  }, [matchBackups]);
  const technicalCount = blocks.length;
  const filteredTechnicalBlocks = React.useMemo(() => {
    const filtered = blocks.filter((block) =>
      blockContainsExpertDate(block, expertDateFilter) && blockContainsExpertSearch(block, expertSearchQuery)
    );
    if (!expertSearchQuery.trim()) return filtered;
    return filtered.sort((a, b) => expertBlockSearchScore(b, expertSearchQuery) - expertBlockSearchScore(a, expertSearchQuery));
  }, [blocks, expertDateFilter, expertSearchQuery]);

  const resolveBackupProvider = React.useCallback(async (): Promise<BackupProvider> => {
    const preferred = readPreferredRemoteSource();
    // Application grand public : le NAS privé n'est jamais une source implicite.
    // Il n'est disponible que lorsqu'une vraie session NAS est présente.
    if (!canUsePrivateNas) return "cloud";
    return preferred || "nas";
  }, [canUsePrivateNas]);

  const refresh = React.useCallback(async (providerOverride?: BackupProvider) => {
    // L'actualisation des listes ne bloque jamais le bouton Sauvegarder.
    const refreshStartedAt = Date.now();
    ensureVaultNasToken();
    setAccountScopeId(getVaultCurrentUserId());
    try {
      const provider = providerOverride || await resolveBackupProvider();
      setBackupProvider(provider);
      const selectedForSave = loadStoragePrefs().selectedDestination;
      const selectedForSaveLabel = getStorageDestination(selectedForSave).label;

      // Chargement rapide : uniquement les métadonnées nécessaires à l'écran.
      // Le scan complet IndexedDB/localStorage reste réservé à l'onglet Expert.
      const [ls, localMatches, bs] = await Promise.all([
        listLocalMemorySlots().catch(() => []),
        listLocalMatchBackups().catch(() => []),
        tab === "diagnostic" ? scanLocalStorageAndIndexedDb().catch(() => []) : Promise.resolve([]),
      ]);
      setLocalSlots(ls);
      setBlocks(bs);

      if (provider === "cloud") {
        const [activeRaw, allRaw, cloudMatches] = await Promise.all([
          listCloudVaultBackups(2, false).catch(() => []),
          listCloudVaultBackups(4, true).catch(() => []),
          tab === "matches" ? withFastFallback(listCloudMatchBackups(), [], 2_500) : Promise.resolve([]),
        ]);
        const active = activeRaw
          .filter((item) => !item.is_deleted)
          .map((slot, idx) => ({
            ...slot,
            __summary: strictSummaryForCloudPayload(null, cloudObjectMetadataSummary(slot)),
            latest: idx === 0,
          } as CloudSlot));
        const trash = allRaw
          .filter((item) => !!item.is_deleted)
          .map((slot) => ({
            ...slot,
            __summary: strictSummaryForCloudPayload(null, cloudObjectMetadataSummary(slot)),
            deletedAt: slot.updated_at || null,
          } as CloudSlot));

        setNasSlots([]);
        setTrashNasSlots([]);
        setCloudSlots(active);
        setTrashCloudSlots(trash);
        setMatchBackups([...(localMatches || []), ...(cloudMatches || [])]);
        if (lastUserActionAtRef.current <= refreshStartedAt) setMessage(`Prêt. Destination active : ${selectedForSaveLabel}. ${active.length} sauvegarde(s) Cloud R2, ${ls.length} sauvegarde(s) locale(s). Aucun contenu lourd n'a été téléchargé.`);
        return;
      }

      // IMPORTANT : une lecture NAS lente/404 ne doit JAMAIS effacer de l'écran
      // une sauvegarde qui vient d'être confirmée. Avant, withFastFallback(..., [])
      // remplaçait la liste par [] au bout de 2,5 s : la sauvegarde « disparaissait »
      // alors qu'elle existait toujours dans PostgreSQL. On adopte un vrai
      // stale-while-revalidate : succès => remplace/cache ; échec => conserve.
      const needTrash = tab === "restore" && restoreViewRef.current === "trash";
      const needRemoteMatches = tab === "matches";
      const [nsResult, trashResult, nasMatchesResult] = await Promise.allSettled([
        listNasMemorySlots(),
        needTrash ? listNasDeletedMemorySlots() : Promise.resolve(null),
        needRemoteMatches ? listNasMatchBackups() : Promise.resolve(null),
      ]);

      let activeNasCount: number | null = null;
      if (nsResult.status === "fulfilled") {
        const activeNas = (nsResult.value || []).map((slot) => ({ ...slot, summary: normalizeSummary(slot.summary || {}) }));
        activeNasCount = activeNas.length;
        setNasSlots(activeNas);
        writeCachedNasSlots(activeNas);
      } else {
        setNasSlots((current) => {
          if (current.length) return current;
          return readCachedNasSlots().map((slot) => ({ ...slot, summary: normalizeSummary(slot.summary || {}) }));
        });
      }

      if (trashResult.status === "fulfilled" && Array.isArray(trashResult.value)) {
        const trashNas = (trashResult.value || []).map((slot) => ({ ...slot, summary: normalizeSummary(slot.summary || {}) }));
        setTrashNasSlots(trashNas);
      }

      if (nasMatchesResult.status === "fulfilled" && Array.isArray(nasMatchesResult.value)) {
        setMatchBackups([...(localMatches || []), ...(nasMatchesResult.value || [])]);
      } else if (tab === "matches") {
        setMatchBackups((current) => {
          const remoteKept = current.filter((item) => item.origin === "nas");
          return [...(localMatches || []), ...remoteKept];
        });
      }

      setCloudSlots([]);
      setTrashCloudSlots([]);

      if (lastUserActionAtRef.current <= refreshStartedAt) {
        const degraded = nsResult.status !== "fulfilled"
          || (needTrash && trashResult.status !== "fulfilled")
          || (needRemoteMatches && nasMatchesResult.status !== "fulfilled");
        setMessage(degraded
          ? `NAS temporairement lent ou partiellement indisponible. La dernière liste confirmée est conservée à l'écran ; aucune sauvegarde n'a été effacée.`
          : `Prêt. Destination active : ${selectedForSaveLabel}. ${activeNasCount ?? 0} sauvegarde(s) NAS, ${ls.length} sauvegarde(s) locale(s). Aucun snapshot n'a été téléchargé pendant le scan.`);
      }
    } catch (error: any) {
      if (lastUserActionAtRef.current <= refreshStartedAt) setMessage(`Actualisation impossible : ${error?.message || error}`);
    } finally {
      // Aucun verrou global : une liste distante lente ne doit jamais empêcher
      // une sauvegarde locale ou fichier immédiate.
    }
  }, [ensureVaultNasToken, resolveBackupProvider, tab]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  React.useEffect(() => {
    if (tab !== "restore" || restoreView !== "trash") return;
    let alive = true;
    if (backupProvider === "nas") {
      void listNasDeletedMemorySlots().then((rows) => {
        if (alive) setTrashNasSlots((rows || []).map((slot) => ({ ...slot, summary: normalizeSummary(slot.summary || {}) })));
      }).catch(() => undefined);
    } else {
      void listCloudVaultBackups(12, true).then((rows) => {
        if (!alive) return;
        setTrashCloudSlots((rows || []).filter((item) => !!item.is_deleted).map((slot) => ({ ...slot, __summary: strictSummaryForCloudPayload(null, cloudObjectMetadataSummary(slot)), deletedAt: slot.updated_at || null } as CloudSlot)));
      }).catch(() => undefined);
    }
    return () => { alive = false; };
  }, [tab, restoreView, backupProvider]);

  const afterRestoreHousekeeping = async (reason: string) => {
    try { markStatsIndexDirty(reason); } catch {}
    // Le recalcul complet des statistiques ne doit plus bloquer la fin de la
    // restauration ni la navigation. Il part dans un vrai créneau idle et un
    // seul rebuild est conservé si plusieurs événements arrivent.
    try {
      void scheduleStatsIndexRefresh({
        includeNonFinished: true,
        persist: true,
        debounceMs: 900,
        reason,
      }).catch(() => undefined);
    } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-history-updated", { detail: { reason, statsRebuildDeferred: true } })); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-store-updated", { detail: { reason, statsRebuildDeferred: true } })); } catch {}
  };

  const uploadSnapshotPayloadToCloudVault = async (
    payload: any,
    reason: string,
    title?: string,
    options?: { cloudCopyOnly?: boolean; sourceDestination?: string }
  ) => {
    const snapshot = normalizeCloudPayload(unwrapSnapshotEnvelope(payload));
    const isBackupV1 = looksLikeCloudBackupV1(snapshot);
    if (!looksLikeCloudSnapshot(snapshot) && !isBackupV1) {
      throw new Error("Ce fichier ne contient pas une sauvegarde Multisports complète exploitable.");
    }
    const summary = strictSummaryForCloudPayload(snapshot);
    const quality = assessSaveForProvider(summary, "cloud");
    if (!quality.restorable) {
      throw new Error(`Sauvegarde refusée par le garde-fou : ${quality.reason}`);
    }
    const snapshotJson = JSON.stringify(snapshot);
    const uploaded = await uploadCloudVaultSnapshotJson({
      snapshotJson,
      title: title || `Sauvegarde cloud — ${new Date().toLocaleString("fr-FR")}`,
      cloudCopyOnly: options?.cloudCopyOnly === true,
      sourceDestination: options?.sourceDestination || loadStoragePrefs().selectedDestination,
      metadata: {
        reason,
        exportedAt: new Date().toISOString(),
        historyCount: summary.historyRows || summary.matches || 0,
        profilesCount: summary.profiles || 0,
        statsBlocks: summary.statsBlocks || 0,
        rawSizeBytes: new Blob([snapshotJson]).size,
        crossDeviceCopy: options?.cloudCopyOnly === true,
        sourceDestination: options?.sourceDestination || loadStoragePrefs().selectedDestination,
      },
    });
    return { uploaded, summary };
  };

  const uploadCurrentSnapshotToCloudVault = async (
    reason: string,
    title?: string,
    options?: { cloudCopyOnly?: boolean; sourceDestination?: string }
  ) => {
    const snapshot = await exportCloudSnapshot({
      mediaMirror: "background",
      includeEmbeddedMedia: false,
      includeAvatarFallbacks: false,
    });
    return uploadSnapshotPayloadToCloudVault(snapshot, reason, title, options);
  };

  const restoreSnapshotIntoBrowserAndAccount = async (
    payload: any,
    reason: string,
    label: string,
    options?: {
      skipConfirm?: boolean;
      background?: boolean;
      provider?: BackupProvider;
      report?: BackgroundRestoreReporter;
    },
  ): Promise<{ summary: VaultSummary }> => {
    const report = options?.report || (() => {});
    const provider = options?.provider || backupProvider;
    report(54, "Préparation du snapshot téléchargé…", "prepare");
    const snapshot = normalizeCloudPayload(unwrapSnapshotEnvelope(payload));
    const isBackupV1 = looksLikeCloudBackupV1(snapshot);
    if (!looksLikeCloudSnapshot(snapshot) && !isBackupV1) throw new Error("Snapshot restaurable introuvable dans ce bloc.");
    const summary = isBackupV1 ? strictSummaryForCloudPayload(snapshot) : strictSummaryForRestore(snapshot);
    const q = provider === "cloud" ? assessSaveForProvider(summary, "cloud") : assessSave(summary);
    if (!q.restorable) {
      throw new Error(`Garde-fou restauration : bloc refusé. ${q.reason} ${explainStrictPayload(snapshot)}`);
    }

    const isNativeRestore = Capacitor.isNativePlatform();
    const targetLabel = provider === "cloud" ? "Cloudflare R2" : "compte NAS";
    const restoreFlowText = isNativeRestore
      ? "L’application va créer une sécurité puis remplacer uniquement les données locales par cette sauvegarde. Aucune autre source ne sera chargée en arrière-plan."
      : `L’application va créer une sécurité, restaurer le navigateur, synchroniser vers ${targetLabel}, puis recharger.`;
    if (!options?.skipConfirm) {
      const ok = window.confirm(
        `Restaurer "${label}" ?\n\n` +
        `${summary.matches} parties • ${summary.historyRows} lignes historique • ${summary.profiles} profils • ${summary.statsBlocks} stats\n\n` +
        restoreFlowText
      );
      if (!ok) return { summary };
    }

    report(58, "Création de la sécurité locale avant restauration…", "prepare");
    const restoreAuth = rememberAuthKeys();
    await createLocalMemorySlot("Sécurité avant restauration", "before-restore").catch(() => null);

    report(64, "Import des parties, profils et médias dans l’appareil…", "import");
    let importReport: any = null;
    if (isBackupV1) {
      const restored = await restoreCloudBackupFromJson({ json: JSON.stringify(snapshot), mode: "replace", rebuild: true });
      if (!restored.ok) throw new Error(restored.error || "Restauration CloudBackup impossible.");
    } else {
      importReport = await importCloudSnapshot(snapshot, {
        mode: "replace",
        onProgress: (progress, message) => {
          // L'import local occupe la plage 64 → 90 du ticker global. Les étapes
          // internes remontent désormais réellement au lieu de rester figées à 64 %.
          report(64 + Math.round(Math.max(0, Math.min(100, progress)) * 0.26), message, "import");
        },
      });
    }
    restoreAuth();

    report(91, "Contrôle final des profils restaurés…", "finalize");
    try {
      const expectedProfiles = Math.max(
        Number(summary.profiles || 0),
        Number(importReport?.portable?.expected?.profiles || 0),
      );
      const runtimeAlreadyRefreshed = importReport?.runtimeRefreshed === true;
      let actualProfiles = Number(importReport?.portable?.restored?.profiles || 0);
      let restoredStore: any = null;

      if (importReport?.portable && importReport.portable.ok === false) {
        throw new Error(
          `Restauration locale incomplète : ${String(importReport.portable.errors?.join(" ; ") || "contrôle portable échoué")}`
        );
      }

      // importCloudSnapshot a déjà relu et injecté le store vivant. Le refaire ici
      // doublait la décompression du store et provoquait une seconde grosse vague
      // de rendus React pendant la navigation Android.
      if (!runtimeAlreadyRefreshed || (expectedProfiles > 0 && actualProfiles < expectedProfiles)) {
        restoredStore = await loadStore<any>();
        actualProfiles = Array.isArray(restoredStore?.profiles)
          ? restoredStore.profiles.filter((profile: any) => profile && String(profile?.id || "").trim()).length
          : actualProfiles;
      }

      if (expectedProfiles > 0 && actualProfiles < expectedProfiles) {
        throw new Error(
          `Restauration locale incomplète : ${expectedProfiles} profil(s) attendu(s), ${actualProfiles} réellement relu(s). ` +
          `La sauvegarde distante n'a pas été réécrite.`
        );
      }

      if (!runtimeAlreadyRefreshed && restoredStore && typeof (window as any).__replaceLocalStoreNow === "function") {
        await (window as any).__replaceLocalStoreNow(restoredStore, reason);
      }
    } catch (e) {
      console.warn("[StorageVault] live store refresh after restore failed", e);
      throw e;
    }

    report(96, "Données appliquées. Le recalcul des statistiques est différé au prochain temps libre…", "finalize");
    await afterRestoreHousekeeping(reason);

    if (!Capacitor.isNativePlatform()) {
      report(94, `Synchronisation de l’état restauré vers ${targetLabel}…`, "finalize");
      if (provider === "cloud") {
        await uploadCurrentSnapshotToCloudVault(`restore-cloud:${reason}`, `État restauré — ${label}`);
      } else {
        await pushSnapshotToAccount(snapshot, reason);
      }
      setMessage(`Restauration terminée : ${summary.matches} partie(s), ${summary.profiles} profil(s), ${summary.statsBlocks} bloc(s) stats. Rechargement…`);
      report(100, "Restauration terminée. Rechargement…", "finalize");
      window.setTimeout(() => window.location.reload(), 900);
      return { summary };
    }

    // ANDROID SOURCE UNIQUE V59:
    // Le snapshot restauré reste local à l'appareil : aucun renvoi automatique
    // vers NAS/R2 et aucun rechargement brutal de la WebView.
    try {
      localStorage.setItem("dc_last_manual_restore_v1", JSON.stringify({
        at: new Date().toISOString(),
        provider,
        reason,
        matches: Number(summary.matches || 0),
        profiles: Number(summary.profiles || 0),
      }));
    } catch {}

    report(98, "Application du nouvel état dans toutes les pages…", "finalize");
    try {
      window.dispatchEvent(new CustomEvent("dc-store-restored", {
        detail: { reason, provider, summary },
      }));
    } catch {}

    if (!options?.background) {
      setMessage(`Restauration terminée : ${summary.matches} partie(s), ${summary.profiles} profil(s), ${summary.statsBlocks} bloc(s) stats. État appliqué sans rechargement.`);
      await refresh(provider).catch(() => undefined);
    }
    report(100, "Restauration terminée. Les données sont disponibles dans l’application.", "finalize");
    return { summary };
  };

  const restoreSingleMatch = async (item: MatchBackupItem) => {
    const label = item.title || item.matchId || "partie";
    const ok = window.confirm(
      `Restaurer cette partie ?

${label}

Elle sera réinjectée dans l’Historique sans remplacer tout le reste.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const full = item.origin === "nas"
        ? await pullNasMatchBackup(item.id || item.matchId)
        : item.origin === "cloud"
          ? await pullCloudMatchBackup(item)
          : item;
      if (!full) throw new Error("Sauvegarde de partie introuvable.");
      await restoreMatchBackupItem(full);
      await afterRestoreHousekeeping(`restore-single-match:${full.matchId || full.id}`);
      setMessage(`Partie restaurée dans l’Historique : ${full.title || full.matchId}.`);
      await refresh();
    } catch (error: any) {
      setMessage(`Restauration de la partie impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const exportSingleMatch = async (item: MatchBackupItem) => {
    try {
      const full = item.origin === "nas"
        ? await pullNasMatchBackup(item.id || item.matchId)
        : item.origin === "cloud"
          ? await pullCloudMatchBackup(item)
          : item;
      await exportJsonDownload(full || item, `${String(item.matchId || item.id || "match").replace(/[^a-z0-9_-]/gi, "_")}.json`);
    } catch (error: any) {
      setMessage(`Export partie impossible : ${error?.message || error}`);
    }
  };

  const deleteSingleMatch = async (item: MatchBackupItem) => {
    const label = item.title || item.matchId || "partie";
    if (!window.confirm(`Supprimer cette sauvegarde de partie ?
${label}`)) return;
    setBusy(true);
    try {
      if (item.origin === "nas") await deleteNasMatchBackup(item.id || item.matchId);
      if (item.origin === "cloud") await deleteCloudMatchBackup(item);
      await deleteLocalMatchBackup(item.matchId || item.id).catch(() => undefined);
      setMessage("Sauvegarde de partie supprimée.");
      await refresh();
    } catch (error: any) {
      setMessage(`Suppression partie impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const selectRemoteRestoreSource = async (provider: BackupProvider) => {
    lastUserActionAtRef.current = Date.now();

    if (provider === "nas" && !readNasAccessToken()) {
      try {
        const mod: any = await import("../lib/onlineApi");
        setMessage("Connexion au NAS privé… vérification du bridge sécurisé en cours.");
        const capability = await mod?.onlineApi?.getPrivateNasCapability?.({ force: true });
        setPrivateNasCapability({
          checked: capability?.checked !== false,
          authorized: capability?.authorized === true,
        });

        // Ne jamais confondre « contrôle temporairement indisponible » avec
        // « compte non autorisé ». Même si /nas-capability a expiré, on tente le
        // bridge explicite : le serveur /auth/supabase/bridge est l'autorité finale.
        if (capability?.checked === true && capability?.authorized !== true && !founderNasSelected) {
          setMessage("Le NAS privé n’est pas autorisé pour ce compte. Cloud R2, cet appareil et les fichiers personnels restent disponibles.");
          return;
        }

        const bridged = await mod?.onlineApi?.switchAccountInfrastructure?.("nas");
        if (!bridged?.token && !readNasAccessToken()) {
          throw new Error("Le bridge NAS n’a retourné aucun jeton d’accès.");
        }
        setPrivateNasCapability({ checked: true, authorized: true });
        await auth.refresh?.();
      } catch (error: any) {
        setMessage(`Connexion au NAS privé impossible : ${error?.message || error}. Aucune sauvegarde NAS n’a été supprimée.`);
        return;
      }
    }

    if (provider === "nas" && !readNasAccessToken()) {
      setMessage("Le NAS privé n’a pas pu être ouvert. Aucune sauvegarde NAS n’a été supprimée.");
      return;
    }

    writePreferredRemoteSource(provider);
    setBackupProvider(provider);
    setRestoreSource(provider);
    setRestoreView("current");
    await refresh(provider).catch(() => undefined);
    setMessage(provider === "cloud"
      ? "Source distante sélectionnée : Cloudflare R2. Les sauvegardes disponibles sur tous tes appareils sont affichées ci-dessous."
      : "Source distante sélectionnée : NAS. Les sauvegardes privées du serveur sont affichées ci-dessous.");
  };

  const selectLocalRestoreSource = () => {
    lastUserActionAtRef.current = Date.now();
    setRestoreSource("local");
    setRestoreView("current");
    setMessage(`${localEntries.length} sauvegarde(s) locale(s) disponible(s) sur cet appareil.`);
  };

  const selectFileRestoreSource = () => {
    lastUserActionAtRef.current = Date.now();
    setRestoreSource("file");
    setRestoreView("current");
    restoreFileRef.current?.click();
  };

  const loadRestoreFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const snapshot = unwrapSnapshotEnvelope(parsed);
      const summary = strictSummaryForRestore(snapshot);
      const quality = assessSave(summary);
      const timestamp = file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString();
      const slot: MemorySlot = {
        id: `file_${file.name}_${file.lastModified || Date.now()}`,
        ownerId: getVaultCurrentUserId(),
        createdAt: timestamp,
        updatedAt: timestamp,
        label: file.name || "Fichier de sauvegarde",
        source: "manual",
        payload: snapshot,
        summary,
      };
      const entry: SaveEntry = {
        key: `file:${slot.id}`,
        source: "file",
        slot,
        summary,
        createdAt: timestamp,
        updatedAt: timestamp,
        index: 1,
        quality,
        title: file.name || "Fichier de sauvegarde",
        subtitle: `${fmtBytes(file.size)} · ${fmtDate(timestamp)}`,
      };
      setImportedRestoreEntry(entry);
      setRestoreSource("file");
      setRestoreView("current");
      setMessage(quality.restorable
        ? `Fichier prêt : ${summary.matches} partie(s) · ${summary.profiles} profil(s) · ${summary.statsMatches || summary.statsBlocks} partie(s) avec stats.`
        : `Fichier lu, mais restauration déconseillée : ${quality.reason}`);
    } catch (error: any) {
      setImportedRestoreEntry(null);
      setMessage(`Lecture du fichier impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
      if (restoreFileRef.current) restoreFileRef.current.value = "";
    }
  };

  const openSaveDetails = async (entry: SaveEntry) => {
    setDetailsState({ entry, loading: true, details: null, error: null });
    try {
      let payload: any;
      if (entry.source === "nas") {
        payload = (await pullNasMemorySlot(String((entry.slot as NasSlot).id || "latest"))).payload;
      } else if (entry.source === "cloud") {
        const slot = entry.slot as CloudSlot;
        payload = slot.__payload || (await pullCloudVaultSlot(slot, { trash: entry.key.startsWith("trash-") })).payload;
      } else {
        payload = decodeMaybeCompressedNasPayload((entry.slot as MemorySlot).payload);
      }
      const details = buildBackupDetails(entry, payload);
      const enrichedSummary = summaryWithBackupDetails(entry.summary, details);
      const enrichedEntry = { ...entry, summary: enrichedSummary };
      const slotId = String((entry.slot as any)?.id || "");
      if (entry.source === "nas") {
        setNasSlots((current) => {
          const next = current.map((slot) => String(slot.id || "") === slotId ? { ...slot, summary: enrichedSummary } : slot);
          writeCachedNasSlots(next);
          return next;
        });
      } else if (entry.source === "cloud") {
        setCloudSlots((current) => current.map((slot) => String(slot.id || "") === slotId ? { ...slot, __summary: enrichedSummary } : slot));
      } else if (entry.source === "local") {
        setLocalSlots((current) => current.map((slot) => String(slot.id || "") === slotId ? { ...slot, summary: enrichedSummary } : slot));
      } else if (entry.source === "file") {
        setImportedRestoreEntry(enrichedEntry);
      }
      setDetailsState({ entry: enrichedEntry, loading: false, details, error: null });
    } catch (error: any) {
      setDetailsState({ entry, loading: false, details: null, error: `Détails indisponibles : ${error?.message || error}` });
    }
  };

  const finishCloudTransfer = async (messageText: string) => {
    writePreferredRemoteSource("cloud");
    setBackupProvider("cloud");
    setRestoreSource("cloud");
    setRestoreView("current");
    await refresh("cloud").catch(() => undefined);
    setMessage(messageText);
  };

  const publishCurrentDeviceToCloud = async () => {
    if (!hasConnectedAccount) {
      setMessage("Connexion requise : connecte le même compte sur tous les appareils avant d’envoyer une copie Cloud R2.");
      return;
    }
    if (!window.confirm(`Créer une copie Cloud R2 de l’état complet de cet appareil ?

La destination principale reste inchangée. Cette copie apparaîtra dans Restaurer → Cloud R2 sur tes autres appareils.`)) return;
    setCloudTransferBusy("current");
    setBusy(true);
    try {
      const { summary } = await uploadCurrentSnapshotToCloudVault(
        "cross-device-current-device",
        `Copie multi-appareils — ${new Date().toLocaleString("fr-FR")}`,
        { cloudCopyOnly: true, sourceDestination: selectedDestination }
      );
      await finishCloudTransfer(`Copie Cloud R2 créée : ${summary.matches} partie(s) • ${summary.profiles} profil(s) • ${summary.statsBlocks} stats. Elle est maintenant disponible sur les autres appareils connectés au même compte.`);
    } catch (error: any) {
      setMessage(`Copie multi-appareils impossible : ${error?.message || error}`);
    } finally {
      setCloudTransferBusy(null);
      setBusy(false);
    }
  };

  const publishFileToCloud = async (file: File | null) => {
    if (!file) return;
    if (!hasConnectedAccount) {
      setMessage("Connexion requise avant d’envoyer un fichier de sauvegarde vers Cloud R2.");
      return;
    }
    setCloudTransferBusy("file");
    setBusy(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const { summary } = await uploadSnapshotPayloadToCloudVault(
        parsed,
        `cross-device-file:${file.name || "backup"}`,
        `Fichier ${file.name || "sauvegarde"} — ${new Date().toLocaleString("fr-FR")}`,
        { cloudCopyOnly: true, sourceDestination: "external_manual" }
      );
      await finishCloudTransfer(`Fichier envoyé dans Cloud R2 : ${summary.matches} partie(s) • ${summary.profiles} profil(s). Tu peux maintenant le restaurer depuis un autre appareil.`);
    } catch (error: any) {
      setMessage(`Envoi du fichier vers Cloud R2 impossible : ${error?.message || error}`);
    } finally {
      setCloudTransferBusy(null);
      setBusy(false);
      if (cloudImportRef.current) cloudImportRef.current.value = "";
    }
  };

  const copyEntryToCloud = async (entry: SaveEntry) => {
    if (!hasConnectedAccount) {
      setMessage("Connexion requise avant de copier cette sauvegarde vers Cloud R2.");
      return;
    }
    if (!window.confirm(`Copier « ${entry.title} » vers Cloudflare R2 ?

Cette copie sera visible sur les autres appareils connectés au même compte.`)) return;
    setCloudTransferBusy("entry");
    setBusy(true);
    try {
      let payload: any = null;
      if (entry.source === "local" || entry.source === "file") {
        payload = decodeMaybeCompressedNasPayload((entry.slot as MemorySlot).payload);
      } else if (entry.source === "nas") {
        const id = String((entry.slot as NasSlot).id || "latest");
        payload = (await pullNasMemorySlot(id)).payload;
      } else {
        payload = (entry.slot as CloudSlot).__payload || (await pullCloudVaultSlot(entry.slot as CloudSlot)).payload;
      }
      const { summary } = await uploadSnapshotPayloadToCloudVault(
        payload,
        `cross-device-copy:${entry.source}`,
        `Copie de ${entry.title} — ${new Date().toLocaleString("fr-FR")}`,
        { cloudCopyOnly: true, sourceDestination: entry.source }
      );
      await finishCloudTransfer(`Sauvegarde copiée dans Cloud R2 : ${summary.matches} partie(s) • ${summary.profiles} profil(s). Elle est disponible sur tes autres appareils.`);
    } catch (error: any) {
      setMessage(`Copie vers Cloud R2 impossible : ${error?.message || error}`);
    } finally {
      setCloudTransferBusy(null);
      setBusy(false);
    }
  };

  const selectStorageDestination = async (destination: StorageDestinationId) => {
    const saved = saveStoragePrefs({
      selectedDestination: destination,
      preferExternalStorage: destination === "device_file" || destination === "external_sd_manual" || destination === "personal_cloud_manual",
      keepLocalSafetyCopy: true,
    });
    setStoragePrefs(saved);

    const label = getStorageDestination(destination).label;
    const needsSystemTarget = destination === "device_file" || destination === "external_sd_manual" || destination === "personal_cloud_manual";
    if (needsSystemTarget) setDestinationSetup(destination);
    setMessage(needsSystemTarget
      ? `Destination active : ${label}. Choisis maintenant l'emplacement exact dans la fenêtre de configuration.`
      : `Destination active : ${label}. Le prochain clic sur Sauvegarder écrira directement ici.`);

    // La préférence locale est la source de vérité immédiate. La copie serveur
    // est best-effort et ne doit jamais bloquer l'interface ni empêcher une
    // sauvegarde locale/fichier/R2.
    if (hasConnectedAccount) {
      const planId = destination === "founder_nas" ? "founder_nas" : saved.selectedCloudPlan;
      void withFastFallback(saveAccountStoragePreferences({
        planId,
        storageDestination: destination,
        metadata: {
          source: "storage-vault-page",
          keepLocalSafetyCopy: true,
          supabaseUsage: "auth_profile_only",
          heavyDataProvider: destination === "cloud_r2" ? "cloudflare_r2" : destination,
        },
      }), null, 2_500).catch(() => null);
    }
  };

  const runExternalBackupAction = async (action: "choose" | "save" | "download") => {
    setExternalBackupBusy(action);
    setBusy(true);
    const startedAt = performance.now();
    try {
      const prepared = await prepareCurrentBackupOnce();
      let next: ExternalBackupStatus;
      if (action === "choose") next = await chooseExternalBackupFileWithJson(prepared.snapshotJson, "storage-vault-manual");
      else if (action === "save") next = await writeExternalBackupJsonNow(prepared.snapshotJson, "storage-vault-manual", { requestPermission: true });
      else next = await downloadExternalBackupJson(prepared.snapshotJson, "storage-vault-download");
      setExternalBackupStatus(next);
      if (next.lastError) throw new Error(next.lastError);
      const duration = Math.max(1, Math.round(performance.now() - startedAt));
      setMessage(`Sauvegarde fichier créée en ${duration} ms · ${next.fileName || "copie téléchargée"} · ${formatStorageBytes(next.lastBytes || prepared.bytes)}.`);
      const estimate = await estimateBrowserStorage();
      setStorageEstimate(estimate);
    } catch (error: any) {
      if (String(error?.name || "") !== "AbortError") setMessage(`Sauvegarde fichier impossible : ${error?.message || error}`);
    } finally {
      setExternalBackupBusy(null);
      setBusy(false);
    }
  };

  const configureExternalDestination = async () => {
    const destination = destinationSetup ? getStorageDestination(destinationSetup) : null;
    if (!destination) return;
    setExternalBackupBusy("choose");
    try {
      const suggested = destinationSetup === "personal_cloud_manual"
        ? "multisports-scoring-cloud-nas.json"
        : destinationSetup === "external_sd_manual"
          ? "multisports-scoring-externe.json"
          : "multisports-scoring-backup.json";
      const next = await chooseExternalBackupTargetOnly(suggested);
      setExternalBackupStatus(next);
      if (next.lastError) throw new Error(next.lastError);
      if (next.configured) {
        setMessage(`Emplacement configuré : ${next.fileName || destination.label}. Le bouton Sauvegarder écrira dans cette cible.`);
        setDestinationSetup(null);
      } else {
        setMessage(`Le sélecteur d'écriture directe n'est pas disponible ici. Le bouton Sauvegarder ouvrira l'export système Android / navigateur pour choisir ${destination.label}.`);
      }
    } catch (error: any) {
      setMessage(`Configuration de ${destination.label} impossible : ${error?.message || error}`);
    } finally {
      setExternalBackupBusy(null);
    }
  };

  const createLocalSlot = async () => {
    setBusy(true);
    const startedAt = performance.now();
    try {
      const prepared = await prepareCurrentBackupOnce("full");
      const compressed = await getPreparedGzip(prepared);
      const slot = await createLocalMemorySlotFromSnapshot(
        prepared.snapshot,
        "Bloc local de sécurité",
        "manual",
        prepared.summary,
        prepared.snapshotJson,
        compressed,
      );
      setLocalSlots((current) => [slot, ...current.filter((item) => item.id !== slot.id)].slice(0, 10));
      const q = assessSave(prepared.summary);
      setMessage(`Bloc local créé en ${Math.max(1, Math.round(performance.now() - startedAt))} ms : ${q.label} · ${slot.summary.matches} parties • ${slot.summary.profiles} profils.`);
    } catch (error: any) {
      setMessage(`Création bloc local impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const pushCurrentToAccount = async () => {
    if (backupProvider === "cloud") {
      const ok = window.confirm("Envoyer l’état complet actuel de ce navigateur vers Cloudflare R2 ?");
      if (!ok) return;
      setBusy(true);
      try {
        const { summary } = await uploadCurrentSnapshotToCloudVault("manual-save-page-push", `État actuel cloud — ${new Date().toLocaleString("fr-FR")}`);
        setMessage(`Compte cloud mis à jour : ${summary.matches} parties • ${summary.profiles} profils • ${summary.statsBlocks} stats.`);
        await refresh();
      } catch (error: any) {
        setMessage(`Envoi cloud impossible : ${error?.message || error}`);
      } finally { setBusy(false); }
      return;
    }

    const token = await ensureNasTokenFromOnlineRuntime(currentAuthForVault);
    setAccountScopeId(getVaultCurrentUserId());
    if (!token) {
      setMessage("Sauvegarde NAS impossible : session NAS connectée en mémoire mais token non retrouvé. Retourne sur la page Connexion, déconnecte/reconnecte-toi, puis reviens ici.");
      return;
    }
    const ok = window.confirm("Envoyer l’état complet actuel de ce navigateur sur ton compte NAS ?");
    if (!ok) return;
    setBusy(true);
    try {
      const snapshot = await exportCloudSnapshot();
      const summary = strictSummaryForRestore(snapshot);
      const q = assessSave(summary);
      if (!q.restorable && !window.confirm(`Attention : le garde-fou ne trouve pas de parties fiables dans l’état actuel.\n\n${q.reason}\n\nEnvoyer quand même ?`)) return;
      await pushSnapshotToAccount(snapshot, "manual-save-page-push");
      setMessage(`Compte NAS mis à jour : ${summary.matches} parties • ${summary.profiles} profils • ${summary.statsBlocks} stats.`);
      await refresh();
    } catch (error: any) {
      setMessage(`Envoi au compte impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const createCloudBackup = async () => {
    const token = await ensureNasTokenFromOnlineRuntime(currentAuthForVault);
    setAccountScopeId(getVaultCurrentUserId());
    if (!token) {
      setMessage("Sauvegarde cloud impossible : session introuvable. Reconnecte-toi, puis relance la sauvegarde.");
      return;
    }
    const ok = window.confirm("Créer une sauvegarde complète vers Cloudflare R2 maintenant ?\n\nElle devient l’emplacement courant et les anciennes sauvegardes restent dans Archives.");
    if (!ok) return;
    setBusy(true);
    try {
      const { uploaded, summary } = await uploadCurrentSnapshotToCloudVault(
        "manual-storage-vault",
        `Sauvegarde cloud manuelle — ${new Date().toLocaleString("fr-FR")}`,
        { cloudCopyOnly: false, sourceDestination: "cloud_r2" }
      );
      const storedBytes = Number(uploaded?.object?.size_bytes || 0) || 0;
      setMessage(`Sauvegarde cloud créée. ${summary.matches} partie(s) • ${summary.profiles} profil(s) • ${fmtBytes(storedBytes)} stockés sur R2.`);
      await refresh();
    } catch (error: any) {
      setMessage(`Sauvegarde cloud impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const createNasBackup = async () => {
    const token = await ensureNasTokenFromOnlineRuntime(currentAuthForVault);
    setAccountScopeId(getVaultCurrentUserId());
    if (!token) {
      setMessage("Sauvegarde NAS impossible : token NAS introuvable malgré le compte détecté. Déconnecte/reconnecte-toi depuis le compte NAS, puis relance Créer sauvegarde NAS.");
      return;
    }
    const ok = window.confirm("Créer une sauvegarde NAS complète maintenant ?\n\nElle remplace l’emplacement courant et ajoute un point de restauration versionné.");
    if (!ok) return;
    setBusy(true);
    let localSafetySlot: MemorySlot | null = null;
    try {
      // La sécurité locale est créée AVANT tout appel réseau. Ainsi, même si le
      // NAS ou PostgreSQL tombe pendant l’opération, les données du navigateur
      // disposent immédiatement d’un point de restauration exploitable.
      localSafetySlot = await createLocalMemorySlot(
        `Sécurité locale avant sauvegarde NAS — ${new Date().toLocaleString("fr-FR")}`,
        "before-nas-backup"
      ).catch(() => null);

      const res: any = await createNasVersionedSnapshot();
      const summary = normalizeSummary(res?.summary || res?.summary?.after || {});
      setMessage(`Sauvegarde NAS créée. ${summary.matches || res?.summary?.after?.historyCount || ""} partie(s) détectée(s).${localSafetySlot ? " Une sécurité locale a aussi été conservée." : ""}`);
      await refresh();
    } catch (error: any) {
      const localNotice = localSafetySlot
        ? " Une sauvegarde locale de sécurité a néanmoins été créée sur cet appareil."
        : " La création de la sécurité locale a également échoué.";
      setMessage(`Sauvegarde NAS impossible : ${error?.message || error}.${localNotice}`);
      await refresh().catch(() => undefined);
    } finally { setBusy(false); }
  };

  const createSelectedDestinationBackup = async () => {
    if (busy) return;
    lastUserActionAtRef.current = Date.now();
    const destination = loadStoragePrefs().selectedDestination;
    const destinationLabel = getStorageDestination(destination).label;

    if (isBackgroundBackupRunning()) {
      setMessage("Une sauvegarde est déjà en cours en arrière-plan. Tu peux continuer à naviguer.");
      return;
    }

    // Les sélecteurs de fichier doivent rester attachés au geste utilisateur.
    // Cette branche reste donc au premier plan jusqu'au choix du fichier, puis
    // l'écriture est bornée et n'empêche pas la navigation globale de l'app.
    if (destination === "device_file" || destination === "external_sd_manual" || destination === "personal_cloud_manual") {
      const startedAt = performance.now();
      setBusy(true);
      setMessage(`Préparation du fichier vers ${destinationLabel}…`);
      try {
        const prepared = await prepareCurrentBackupOnce("full");
        const quality = assessSaveForProvider(prepared.summary, "local");
        if (!quality.restorable) throw new Error(`Sauvegarde refusée : ${quality.reason}`);
        let status: ExternalBackupStatus;
        if (!externalBackupStatus.configured && externalBackupStatus.supported) {
          status = await chooseExternalBackupFileWithJson(prepared.snapshotJson, "storage-vault-instant");
        } else if (externalBackupStatus.configured) {
          status = await writeExternalBackupJsonNow(prepared.snapshotJson, "storage-vault-instant", { requestPermission: true });
        } else {
          status = await downloadExternalBackupJson(prepared.snapshotJson, "storage-vault-instant");
        }
        setExternalBackupStatus(status);
        if (status.lastError) throw new Error(status.lastError);
        if (storagePrefs.keepLocalSafetyCopy) {
          const compressed = await getPreparedGzip(prepared);
          const slot = await createLocalMemorySlotFromSnapshot(
            prepared.snapshot,
            `Sécurité locale — Sauvegarde ${destinationLabel} — ${new Date().toLocaleString("fr-FR")}`,
            "manual",
            prepared.summary,
            prepared.snapshotJson,
            compressed,
          );
          setLocalSlots((current) => [slot, ...current.filter((item) => item.id !== slot.id)].slice(0, 10));
        }
        setMessage(`Sauvegarde fichier créée en ${Math.max(1, Math.round(performance.now() - startedAt))} ms · ${status.fileName || "fichier téléchargé"} · ${formatStorageBytes(status.lastBytes || prepared.bytes)}.`);
      } catch (error: any) {
        setMessage(`Sauvegarde impossible vers ${destinationLabel} : ${error?.message || error}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    setMessage(`Sauvegarde vers ${destinationLabel} lancée en arrière-plan. Tu peux changer de page et continuer à utiliser l'application.`);

    void startBackgroundBackupJob({
      destination,
      label: `Sauvegarde ${destinationLabel}`,
      successMessage: (result: any) => String(result?.message || `Sauvegarde ${destinationLabel} terminée.`),
      run: async (report) => {
        const startedAt = performance.now();
        const elapsed = () => `${Math.max(1, Math.round(performance.now() - startedAt))} ms`;
        const localLabel = `Sauvegarde ${destinationLabel} — ${new Date().toLocaleString("fr-FR")}`;

        report(5, `Contrôle de la destination ${destinationLabel}…`);
        if (destination === "cloud_r2") {
          const usage = directR2Usage || await getDirectR2Usage();
          setDirectR2Usage(usage);
          if (!isDirectR2PremiumWriteAllowed(usage)) {
            throw new Error("Cloud R2 est verrouillé sans offre PREMIUM active. Local, fichier, USB, SD et cloud personnel restent gratuits.");
          }
        }

        const preparedKind: PreparedBackupKind = destination === "cloud_r2" ? "cloud-fast" : "full";
        report(12, "Assemblage du snapshot local…");
        const prepared = await prepareCurrentBackupOnce(preparedKind);
        const quality = assessSaveForProvider(prepared.summary, destination === "cloud_r2" ? "cloud" : destination === "founder_nas" ? "nas" : "local");
        if (!quality.restorable) throw new Error(`Sauvegarde refusée : ${quality.reason}`);

        if (destination === "app_local") {
          report(48, "Compression locale rapide…");
          const compressed = await getPreparedGzip(prepared);
          report(76, "Écriture dans la mémoire locale…");
          const slot = await createLocalMemorySlotFromSnapshot(
            prepared.snapshot,
            localLabel,
            "manual",
            prepared.summary,
            prepared.snapshotJson,
            compressed,
          );
          setLocalSlots((current) => [slot, ...current.filter((item) => item.id !== slot.id)].slice(0, 10));
          return {
            message: `Sauvegarde locale créée en ${elapsed()} · ${prepared.summary.matches} partie(s) · ${prepared.summary.profiles} profil(s) · ${formatStorageBytes(compressed.byteLength)} compressés.`,
          };
        }

        if (destination === "cloud_r2") {
          // La sécurité locale complète est indépendante du snapshot R2 allégé.
          // Elle est lancée en parallèle et ne retarde jamais la confirmation R2.
          if (storagePrefs.keepLocalSafetyCopy) {
            void prepareCurrentBackupOnce("full")
              .then(async (fullPrepared) => {
                const compressed = await getPreparedGzip(fullPrepared);
                return createLocalMemorySlotFromSnapshot(
                  fullPrepared.snapshot,
                  `Sécurité locale — ${localLabel}`,
                  "manual",
                  fullPrepared.summary,
                  fullPrepared.snapshotJson,
                  compressed,
                );
              })
              .then((slot) => setLocalSlots((current) => [slot, ...current.filter((item) => item.id !== slot.id)].slice(0, 10)))
              .catch(() => null);
          }

          report(38, "Envoi des données vers Cloudflare R2…");
          const uploaded = await uploadCloudVaultSnapshotJson({
            snapshotJson: prepared.snapshotJson,
            title: localLabel,
            sourceDestination: "cloud_r2",
            metadata: {
              summary: prepared.summary,
              exportedAt: new Date().toISOString(),
              rawSizeBytes: prepared.bytes,
              engine: "background-backup-v45",
              mediaMirror: "background",
            },
          });
          report(88, "Finalisation de la rétention R2…");
          const item = uploaded.object as CloudSlot;
          item.__summary = prepared.summary;
          item.latest = true;
          setCloudSlots((current) => [item, ...current.filter((row) => row.id !== item.id)].slice(0, 2));
          setBackupProvider("cloud");
          writePreferredRemoteSource("cloud");
          if ((uploaded as any)?.usage) {
            const u: any = (uploaded as any).usage;
            setDirectR2Usage({
              usedBytes: Number(u.usedBytes || 0), quotaBytes: Number(u.quotaBytes || 0),
              remainingBytes: Number(u.remainingBytes || 0), percentUsed: Number(u.percentUsed || 0),
              planId: String(u.preference?.plan_id || u.planId || "free_test_100mb"),
              billingStatus: String(u.preference?.billing_status || u.billingStatus || "locked"),
              billingExempt: u.preference?.billing_exempt === true || u.billingExempt === true,
              retainedBackups: Number(u.retainedBackups || 1), retentionTotal: Number(u.retentionTotal || 2),
              writeAllowed: u.writeAllowed === true,
              premiumRequired: u.premiumRequired !== false,
            });
          }
          return {
            message: `Sauvegarde Cloud R2 créée en ${elapsed()} · ${prepared.summary.matches} partie(s) · ${formatStorageBytes(prepared.bytes)} · médias poursuivis séparément en arrière-plan.`,
          };
        }

        // NAS : un seul gzip est produit puis réutilisé à la fois pour le réseau
        // et pour la copie locale. Les deux écritures sont lancées en parallèle.
        report(30, "Compression unique du snapshot NAS…");
        const compressed = await getPreparedGzip(prepared);
        const localSafetyPromise = createLocalMemorySlotFromSnapshot(
          prepared.snapshot,
          `Sécurité locale avant NAS — ${new Date().toLocaleString("fr-FR")}`,
          "before-restore",
          prepared.summary,
          prepared.snapshotJson,
          compressed,
        ).then((localSlot) => {
          setLocalSlots((current) => [localSlot, ...current.filter((item) => item.id !== localSlot.id)].slice(0, 10));
          return localSlot;
        }).catch(() => null);

        report(46, "Connexion au NAS…");
        const token = await ensureNasTokenFromOnlineRuntime(currentAuthForVault);
        setAccountScopeId(getVaultCurrentUserId());
        if (!token) {
          void localSafetyPromise;
          throw new Error("Token NAS introuvable. La copie locale continue en arrière-plan, mais l'envoi NAS nécessite une reconnexion au compte NAS.");
        }
        const version = Number(prepared.snapshot?._v || prepared.snapshot?.v || 2) || 2;
        report(58, `Envoi NAS compressé (${formatStorageBytes(compressed.byteLength)})…`);
        const response = await pushSnapshotToNasFast(
          prepared.snapshotJson,
          version,
          "storage-vault-background-v45",
          token,
          prepared.summary,
          compressed,
        );
        report(90, "Confirmation et indexation NAS…");
        void localSafetyPromise;
        const nasSlot: NasSlot = {
          id: "latest",
          latest: true,
          createdAt: String(response?.updatedAt || new Date().toISOString()),
          updatedAt: String(response?.updatedAt || new Date().toISOString()),
          summary: normalizeSummary(response?.summary || prepared.summary),
        };
        setNasSlots((current) => {
          const next = [nasSlot, ...current.map((row) => ({ ...row, latest: false })).filter((row) => row.id !== "latest")].slice(0, 120);
          writeCachedNasSlots(next);
          return next;
        });
        setBackupProvider("nas");
        writePreferredRemoteSource("nas");
        return {
          message: `Sauvegarde NAS créée en ${elapsed()} · ${prepared.summary.matches} partie(s) · ${formatStorageBytes(compressed.byteLength)} envoyés · copie locale parallèle.`,
        };
      },
    })
      .then((result: any) => {
        setMessage(String(result?.message || `Sauvegarde ${destinationLabel} terminée.`));
        void refresh().catch(() => undefined);
      })
      .catch((error: any) => {
        setMessage(`Sauvegarde impossible vers ${destinationLabel} : ${error?.message || error}`);
      });
  };

  const confirmBackgroundRestore = (entry: SaveEntry, provider: BackupProvider): boolean => {
    const summary = normalizeSummary(entry.summary || {});
    const sourceLabel = provider === "cloud" ? "Cloud R2" : entry.source === "local" || entry.source === "file" ? "cet appareil" : "NAS";
    return window.confirm(
      `Restaurer "${entry.title}" depuis ${sourceLabel} ?\n\n` +
      `${summary.matches} parties • ${summary.historyRows} lignes historique • ${summary.profiles} profils • ${summary.statsBlocks} stats\n\n` +
      `La restauration continuera en arrière-plan. Tu pourras changer de page pendant le téléchargement et l’import.`
    );
  };

  const launchNativeRestore = (
    entry: SaveEntry,
    provider: BackupProvider,
    run: (report: BackgroundRestoreReporter) => Promise<{ summary: VaultSummary }>,
  ) => {
    if (isBackgroundRestoreRunning()) {
      setMessage("Une restauration est déjà en cours. Son avancement reste visible au-dessus de la navigation.");
      return;
    }
    if (isBackgroundBackupRunning()) {
      setMessage("Une sauvegarde est encore en cours. Attends sa fin avant de restaurer.");
      return;
    }
    if (!confirmBackgroundRestore(entry, provider)) return;

    setMessage("Restauration lancée en arrière-plan. Tu peux maintenant changer de page.");
    void startBackgroundRestoreJob({
      source: provider,
      label: entry.title,
      run,
      successMessage: (result) => {
        const summary = normalizeSummary(result?.summary || entry.summary || {});
        return `Restauration terminée : ${summary.matches} partie(s) et ${summary.profiles} profil(s) disponibles.`;
      },
    }).then((result) => {
      const summary = normalizeSummary(result?.summary || entry.summary || {});
      setMessage(`Restauration terminée : ${summary.matches} partie(s), ${summary.profiles} profil(s), ${summary.statsBlocks} stats.`);
    }).catch((error: any) => {
      setMessage(`Restauration impossible : ${error?.message || error}`);
    });
  };

  const restoreNas = async (entry: SaveEntry) => {
    const token = await ensureNasTokenFromOnlineRuntime(currentAuthForVault);
    setAccountScopeId(getVaultCurrentUserId());
    if (!token) {
      setMessage("Restauration NAS impossible : token NAS introuvable. Déconnecte/reconnecte-toi au compte NAS.");
      return;
    }

    const slot = entry.slot as NasSlot;
    const id = String(slot.id || "latest");
    const expectedBytes = Number(normalizeSummary(entry.summary).bytes || 0);

    if (Capacitor.isNativePlatform()) {
      launchNativeRestore(entry, "nas", async (report) => {
        report(4, `Connexion au NAS pour préparer ${entry.title}…`, "download");
        const pulled = await pullNasMemorySlot(id, {
          summaryHint: normalizeSummary(entry.summary),
          onProgress: (loadedBytes, totalBytes) => {
            const fallbackTotal = expectedBytes > 0 ? Math.ceil(expectedBytes * 4 / 3) : 0;
            const denominator = totalBytes > 0 ? totalBytes : fallbackTotal;
            const ratio = denominator > 0 ? Math.min(1, loadedBytes / denominator) : 0;
            const progress = 6 + Math.round(ratio * 44);
            const sizeText = denominator > 0
              ? `${fmtBytes(loadedBytes)} / ${fmtBytes(denominator)}`
              : fmtBytes(loadedBytes);
            report(progress, `Téléchargement NAS : ${sizeText}. Tu peux naviguer dans l’application.`, "download");
          },
        });
        report(52, "Téléchargement terminé. Décompression locale du snapshot…", "prepare");
        return restoreSnapshotIntoBrowserAndAccount(
          pulled.payload,
          `restore-nas:${id}`,
          entry.title,
          { skipConfirm: true, background: true, provider: "nas", report },
        );
      });
      return;
    }

    setBusy(true);
    try {
      setMessage(
        `Téléchargement manuel de la sauvegarde NAS${expectedBytes > 0 ? ` (${fmtBytes(expectedBytes)})` : ""}… ` +
        `Le NAS peut avoir besoin de quelques secondes pour préparer le fichier.`
      );
      const pulled = await pullNasMemorySlot(id);
      await restoreSnapshotIntoBrowserAndAccount(pulled.payload, `restore-nas:${id}`, entry.title, { provider: "nas" });
    } catch (error: any) {
      setMessage(`Restauration NAS impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const restoreCloud = async (entry: SaveEntry) => {
    if (Capacitor.isNativePlatform()) {
      launchNativeRestore(entry, "cloud", async (report) => {
        report(8, "Téléchargement de la sauvegarde Cloud R2…", "download");
        const slot = entry.slot as CloudSlot;
        const pulled = slot.__payload
          ? { payload: slot.__payload, summary: slot.__summary || strictSummaryForCloudPayload(slot.__payload) }
          : await pullCloudVaultSlot(slot);
        report(50, "Téléchargement Cloud terminé. Préparation du snapshot…", "prepare");
        return restoreSnapshotIntoBrowserAndAccount(
          pulled.payload,
          `restore-cloud:${slot.id}`,
          entry.title,
          { skipConfirm: true, background: true, provider: "cloud", report },
        );
      });
      return;
    }

    setBusy(true);
    try {
      const slot = entry.slot as CloudSlot;
      const pulled = slot.__payload
        ? { payload: slot.__payload, summary: slot.__summary || strictSummaryForCloudPayload(slot.__payload) }
        : await pullCloudVaultSlot(slot);
      await restoreSnapshotIntoBrowserAndAccount(pulled.payload, `restore-cloud:${slot.id}`, entry.title, { provider: "cloud" });
    } catch (error: any) {
      setMessage(`Restauration cloud impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const restoreLocal = async (entry: SaveEntry) => {
    if (Capacitor.isNativePlatform()) {
      launchNativeRestore(entry, "nas", async (report) => {
        report(44, "Lecture de la sauvegarde présente sur cet appareil…", "prepare");
        const slot = entry.slot as MemorySlot;
        const payload = decodeMaybeCompressedNasPayload(slot.payload);
        return restoreSnapshotIntoBrowserAndAccount(
          payload,
          `restore-local:${slot.id}`,
          entry.title,
          { skipConfirm: true, background: true, provider: "nas", report },
        );
      });
      return;
    }

    setBusy(true);
    try {
      const slot = entry.slot as MemorySlot;
      await restoreSnapshotIntoBrowserAndAccount(decodeMaybeCompressedNasPayload(slot.payload), `restore-local:${slot.id}`, entry.title, { provider: "nas" });
    } catch (error: any) {
      setMessage(`Restauration locale impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const importJsonFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const snapshot = unwrapSnapshotEnvelope(parsed);
      await restoreSnapshotIntoBrowserAndAccount(snapshot, `restore-json:${file.name || "snapshot"}`, file.name || "fichier JSON");
    } catch (error: any) {
      setMessage(`Import JSON impossible : ${error?.message || error}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const renderEntry = (entry: SaveEntry) => (
    <SaveCard
      key={entry.key}
      entry={entry}
      busy={busy || restoreRunning}
      onDetails={() => void openSaveDetails(entry)}
      onRestore={() => entry.source === "nas" ? restoreNas(entry) : entry.source === "cloud" ? restoreCloud(entry) : restoreLocal(entry)}
      onExport={async () => {
        try {
          if (entry.source === "nas") {
            const slot = entry.slot as NasSlot;
            const id = String(slot.id || "latest");
            const pulled = await pullNasMemorySlot(id);
            await exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${id}.json`);
          } else if (entry.source === "cloud") {
            const slot = entry.slot as CloudSlot;
            const pulled = slot.__payload
              ? { slot, payload: slot.__payload, summary: slot.__summary || strictSummaryForCloudPayload(slot.__payload) }
              : await pullCloudVaultSlot(slot);
            await exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${String(slot.id || "cloud").replace(/[^a-z0-9_-]/gi, "_")}.json`);
          } else {
            const localSlot = entry.slot as MemorySlot;
            await exportJsonDownload({ ...localSlot, payload: decodeMaybeCompressedNasPayload(localSlot.payload) }, `${localSlot.id}.json`);
          }
        } catch (error: any) {
          setMessage(`Export impossible : ${error?.message || error}`);
        }
      }}
      onCloudCopy={entry.source !== "cloud" && hasConnectedAccount ? () => void copyEntryToCloud(entry) : undefined}
      cloudCopyLabel={entry.source === "nas" ? "Copier ce NAS vers R2" : "Rendre disponible sur mes appareils"}
      onDelete={entry.source === "nas" && !(entry.slot as NasSlot).latest ? async () => {
        const slot = entry.slot as NasSlot;
        const id = String(slot.id || "");
        if (!window.confirm(`Envoyer cet emplacement NAS dans la corbeille ?\n\n${entry.title}\n\nTu pourras encore le récupérer depuis l’onglet Corbeille. Pour libérer définitivement la place serveur, il faudra vider la corbeille.`)) return;
        setBusy(true);
        try { await deleteNasMemorySlot(id); setMessage("Emplacement NAS envoyé dans la corbeille."); await refresh(); }
        catch (error: any) { setMessage(`Suppression NAS impossible : ${error?.message || error}`); }
        finally { setBusy(false); }
      } : entry.source === "cloud" && !(entry.slot as CloudSlot).latest ? async () => {
        const slot = entry.slot as CloudSlot;
        const id = String(slot.id || "");
        if (!window.confirm(`Envoyer cette sauvegarde cloud dans la corbeille ?\n\n${entry.title}\n\nTu pourras encore la récupérer depuis l’onglet Corbeille tant que celle-ci n’est pas vidée.`)) return;
        setBusy(true);
        try { await deleteCloudObjectIndex(id); setMessage("Sauvegarde cloud envoyée dans la corbeille."); await refresh(); }
        catch (error: any) { setMessage(`Suppression cloud impossible : ${error?.message || error}`); }
        finally { setBusy(false); }
      } : entry.source === "local" ? async () => {
        const slot = entry.slot as MemorySlot;
        if (!window.confirm(`Supprimer ce bloc local ?\n${entry.title}`)) return;
        await deleteLocalMemorySlot(slot.id);
        await refresh();
      } : undefined}
      deleteLabel={entry.source === "nas" && !(entry.slot as NasSlot).latest ? "Mettre corbeille" : entry.source === "cloud" && !(entry.slot as CloudSlot).latest ? "Mettre corbeille" : "Supprimer"}
    />
  );

  const renderTrashEntry = (entry: SaveEntry) => (
    <SaveCard
      key={entry.key}
      entry={entry}
      busy={busy || restoreRunning}
      onDetails={() => void openSaveDetails(entry)}
      restoreLabel="Sortir de la corbeille"
      exportLabel="Exporter JSON"
      deleteLabel="Supprimer définitivement"
      onRestore={async () => {
        const id = String((entry.slot as any).id || "");
        setBusy(true);
        try {
          if (entry.source === "cloud") {
            await restoreCloudObjectFromTrash(id);
            setMessage("Sauvegarde cloud sortie de la corbeille.");
          } else {
            await restoreNasDeletedMemorySlot(id);
            setMessage("Emplacement NAS sorti de la corbeille.");
          }
          await refresh();
        } catch (error: any) {
          setMessage(`Restauration corbeille impossible : ${error?.message || error}`);
        } finally { setBusy(false); }
      }}
      onExport={async () => {
        try {
          const id = String((entry.slot as any).id || "");
          if (entry.source === "cloud") {
            const pulled = await pullCloudVaultSlot(entry.slot as CloudSlot, { trash: true });
            await exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${id}.json`);
          } else {
            const pulled = await pullNasMemorySlot(id, { trash: true });
            await exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${id}.json`);
          }
        } catch (error: any) {
          setMessage(`Export corbeille impossible : ${error?.message || error}`);
        }
      }}
      onDelete={async () => {
        const id = String((entry.slot as any).id || "");
        const label = entry.source === "cloud" ? "cette sauvegarde cloud" : "cet emplacement NAS";
        if (!window.confirm(`Supprimer définitivement ${label} ?\n\n${entry.title}\n\nCette action libère la place serveur et sera irréversible.`)) return;
        setBusy(true);
        try {
          if (entry.source === "cloud") {
            await purgeCloudObjectRemote(id);
            setMessage("Sauvegarde cloud supprimée définitivement.");
          } else {
            await deleteNasMemorySlot(id, true);
            setMessage("Emplacement NAS supprimé définitivement.");
          }
          await refresh();
        }
        catch (error: any) { setMessage(`Suppression définitive impossible : ${error?.message || error}`); }
        finally { setBusy(false); }
      }}
    />
  );

  const emptyTrash = async () => {
    if (!trashRemoteEntries.length) return;
    const label = backupProvider === "cloud" ? "cloud" : "NAS";
    if (!window.confirm(`Vider la corbeille ${label} ?\n\n${trashRemoteEntries.length} emplacement(s) seront supprimés définitivement du serveur.`)) return;
    setBusy(true);
    try {
      if (backupProvider === "cloud") {
        await emptyCloudObjectTrash(CLOUD_VAULT_OBJECT_TYPE).catch(() => null);
        await emptyCloudObjectTrash(CLOUD_BACKUP_OBJECT_TYPE).catch(() => null);
        setMessage("Corbeille cloud vidée. Les sauvegardes supprimées sont définitivement perdues.");
      } else {
        await emptyNasDeletedMemorySlots();
        setMessage("Corbeille NAS vidée. Les sauvegardes supprimées sont définitivement perdues.");
      }
      await refresh();
    } catch (error: any) {
      setMessage(`Vidage corbeille impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const primaryBackupLabel = selectedDestination === "app_local"
    ? "Créer sauvegarde locale"
    : selectedDestination === "device_file"
      ? (externalBackupStatus.configured ? "Sauvegarder dans le fichier" : "Choisir un fichier")
      : selectedDestination === "external_sd_manual"
        ? (externalBackupStatus.configured ? "Sauvegarder sur le support externe" : "Choisir le support externe")
        : selectedDestination === "personal_cloud_manual"
          ? (externalBackupStatus.configured ? "Sauvegarder dans le cloud personnel" : "Choisir le dossier cloud")
          : selectedDestination === "cloud_r2"
          ? "Créer sauvegarde Cloud R2"
          : "Créer sauvegarde NAS";

  const remoteDestinationNeedsAccount = selectedDestination === "cloud_r2" || selectedDestination === "founder_nas";
  const cloudR2WriteLocked = selectedDestination === "cloud_r2" && directR2Usage !== null && !isDirectR2PremiumWriteAllowed(directR2Usage);
  const backgroundBackupRunning = backgroundBackup.status === "running";
  const primaryBackupDisabled = busy || backgroundBackupRunning || externalBackupBusy !== null || cloudR2WriteLocked || (remoteDestinationNeedsAccount && !hasConnectedAccount);

  const pageHelp = (
    <div style={{ display: "grid", gap: 10, lineHeight: 1.45 }}>
      <div><b>Restaurer</b> : retrouver la dernière sauvegarde, les archives ou la corbeille.</div>
      <div><b>Parties</b> : remettre une seule partie sans remplacer tout le compte.</div>
      <div><b>Sauver</b> : choisir une destination puis lancer une sauvegarde complète.</div>
      <div><b>Expert</b> : diagnostic brut, réservé aux dépannages.</div>
      <div style={{ color: green, fontWeight: 900 }}>Les textes détaillés sont désormais rangés derrière les boutons d’information.</div>
    </div>
  );

  const cloudR2Details = (
    <div style={{ display: "grid", gap: 8, lineHeight: 1.45 }}>
      <div style={{ color: directR2Status?.ok ? green : amber, fontWeight: 1000 }}>
        {directR2Status == null
          ? "Vérification Cloudflare R2…"
          : directR2Status.ok
            ? "R2 DIRECT PRÊT — indépendant du NAS"
            : "R2 DIRECT INCOMPLET"}
      </div>
      <div>Les parties, historiques, statistiques, sauvegardes et médias sont stockés dans <b style={{ color: neon }}>Cloudflare R2</b>. Supabase reste limité à l’authentification et à l’index léger.</div>
      {directR2Usage ? (() => {
        const plan = getStoragePlan(directR2Usage.planId);
        const unlimited = directR2Usage.billingExempt || directR2Usage.quotaBytes >= Number.MAX_SAFE_INTEGER;
        return (
          <div style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(34,211,238,.24)", background: "rgba(34,211,238,.05)" }}>
            <div><b style={{ color: neon }}>Offre : {plan.label}</b></div>
            <div style={{ marginTop: 3, color: muted }}>
              {unlimited ? "Quota administrateur" : `${formatStorageBytes(directR2Usage.usedBytes)} / ${formatStorageBytes(directR2Usage.quotaBytes)}`} · {directR2Usage.retainedBackups}/{directR2Usage.retentionTotal} sauvegarde(s)
            </div>
          </div>
        );
      })() : null}
      {directR2Usage && !isDirectR2PremiumWriteAllowed(directR2Usage) ? (
        <div style={{ color: amber, fontWeight: 900 }}>PREMIUM requis : aucune nouvelle écriture R2 n’est autorisée. Local, fichier, USB, SD et cloud personnel restent disponibles.</div>
      ) : null}
      {directR2Status ? (
        <div style={{ color: directR2Status.ok ? green : amber, fontSize: 11 }}>
          Bucket : {directR2Status.bucketReady ? "OK" : "MANQUANT"} · Auth Supabase : {directR2Status.supabaseAuthConfigured ? "OK" : "NON"} · Auth NAS : {directR2Status.nasJwtConfigured ? "OK" : "NON"}
          {!directR2Status.ok && directR2Status.message ? ` · ${directR2Status.message}` : ""}
        </div>
      ) : null}
      {directR2Usage && !directR2Usage.billingExempt ? (
        <button
          type="button"
          onClick={() => { window.location.hash = "#/settings?account=storage"; }}
          style={{ ...btn, borderColor: gold, color: gold, width: "100%" }}
        >
          Gérer / souscrire à une offre Cloud PREMIUM
        </button>
      ) : null}
    </div>
  );

  const externalTargetDetails = (
    <div style={{ display: "grid", gap: 7, lineHeight: 1.45 }}>
      <div style={{ color: externalBackupStatus.configured ? green : amber, fontWeight: 1000 }}>
        {externalBackupStatus.configured ? externalBackupStatus.fileName || "Fichier configuré" : "Aucun fichier sélectionné"}
      </div>
      <div style={{ color: externalBackupStatus.permission === "granted" ? green : muted, fontWeight: 900 }}>
        {externalBackupStatus.permission === "granted" ? "Écriture autorisée" : externalBackupStatus.supported ? "Autorisation à donner" : "Téléchargement manuel"}
      </div>
      <div>Le fichier peut se trouver sur le PC, un HDD, une clé USB, une carte SD, un partage NAS monté ou un dossier synchronisé Google Drive / OneDrive / Dropbox / Nextcloud.</div>
      {externalBackupStatus.lastSavedAt ? <div style={{ color: green }}>Dernière écriture : {new Date(externalBackupStatus.lastSavedAt).toLocaleString("fr-FR")} · {formatStorageBytes(externalBackupStatus.lastBytes || 0)}</div> : null}
      {externalBackupStatus.lastError ? <div style={{ color: red }}>{externalBackupStatus.lastError}</div> : null}
    </div>
  );

  const destinationHelp = (destination: ReturnType<typeof getStorageDestination>) => (
    <div style={{ display: "grid", gap: 8, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 1000, color: gold }}>{destination.label}</div>
      <div>{destination.description}</div>
      {destination.warning ? <div style={{ color: amber }}>{destination.warning}</div> : null}
      {destination.id === "app_local" ? <div style={{ color: green }}>Utilisé : {formatStorageBytes(storageEstimate.usage)} · Libre estimé : {formatStorageBytes(storageEstimate.free)} · Quota : {formatStorageBytes(storageEstimate.quota)}</div> : null}
      {destination.id === "cloud_r2" ? cloudR2Details : null}
      {destination.id === "device_file" || destination.id === "external_sd_manual" || destination.id === "personal_cloud_manual" ? externalTargetDetails : null}
      {destination.id === "personal_cloud_manual" ? <div style={{ color: neon }}>Compatible avec Google Drive / OneDrive / Dropbox / Nextcloud, Synology Drive, QNAP et tout partage NAS monté dans le sélecteur système.</div> : null}
      {destination.id === "founder_nas" ? <div style={{ color: neon, fontWeight: 900 }}>Destination privée du compte fondateur. La sécurité locale est conservée avant l’envoi et les archives restent restaurables.</div> : null}
    </div>
  );

  const destinationIconName = (id: StorageDestinationId): VaultGlyphName => id === "app_local" ? "local" : id === "device_file" ? "file" : id === "external_sd_manual" ? "sd" : id === "personal_cloud_manual" ? "folder" : id === "cloud_r2" ? "cloud" : "nas";

  return (
    <div style={{ ...pageStyle, paddingTop: 8, ...themeVars }}>
      <div style={shellStyle}>
        <StorageTickerHeader
          ticker={lang === "fr" ? tickerStorageBackupFr : tickerStorageBackupEn}
          alt={pickLegacyLocalizedText(lang, "Centre de sauvegarde", "Backup center", "Centro de copias de seguridad")}
          busy={busy || restoreRunning}
          help={pageHelp}
          onBack={() => { try { if (window.history.length > 1) window.history.back(); else go?.("settings"); } catch { go?.("settings"); } }}
          onRefresh={() => void refresh()}
        />

        <div style={{ ...panel, padding: 11, marginBottom: 10, borderColor: accentSoftBorder }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
            {[
              ["PARTIES", headerSummary.matches, gold],
              ["PROFILS", headerSummary.profiles, neon],
              ["STATS", headerSummary.statsMatches || headerSummary.statsBlocks, green],
            ].map(([label, value, color]) => (
              <div key={String(label)} style={{ border: "1px solid rgba(148,163,184,.18)", borderRadius: 14, padding: 9, textAlign: "center", background: "rgba(2,6,23,.62)" }}>
                <div style={{ color: muted, fontSize: 9.5, fontWeight: 1000 }}>{label}</div>
                <div style={{ color: String(color), fontSize: 21, fontWeight: 1000, marginTop: 3 }}>{String(value)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginTop: 8, color: muted, fontSize: 10.5 }}>
            <span style={wrapText}>Dernière sauvegarde affichée : <b style={{ color: "#fff" }}>{fmtDate(headerDate)}</b></span>
            <MiniInfoButton title="Signification des compteurs" color={neon} content={<div style={{ display: "grid", gap: 7 }}><div><b>Parties</b> : nombre total de parties contenues dans la sauvegarde.</div><div><b>Profils</b> : profils locaux réellement sauvegardés.</div><div><b>Stats</b> : nombre de parties possédant des volées, impacts, scores ou statistiques exploitables.</div></div>}/>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>
          <VaultNavButton active={tab === "restore"} icon="restore" label="Restaurer" onClick={() => setTab("restore")}/>
          <VaultNavButton active={tab === "matches"} icon="matches" label="Parties" onClick={() => setTab("matches")}/>
          <VaultNavButton active={tab === "backup"} icon="save" label="Sauver" onClick={() => setTab("backup")}/>
          <VaultNavButton active={tab === "diagnostic"} icon="expert" label="Expert" onClick={() => setTab("diagnostic")}/>
        </div>

        <div style={{ ...panel, padding: "9px 11px", marginBottom: 10, borderColor: busy || restoreRunning ? "rgba(251,191,36,.48)" : "rgba(34,211,238,.22)", display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
          <span style={{ color: busy || restoreRunning ? amber : green, lineHeight: 0 }}>{busy || restoreRunning ? <VaultGlyph name={restoreRunning ? "restore" : "save"} size={20}/> : <VaultGlyph name="shield" size={20}/>}</span>
          <div title={message} style={{ color: "#d9e2ef", fontSize: 11.5, fontWeight: 800, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.25 }}>{message}</div>
          <MiniInfoButton title="État détaillé" color={busy || restoreRunning ? amber : neon} content={<div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{message}</div>}/>
          {busy || restoreRunning ? <div style={{ gridColumn: "1 / -1", height: 3, borderRadius: 999, overflow: "hidden", background: "rgba(251,191,36,.14)" }}><div style={{ width: "42%", height: "100%", borderRadius: 999, background: amber, boxShadow: `0 0 12px ${amber}`, animation: "dcVaultBusy 1.1s ease-in-out infinite alternate" }}/></div> : null}
        </div>

        {tab === "restore" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...panel, padding: 11 }}>
              <CompactSectionTitle title="SOURCE DE RESTAURATION" color={neon} info={<div>La source choisie ici est indépendante de la destination utilisée dans l’onglet Sauver. NAS ne peut donc plus être écrasé par une destination R2 active.</div>}/>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                {canUsePrivateNas ? (
                  <VaultActionButton icon="nas" label="NAS privé" active={restoreSource === "nas"} onClick={() => void selectRemoteRestoreSource("nas")}/>
                ) : null}
                <VaultActionButton icon="cloud" label="Cloud R2" active={restoreSource === "cloud"} onClick={() => void selectRemoteRestoreSource("cloud")}/>
                <VaultActionButton icon="local" label="Cet appareil" active={restoreSource === "local"} onClick={selectLocalRestoreSource}/>
                <VaultActionButton icon="file" label="Fichier / SD / Cloud perso" active={restoreSource === "file"} onClick={selectFileRestoreSource}/>
                <input ref={restoreFileRef} type="file" accept="application/json,.json,.dcbackup" style={{ display: "none" }} onChange={(event) => void loadRestoreFile(event.currentTarget.files?.[0] || null)}/>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: restoreSource === "file" ? "1fr" : restoreSource === "local" ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
                <VaultActionButton icon="current" label="Dernière" active={restoreView === "current"} onClick={() => setRestoreView("current")}/>
                {restoreSource !== "file" ? <VaultActionButton icon="archive" label={`Archives ${currentRestoreArchives.length}`} active={restoreView === "archives"} onClick={() => setRestoreView("archives")}/> : null}
                {restoreSource === "nas" || restoreSource === "cloud" ? <VaultActionButton icon="trash" label={`Corbeille ${trashRemoteEntries.length}`} active={restoreView === "trash"} onClick={() => setRestoreView("trash")}/> : null}
              </div>
            </div>

            {restoreView === "current" && (currentRestoreEntry
              ? renderEntry(currentRestoreEntry)
              : <CompactEmpty
                  title={restoreSource === "file" ? "Sélectionne un fichier de sauvegarde" : restoreSource === "local" ? "Aucune sauvegarde locale" : `Aucune sauvegarde ${restoreSource === "nas" ? "NAS" : "Cloud R2"} courante`}
                  detail={restoreSource === "file" ? "Le fichier sera d’abord analysé et affiché. Rien ne sera restauré avant confirmation." : "Crée une sauvegarde depuis l’onglet Sauver, puis actualise."}
                />)}

            {restoreView === "archives" && restoreSource !== "file" ? (
              <>
                {currentRestoreArchives.map(renderEntry)}
                {!currentRestoreArchives.length ? <CompactEmpty title="Aucune archive restaurable"/> : null}
              </>
            ) : null}

            {restoreView === "trash" && (restoreSource === "nas" || restoreSource === "cloud") ? (
              <>
                <div style={{ ...panel, padding: 11 }}>
                  <CompactSectionTitle title="CORBEILLE" color={red} info={<div>Une sauvegarde placée ici reste récupérable. Le bouton « Vider » la supprime définitivement du serveur.</div>} right={<button style={{ ...dangerBtn, padding: "7px 10px", fontSize: 10.5 }} disabled={busy || restoreRunning || !trashRemoteEntries.length} onClick={emptyTrash}>Vider</button>}/>
                </div>
                {trashRemoteEntries.length ? trashRemoteEntries.map(renderTrashEntry) : <CompactEmpty title="Corbeille vide"/>}
              </>
            ) : null}
          </div>
        )}

        {tab === "matches" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...panel, padding: 11 }}><CompactSectionTitle title="PARTIES À L’UNITÉ" color={green} info={<div>Chaque bloc restaure une seule partie dans l’Historique. Aucune autre partie ni aucun profil n’est remplacé.</div>} right={<button type="button" style={{ ...btn, width: 35, height: 35, padding: 0, borderRadius: 999, display: "grid", placeItems: "center" }} onClick={() => void refresh()}><VaultGlyph name="refresh" size={19}/></button>}/></div>
            {matchBackupEntries.length ? matchBackupEntries.map((item) => <MatchBackupCard key={`${item.origin || "local"}:${item.matchId || item.id}`} item={item} busy={busy || restoreRunning} onRestore={() => restoreSingleMatch(item)} onExport={() => exportSingleMatch(item)} onDelete={() => deleteSingleMatch(item)}/>) : <CompactEmpty title="Aucune sauvegarde de partie détectée" detail="Les nouvelles parties terminées seront ajoutées automatiquement."/>}
          </div>
        )}

        {tab === "backup" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...panel, padding: 11 }}>
              <CompactSectionTitle title="DESTINATION" color={gold} info={<div>Choisis l’emplacement principal. Le choix est mémorisé. Une sécurité locale peut être conservée en parallèle.</div>}/>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                {[...getPublicStorageDestinations(), getStorageDestination("founder_nas")].map((destination) => {
                  const active = selectedDestination === destination.id;
                  const accountRequired = destination.id === "cloud_r2" || destination.id === "founder_nas";
                  const disabled = busy || (accountRequired && !hasConnectedAccount);
                  return (
                    <div key={destination.id} style={{ position: "relative", minWidth: 0 }}>
                      <button type="button" disabled={disabled} onClick={() => void selectStorageDestination(destination.id)} style={{ width: "100%", minHeight: 82, padding: "10px 38px 9px 10px", borderRadius: 16, border: active ? `1px solid ${gold}` : "1px solid rgba(148,163,184,.24)", background: active ? accentSoftBg : "rgba(15,23,42,.72)", color: active ? gold : "#e5e7eb", boxShadow: active ? `0 0 17px ${accentGlow}` : "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .48 : 1, display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", alignItems: "center", gap: 8, textAlign: "left" }}>
                        <span style={{ color: active ? gold : neon, lineHeight: 0 }}><VaultGlyph name={destinationIconName(destination.id)} size={29}/></span>
                        <span><b style={{ display: "block", fontSize: 11.5, lineHeight: 1.15 }}>{destination.shortLabel}</b><small style={{ display: "block", color: active ? green : muted, fontSize: 9.5, marginTop: 4 }}>{active ? "ACTIF" : accountRequired && !hasConnectedAccount ? "CONNEXION" : "SÉLECTIONNER"}</small></span>
                      </button>
                      <div style={{ position: "absolute", top: 8, right: 7 }}><MiniInfoButton title={destination.shortLabel} color={active ? gold : neon} content={destinationHelp(destination)}/></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ ...panel, padding: 12, borderColor: accentSoftBorder }}>
              <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${gold}`, color: gold, display: "grid", placeItems: "center", background: accentSoftBg }}><VaultGlyph name={destinationIconName(selectedDestination)} size={27}/></div>
                <div style={{ minWidth: 0 }}><div style={{ color: muted, fontSize: 9.5, fontWeight: 900 }}>DESTINATION ACTIVE</div><strong style={{ color: "#fff", fontSize: 13.5, ...wrapText }}>{activeDestination.label}</strong></div>
                <MiniInfoButton title={activeDestination.shortLabel} color={green} content={<div style={{ display: "grid", gap: 9 }}><div>La sauvegarde inclut les parties, l’Historique, les profils, les statistiques, les compétitions et les références médias. Les blocs incomplets sont refusés par le garde-fou.</div>{destinationHelp(activeDestination)}</div>}/>
              </div>
              {selectedDestination === "app_local" ? <div style={{ marginTop: 9, color: muted, fontSize: 10.5 }}>Libre estimé : <b style={{ color: green }}>{formatStorageBytes(storageEstimate.free)}</b></div> : null}
              {selectedDestination === "cloud_r2" && cloudR2WriteLocked ? <div style={{ marginTop: 9, color: amber, fontSize: 10.5, fontWeight: 900 }}>Cloud R2 verrouillé : offre PREMIUM requise.</div> : null}
              {remoteDestinationNeedsAccount && !hasConnectedAccount ? <div style={{ marginTop: 9, color: red, fontSize: 10.5, fontWeight: 900 }}>Connexion requise pour cette destination.</div> : null}
              <button type="button" style={{ ...primaryBtn, width: "100%", minHeight: 58, marginTop: 11, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }} disabled={primaryBackupDisabled} onClick={() => void createSelectedDestinationBackup()}><VaultGlyph name="save" size={24}/>{backgroundBackupRunning ? `SAUVEGARDE EN ARRIÈRE-PLAN ${Math.max(1, Math.round(backgroundBackup.progress))}%` : busy ? "OPÉRATION EN COURS…" : primaryBackupLabel.toUpperCase()}</button>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 8 }}>
                {selectedDestination !== "app_local" ? <VaultActionButton icon="shield" label="Sécurité locale" disabled={busy} onClick={createLocalSlot}/> : <VaultActionButton icon="download" label="Exporter JSON" disabled={busy} onClick={() => void runExternalBackupAction("download")}/>} 
                <VaultActionButton icon="upload" label="Importer JSON" disabled={busy} onClick={() => inputRef.current?.click()}/>
                <input ref={inputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => importJsonFile(e.currentTarget.files?.[0] || null)}/>
              </div>
            </div>

            {(selectedDestination === "device_file" || selectedDestination === "external_sd_manual" || selectedDestination === "personal_cloud_manual") ? (
              <div style={{ ...panel, padding: 11 }}>
                <CompactSectionTitle title="FICHIER EXTERNE" color={neon} info={<div>Choisis un fichier une fois, puis le bouton Écrire mettra ce même fichier à jour. Si l’accès direct est refusé, un téléchargement JSON est proposé automatiquement.</div>}/>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
                  <VaultActionButton icon="folder" label={externalBackupStatus.configured ? "Changer" : "Configurer"} disabled={busy || externalBackupBusy !== null} onClick={() => setDestinationSetup(selectedDestination)}/>
                  <VaultActionButton icon="save" label="Écrire" disabled={busy || externalBackupBusy !== null || !externalBackupStatus.configured} onClick={() => void runExternalBackupAction("save")}/>
                  <VaultActionButton icon="download" label="Télécharger" disabled={busy || externalBackupBusy !== null} onClick={() => void runExternalBackupAction("download")}/>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {tab === "diagnostic" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...panel, padding: 11 }}>
              <CompactSectionTitle title="MODE EXPERT" color={amber} info={<div>Scanne IndexedDB/localStorage puis recherche dans le contenu technique sans restaurer quoi que ce soit. La recherche couvre notamment les parties, identifiants, dates, profils/joueurs, modes, sets/dartsets, stores et clés.</div>}/>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <VaultActionButton icon="refresh" label="Scanner" disabled={busy} onClick={() => void refresh()}/>
                <VaultActionButton icon="expert" label={showDiagnostic ? "Masquer blocs" : `Afficher ${technicalCount}`} active={showDiagnostic} onClick={() => setShowDiagnostic((v) => !v)}/>
              </div>

              <div style={{ marginTop: 10, border: `1px solid ${accentSoftBorder}`, background: accentSoftBg, borderRadius: 14, padding: 10 }}>
                <label style={{ display: "grid", gap: 6, color: neon, fontWeight: 1000, fontSize: 11 }}>
                  RECHERCHE EXPERT GLOBALE
                  <input
                    type="search"
                    value={expertSearchQuery}
                    onChange={(event) => { setExpertSearchQuery(event.currentTarget.value); setShowDiagnostic(true); }}
                    placeholder="Partie, ID, 22/08/2026, Vincent, X01, profil, dartset…"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{ width: "100%", minHeight: 44, borderRadius: 11, border: `1px solid ${accentSoftBorder}`, background: "rgba(2,6,23,.88)", color: "#fff", padding: "9px 10px", fontWeight: 900 }}
                  />
                </label>
                <div style={{ color: muted, fontSize: 10.5, lineHeight: 1.45, marginTop: 7 }}>
                  Plusieurs mots sont combinés : par exemple <b style={{ color: "#fff" }}>X01 Vincent 22/08/2026</b> ne garde que les blocs contenant tous ces éléments. Les données médias lourdes ne sont pas indexées.
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginTop: 8, color: muted, fontSize: 10.5 }}>
                  <span>{expertSearchQuery.trim() ? `${filteredTechnicalBlocks.length} résultat(s) sur ${technicalCount} bloc(s)` : `${technicalCount} bloc(s) indexé(s)`}</span>
                  {expertSearchQuery ? <button type="button" onClick={() => setExpertSearchQuery("")} style={{ ...btn, minHeight: 32, padding: "5px 9px", fontSize: 10 }}>Effacer recherche</button> : null}
                </div>
              </div>

              <div style={{ marginTop: 10, border: "1px solid rgba(251,191,36,.30)", background: "rgba(251,191,36,.05)", borderRadius: 14, padding: 10 }}>
                <label style={{ display: "grid", gap: 6, color: amber, fontWeight: 1000, fontSize: 11 }}>
                  FILTRE DATE PRÉCIS
                  <input
                    type="date"
                    value={expertDateFilter}
                    onChange={(event) => { setExpertDateFilter(event.currentTarget.value); setShowDiagnostic(true); }}
                    style={{ width: "100%", minHeight: 42, borderRadius: 11, border: "1px solid rgba(251,191,36,.42)", background: "rgba(2,6,23,.88)", color: "#fff", padding: "8px 10px", fontWeight: 900, colorScheme: "dark" }}
                  />
                </label>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginTop: 8, color: muted, fontSize: 10.5 }}>
                  <span>{expertDateFilter ? `${filteredTechnicalBlocks.length} résultat(s) après filtre date${expertSearchQuery.trim() ? " + recherche" : ""}` : "Optionnel : limite les résultats à une journée."}</span>
                  {expertDateFilter ? <button type="button" onClick={() => setExpertDateFilter("")} style={{ ...btn, minHeight: 32, padding: "5px 9px", fontSize: 10 }}>Effacer date</button> : null}
                </div>
              </div>
            </div>
            <div style={{ ...panel, padding: 11 }}>
              <CompactSectionTitle title="TRANSFÉRER VERS UN AUTRE APPAREIL" color={gold} info={<div>Cette fonction ne synchronise pas deux téléphones en direct. Elle crée une copie transportable, puis l’autre appareil la restaure.</div>}/>
              <div style={{ display: "grid", gap: 9 }}>
                <div style={{ border: "1px solid rgba(52,211,153,.28)", borderRadius: 14, padding: 11, background: "rgba(52,211,153,.05)" }}>
                  <div style={{ color: green, fontWeight: 1000 }}>MÉTHODE GRATUITE</div>
                  <div style={{ color: "#dbe5f1", fontSize: 11.5, lineHeight: 1.45, marginTop: 5 }}>Exporte un fichier, envoie-le sur l’autre appareil, puis ouvre Restaurer → Fichier / SD / Cloud perso.</div>
                  <button type="button" style={{ ...btn, width: "100%", marginTop: 8 }} disabled={busy} onClick={() => void runExternalBackupAction("download")}>Exporter un fichier de transfert</button>
                </div>
                <div style={{ border: "1px solid rgba(217,255,51,.28)", borderRadius: 14, padding: 11, background: accentSoftBg }}>
                  <div style={{ color: gold, fontWeight: 1000 }}>MÉTHODE CLOUD PREMIUM</div>
                  <div style={{ color: "#dbe5f1", fontSize: 11.5, lineHeight: 1.45, marginTop: 5 }}>Crée une copie R2. Sur l’autre appareil, connecte le même compte puis ouvre Restaurer → Cloud R2.</div>
                  <button type="button" style={{ ...btn, width: "100%", marginTop: 8, borderColor: gold, color: gold }} disabled={busy || !hasConnectedAccount || cloudTransferBusy !== null} onClick={() => void publishCurrentDeviceToCloud()}>{cloudTransferBusy === "current" ? "Envoi en cours…" : "Créer la copie R2 pour l’autre appareil"}</button>
                </div>
              </div>
            </div>
            {showDiagnostic ? (
              filteredTechnicalBlocks.length ? filteredTechnicalBlocks.map((block) => <TechnicalBlockCard key={`diag-${block.id}`} block={block} busy={busy || restoreRunning} onExport={() => { void exportJsonDownload(block, `${block.id.replace(/[^a-z0-9_-]/gi, "_")}.json`).catch((error: any) => setMessage(`Export diagnostic impossible : ${error?.message || error}`)); }}/>) : (
                <div style={{ ...panel, padding: 14, borderColor: "rgba(251,191,36,.28)", color: "#fff" }}>
                  <strong style={{ color: amber }}>{expertSearchQuery.trim() ? "Aucun bloc ne correspond à cette recherche." : "Aucun bloc trouvé pour cette date."}</strong>
                  <div style={{ color: muted, fontSize: 11.5, marginTop: 5 }}>
                    {expertSearchQuery.trim()
                      ? <>Essaie un terme plus court, uniquement un nom de joueur/profil, un ID de partie, un mode comme X01 ou une date. Tu peux aussi effacer le filtre date s’il est actif.</>
                      : <>Essaie d’effacer le filtre pour vérifier les dates voisines ou les blocs dont la date interne n’a pas pu être détectée.</>}
                  </div>
                </div>
              )
            ) : null}
          </div>
        )}
      </div>
      <BackupDetailsModal state={detailsState} onClose={() => setDetailsState(null)}/>
      <DestinationSetupModal
        destination={destinationSetup ? getStorageDestination(destinationSetup) : null}
        status={externalBackupStatus}
        busy={externalBackupBusy === "choose"}
        onClose={() => setDestinationSetup(null)}
        onChoose={() => void configureExternalDestination()}
      />
      <style>{`@keyframes dcVaultBusy { from { transform: translateX(-40%); opacity:.45 } to { transform: translateX(140%); opacity:1 } }`}</style>
    </div>
  );
}
