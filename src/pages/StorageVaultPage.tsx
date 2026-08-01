import * as React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { gzipSync, strToU8 } from "fflate";
import { useTheme } from "../contexts/ThemeContext";
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
  refreshStatsIndexFromHistoryNow,
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

type Props = { go?: (tab: any, params?: any) => void };
type TabKey = "restore" | "backup" | "matches" | "diagnostic";
type RestoreView = "current" | "archives" | "trash";
type SaveSource = "nas" | "local" | "cloud";
type BackupProvider = "nas" | "cloud";
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

function persistNasAuthForVault(authLike?: any): string {
  if (typeof window === "undefined") return "";

  let token = readAuthTokenFromObject(authLike || {});
  let refreshToken = readRefreshTokenFromObject(authLike || {});
  let userId = String(authLike?.userId || authLike?.user?.id || readUserIdFromObject(authLike || "") || "").trim();

  try {
    const raw = window.localStorage.getItem("dc_online_auth_supabase_v1") || "";
    if (raw) {
      const cached = JSON.parse(raw);
      token = token || readAuthTokenFromObject(cached);
      refreshToken = refreshToken || readRefreshTokenFromObject(cached);
      userId = userId || readUserIdFromObject(cached);
    }
  } catch {}

  try {
    token = token || readNasAccessToken();
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

  return token || "";
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
      statsBlocks: Math.max(base.statsBlocks, statsIds ? 1 : 0),
      probableContent: Array.from(new Set([...(base.probableContent || []), "historique réel", "parties"])),
    };
  }

  if (statsIds > 0) {
    return {
      ...base,
      matches: statsIds,
      historyRows: 0,
      statsBlocks: Math.max(base.statsBlocks, 1),
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
  if (!historyCount && !profilesCount && !dartsetsCount && !rawSize) return null;
  return {
    bytes: rawSize,
    keys: 0,
    profiles: profilesCount,
    matches: historyCount,
    historyRows: historyCount,
    statsBlocks: Number(nested.statsBlocks || 0) || 0,
    mediaRefs: Number(nested.mediaRefs || 0) || 0,
    dataImages: Number(nested.dataImages || 0) || 0,
    sports: Array.isArray(nested.sports) ? nested.sports : [],
    names: Array.isArray(nested.names) ? nested.names : [],
    exportedAt: nested.exportedAt || meta.exportedAt || item?.created_at || null,
    probableContent: [
      historyCount ? "historique réel" : "",
      profilesCount ? "profils" : "",
      dartsetsCount ? "dartsets" : "",
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

function assessSaveForProvider(summary?: Partial<VaultSummary> | null, provider: BackupProvider = "nas"): SaveQuality {
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
  return {
    bytes: n(s.bytes),
    keys: n(s.keys),
    profiles: n(s.profiles),
    matches: n(s.matches),
    historyRows: n(s.historyRows),
    statsBlocks: n(s.statsBlocks || s.stats),
    mediaRefs: n(s.mediaRefs),
    dataImages: n(s.dataImages),
    sports: Array.isArray(s.sports) ? s.sports.map(String).filter(Boolean).slice(0, 16) : [],
    names: Array.isArray(s.names) ? s.names.map(String).filter(Boolean).slice(0, 20) : [],
    exportedAt: s.exportedAt || null,
    probableContent: Array.isArray(s.probableContent) ? s.probableContent.map(String).filter(Boolean) : [],
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

function shortId(value?: string | null) {
  const s = String(value || "").trim();
  if (!s) return "—";
  return s.length <= 12 ? s : `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR");
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
      {quality.short} · {Math.min(100, Math.round(quality.score))}%
    </span>
  );
}

function SummaryLines({ summary }: { summary: Partial<VaultSummary> }) {
  const s = normalizeSummary(summary);
  return (
    <div style={{ display: "grid", gap: 7, minWidth: 0 }}>
      <Line label="Contenu" value={`${s.matches} parties • ${s.profiles} profils • ${s.statsBlocks} stats • ${s.mediaRefs + s.dataImages} médias`} />
      <Line label="Historique" value={`${s.historyRows} lignes`} />
      <Line label="Catégorie" value={saveCategory(s)} />
      <Line label="Taille" value={fmtBytes(s.bytes)} />
      <Line label="Sports" value={join(s.sports)} />
      <Line label="Noms" value={join(s.names)} />
    </div>
  );
}

function SaveCard({ entry, busy, expanded, onToggle, onRestore, onExport, onDelete, onCloudCopy, restoreLabel = "Restaurer cet état", exportLabel = "Exporter JSON", deleteLabel = "Supprimer", cloudCopyLabel = "Copier vers Cloud R2" }: {
  entry: SaveEntry;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
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
  return (
    <div style={{ ...panel, borderColor: q.restorable ? "rgba(52,211,153,.38)" : "rgba(251,191,36,.28)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "54px minmax(0,1fr) auto", gap: 12, alignItems: "center", minWidth: 0 }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: q.grade === "complete" ? "color-mix(in srgb, #34d399 14%, transparent)" : "color-mix(in srgb, var(--dc-accent, #d9ff33) 12%, transparent)",
            border: `1px solid ${q.color}`,
            color: q.color,
            fontWeight: 1000,
            boxShadow: `0 0 18px color-mix(in srgb, ${q.color} 33%, transparent)`,
          }}
        >
          {String(entry.index).padStart(2, "0")}
        </div>

        <div style={wrapText}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ color: "#fff", fontSize: 16, ...wrapText }}>{entry.title}</strong>
            <QualityBadge quality={q} />
          </div>
          <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 4, ...wrapText }}>{entry.subtitle}</div>
          <div style={{ color: q.color, fontSize: 12, fontWeight: 900, marginTop: 6, ...wrapText }}>{q.reason}</div>
        </div>

        <button style={{ ...btn, padding: "9px 10px", borderColor: "rgba(148,163,184,.35)", color: "#e5e7eb" }} onClick={onToggle}>
          {expanded ? "Masquer" : "Détails"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
        <div style={{ ...panel, borderRadius: 14, padding: 10 }}>
          <div style={{ color: muted, fontSize: 10, fontWeight: 900 }}>PARTIES</div>
          <div style={{ color: gold, fontWeight: 1000, fontSize: 18 }}>{s.matches}</div>
        </div>
        <div style={{ ...panel, borderRadius: 14, padding: 10 }}>
          <div style={{ color: muted, fontSize: 10, fontWeight: 900 }}>PROFILS</div>
          <div style={{ color: neon, fontWeight: 1000, fontSize: 18 }}>{s.profiles}</div>
        </div>
        <div style={{ ...panel, borderRadius: 14, padding: 10 }}>
          <div style={{ color: muted, fontSize: 10, fontWeight: 900 }}>STATS</div>
          <div style={{ color: green, fontWeight: 1000, fontSize: 18 }}>{s.statsBlocks}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <SummaryLines summary={s} />
          <Line label="Date" value={fmtDate(entry.createdAt || entry.updatedAt || null)} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button style={q.restorable ? primaryBtn : { ...btn, borderColor: muted, color: muted }} disabled={busy || !q.restorable} onClick={onRestore}>
          {restoreLabel}
        </button>
        <button style={btn} disabled={busy} onClick={onExport}>{exportLabel}</button>
        {onCloudCopy && (
          <button
            style={{ ...btn, borderColor: gold, color: gold, background: "color-mix(in srgb, var(--dc-accent, #d9ff33) 9%, transparent)" }}
            disabled={busy}
            onClick={onCloudCopy}
          >
            {cloudCopyLabel}
          </button>
        )}
        {onDelete && <button style={dangerBtn} disabled={busy} onClick={onDelete}>{deleteLabel}</button>}
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
      <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 8, ...wrapText }}>
        Bloc brut détecté pour diagnostic. Il n’est pas proposé comme restauration principale.
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
        <InfoDot title={title} size={28} color={color === "#fff" ? neon : color} glow={`${color === "#fff" ? neon : color}66`} content={info}/>
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
  const auth = useAuthOnline();
  const themeVars = React.useMemo(() => ({ "--dc-accent": theme?.primary || "#d9ff33", "--dc-accent-soft": theme?.accent1 || theme?.primary || "#22d3ee" }) as React.CSSProperties, [theme]);
  const [tab, setTab] = React.useState<TabKey>("restore");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Scan en attente…");
  const backgroundBackup = useBackgroundBackupState();
  const lastUserActionAtRef = React.useRef(0);
  const [localSlots, setLocalSlots] = React.useState<MemorySlot[]>([]);
  const [nasSlots, setNasSlots] = React.useState<NasSlot[]>([]);
  const [trashNasSlots, setTrashNasSlots] = React.useState<NasSlot[]>([]);
  const [cloudSlots, setCloudSlots] = React.useState<CloudSlot[]>([]);
  const [trashCloudSlots, setTrashCloudSlots] = React.useState<CloudSlot[]>([]);
  const [backupProvider, setBackupProvider] = React.useState<BackupProvider>(() => readPreferredRemoteSource() || "nas");
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
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [accountScopeId, setAccountScopeId] = React.useState<string | null>(() => getVaultCurrentUserId());
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const cloudImportRef = React.useRef<HTMLInputElement | null>(null);

  const currentAuthForVault = React.useMemo(() => ({
    token: (auth.session as any)?.access_token || (auth.session as any)?.token || "",
    refreshToken: (auth.session as any)?.refresh_token || (auth.session as any)?.refreshToken || "",
    userId: auth.userId || (auth.user as any)?.id || null,
    user: auth.user || null,
  }), [auth.session, auth.user, auth.userId]);

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

  const restorableEntries = React.useMemo(() => [...remoteEntries, ...localEntries], [remoteEntries, localEntries]);
  const archiveEntries = React.useMemo(() => [...archivedRemoteEntries, ...localEntries], [archivedRemoteEntries, localEntries]);
  const archiveCompleteEntries = React.useMemo(() => archiveEntries.filter((entry) => entry.quality.grade === "complete"), [archiveEntries]);
  const archiveHistoryEntries = React.useMemo(() => archiveEntries.filter((entry) => entry.quality.grade === "history"), [archiveEntries]);
  const archiveCloudOtherEntries = React.useMemo(() => archiveEntries.filter((entry) => entry.source === "cloud" && entry.quality.grade !== "complete" && entry.quality.grade !== "history"), [archiveEntries]);
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

  const resolveBackupProvider = React.useCallback(async (): Promise<BackupProvider> => {
    const preferred = readPreferredRemoteSource();
    const localChoice = loadStoragePrefs().selectedDestination;
    if (localChoice === "cloud_r2") return "cloud";
    if (localChoice === "founder_nas") return "nas";
    // Local/fichier ne doit jamais attendre le backend pour savoir quel onglet
    // distant afficher. On conserve le dernier choix explicite, sinon R2.
    return preferred || "cloud";
  }, []);

  const refresh = React.useCallback(async () => {
    // L'actualisation des listes ne bloque jamais le bouton Sauvegarder.
    const refreshStartedAt = Date.now();
    ensureVaultNasToken();
    setAccountScopeId(getVaultCurrentUserId());
    try {
      const provider = await resolveBackupProvider();
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
    try { await refreshStatsIndexFromHistoryNow({ includeNonFinished: true, persist: true, reason }); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-history-updated", { detail: { reason } })); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-store-updated", { detail: { reason } })); } catch {}
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

  const restoreSnapshotIntoBrowserAndAccount = async (payload: any, reason: string, label: string) => {
    const snapshot = normalizeCloudPayload(unwrapSnapshotEnvelope(payload));
    const isBackupV1 = looksLikeCloudBackupV1(snapshot);
    if (!looksLikeCloudSnapshot(snapshot) && !isBackupV1) throw new Error("Snapshot restaurable introuvable dans ce bloc.");
    const summary = isBackupV1 ? strictSummaryForCloudPayload(snapshot) : strictSummaryForRestore(snapshot);
    const q = backupProvider === "cloud" ? assessSaveForProvider(summary, "cloud") : assessSave(summary);
    if (!q.restorable) {
      throw new Error(`Garde-fou restauration : bloc refusé. ${q.reason} ${explainStrictPayload(snapshot)}`);
    }

    const targetLabel = backupProvider === "cloud" ? "Cloudflare R2" : "compte NAS";
    const ok = window.confirm(
      `Restaurer "${label}" ?\n\n` +
      `${summary.matches} parties • ${summary.historyRows} lignes historique • ${summary.profiles} profils • ${summary.statsBlocks} stats\n\n` +
      `L’application va créer une sécurité, restaurer le navigateur, synchroniser vers ${targetLabel}, puis recharger.`
    );
    if (!ok) return;

    const restoreAuth = rememberAuthKeys();
    await createLocalMemorySlot("Sécurité avant restauration", "before-restore").catch(() => null);

    if (isBackupV1) {
      const restored = await restoreCloudBackupFromJson({ json: JSON.stringify(snapshot), mode: "replace", rebuild: true });
      if (!restored.ok) throw new Error(restored.error || "Restauration CloudBackup impossible.");
    } else {
      await importCloudSnapshot(snapshot, { mode: "replace" });
    }
    restoreAuth();

    // ✅ Important : la restauration IDB est faite, mais le state React courant
    // peut encore contenir `profiles: []` jusqu'au reload. On remplace tout de
    // suite le store vivant avec le store relu depuis la clé restaurée.
    try {
      const restoredStore = await loadStore<any>();
      if (restoredStore && typeof (window as any).__replaceLocalStoreNow === "function") {
        await (window as any).__replaceLocalStoreNow(restoredStore, reason);
      }
    } catch (e) {
      console.warn("[StorageVault] live store refresh after restore failed", e);
    }

    await afterRestoreHousekeeping(reason);
    if (backupProvider === "cloud") {
      await uploadCurrentSnapshotToCloudVault(`restore-cloud:${reason}`, `État restauré — ${label}`);
    } else {
      await pushSnapshotToAccount(snapshot, reason);
    }
    setMessage(`Restauration terminée : ${summary.matches} partie(s), ${summary.profiles} profil(s), ${summary.statsBlocks} bloc(s) stats. Rechargement…`);
    window.setTimeout(() => window.location.reload(), 900);
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
      exportJsonDownload(full || item, `${String(item.matchId || item.id || "match").replace(/[^a-z0-9_-]/gi, "_")}.json`);
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
    writePreferredRemoteSource(provider);
    setBackupProvider(provider);
    setRestoreView("current");
    await refresh().catch(() => undefined);
    setMessage(provider === "cloud"
      ? "Source distante sélectionnée : Cloudflare R2. Les sauvegardes disponibles sur tous tes appareils sont affichées ci-dessous."
      : "Source distante sélectionnée : NAS. Les sauvegardes privées du serveur sont affichées ci-dessous.");
  };

  const finishCloudTransfer = async (messageText: string) => {
    writePreferredRemoteSource("cloud");
    setBackupProvider("cloud");
    setRestoreView("current");
    await refresh().catch(() => undefined);
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
      if (entry.source === "local") {
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
    if (destination === "cloud_r2") {
      writePreferredRemoteSource("cloud");
      setBackupProvider("cloud");
    } else if (destination === "founder_nas") {
      writePreferredRemoteSource("nas");
      setBackupProvider("nas");
    }

    const label = getStorageDestination(destination).label;
    setMessage(`Destination active : ${label}. Le prochain clic sur Sauvegarder écrira directement ici.`);

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

  const restoreNas = async (entry: SaveEntry) => {
    const token = await ensureNasTokenFromOnlineRuntime(currentAuthForVault);
    setAccountScopeId(getVaultCurrentUserId());
    if (!token) {
      setMessage("Restauration NAS impossible : token NAS introuvable. Déconnecte/reconnecte-toi au compte NAS.");
      return;
    }
    setBusy(true);
    try {
      const slot = entry.slot as NasSlot;
      const id = String(slot.id || "latest");
      const pulled = await pullNasMemorySlot(id);
      await restoreSnapshotIntoBrowserAndAccount(
        pulled.payload,
        `restore-nas:${id}`,
        entry.title
      );
    } catch (error: any) {
      setMessage(`Restauration NAS impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const restoreCloud = async (entry: SaveEntry) => {
    setBusy(true);
    try {
      const slot = entry.slot as CloudSlot;
      const pulled = slot.__payload
        ? { payload: slot.__payload, summary: slot.__summary || strictSummaryForCloudPayload(slot.__payload) }
        : await pullCloudVaultSlot(slot);
      await restoreSnapshotIntoBrowserAndAccount(pulled.payload, `restore-cloud:${slot.id}`, entry.title);
    } catch (error: any) {
      setMessage(`Restauration cloud impossible : ${error?.message || error}`);
    } finally { setBusy(false); }
  };

  const restoreLocal = async (entry: SaveEntry) => {
    setBusy(true);
    try {
      const slot = entry.slot as MemorySlot;
      await restoreSnapshotIntoBrowserAndAccount(decodeMaybeCompressedNasPayload(slot.payload), `restore-local:${slot.id}`, entry.title);
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

  const toggleExpanded = (key: string) => setExpanded((old) => ({ ...old, [key]: !old[key] }));

  const renderEntry = (entry: SaveEntry) => (
    <SaveCard
      key={entry.key}
      entry={entry}
      busy={busy}
      expanded={Boolean(expanded[entry.key])}
      onToggle={() => toggleExpanded(entry.key)}
      onRestore={() => entry.source === "nas" ? restoreNas(entry) : entry.source === "cloud" ? restoreCloud(entry) : restoreLocal(entry)}
      onExport={async () => {
        try {
          if (entry.source === "nas") {
            const slot = entry.slot as NasSlot;
            const id = String(slot.id || "latest");
            const pulled = await pullNasMemorySlot(id);
            exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${id}.json`);
          } else if (entry.source === "cloud") {
            const slot = entry.slot as CloudSlot;
            const pulled = slot.__payload
              ? { slot, payload: slot.__payload, summary: slot.__summary || strictSummaryForCloudPayload(slot.__payload) }
              : await pullCloudVaultSlot(slot);
            exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${String(slot.id || "cloud").replace(/[^a-z0-9_-]/gi, "_")}.json`);
          } else {
            const localSlot = entry.slot as MemorySlot;
            exportJsonDownload({ ...localSlot, payload: decodeMaybeCompressedNasPayload(localSlot.payload) }, `${localSlot.id}.json`);
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
      busy={busy}
      expanded={Boolean(expanded[entry.key])}
      onToggle={() => toggleExpanded(entry.key)}
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
            exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${id}.json`);
          } else {
            const pulled = await pullNasMemorySlot(id, { trash: true });
            exportJsonDownload({ slot: pulled.slot, payload: pulled.payload, summary: pulled.summary }, `${id}.json`);
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

  const destinationStatValue = selectedDestination === "app_local"
    ? localEntries.length
    : selectedDestination === "device_file" || selectedDestination === "external_sd_manual" || selectedDestination === "personal_cloud_manual"
      ? (externalBackupStatus.configured ? 1 : 0)
      : selectedDestination === "cloud_r2"
        ? cloudEntries.length
        : nasEntries.length;

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
      {destination.id === "personal_cloud_manual" ? <div style={{ color: neon }}>Compatible avec un dossier synchronisé Google Drive / OneDrive / Dropbox / Nextcloud.</div> : null}
      {destination.id === "founder_nas" ? <div style={{ color: neon, fontWeight: 900 }}>Destination privée du compte fondateur. La sécurité locale est conservée avant l’envoi et les archives restent restaurables.</div> : null}
    </div>
  );

  const destinationIconName = (id: StorageDestinationId): VaultGlyphName => id === "app_local" ? "local" : id === "device_file" ? "file" : id === "external_sd_manual" ? "sd" : id === "personal_cloud_manual" ? "folder" : id === "cloud_r2" ? "cloud" : "nas";

  return (
    <div style={{ ...pageStyle, paddingTop: 8, ...themeVars }}>
      <div style={shellStyle}>
        <div style={{ ...panel, padding: 11, marginBottom: 10, borderColor: accentSoftBorder }}>
          <div style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
            <BackDot
              size={42}
              color={neon}
              glow={`${neon}77`}
              onClick={() => { try { if (window.history.length > 1) window.history.back(); else go?.("settings"); } catch { go?.("settings"); } }}
            />
            <div style={{ textAlign: "center", minWidth: 0 }}>
              <div style={{ color: neon, fontWeight: 1000, fontSize: 22, letterSpacing: ".06em", textShadow: `0 0 18px ${accentSoftGlow}` }}>SAUVEGARDE</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                <span style={{ border: `1px solid ${accountScopeId ? green : red}`, color: accountScopeId ? green : red, borderRadius: 999, padding: "3px 7px", fontSize: 9.5, fontWeight: 900 }}>{accountScopeId ? `COMPTE ${shortId(accountScopeId)}` : "HORS COMPTE"}</span>
                <span style={{ border: `1px solid ${gold}`, color: gold, borderRadius: 999, padding: "3px 7px", fontSize: 9.5, fontWeight: 900 }}>{activeDestination.shortLabel.toUpperCase()}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <InfoDot title="Centre de sauvegarde" size={38} color={gold} glow={`${gold}66`} content={pageHelp}/>
              <button type="button" disabled={busy} onClick={() => void refresh()} aria-label="Actualiser" style={{ width: 38, height: 38, borderRadius: 999, border: `1px solid ${neon}`, background: "rgba(0,0,0,.45)", color: neon, display: "grid", placeItems: "center", boxShadow: `0 0 14px ${accentSoftGlow}`, cursor: busy ? "wait" : "pointer", opacity: busy ? .55 : 1 }}><VaultGlyph name="refresh" size={21}/></button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 10 }}>
            <div style={{ border: "1px solid rgba(148,163,184,.18)", borderRadius: 12, padding: 8, textAlign: "center", background: "rgba(2,6,23,.62)" }}><div style={{ color: muted, fontSize: 9, fontWeight: 900 }}>ÉTATS</div><div style={{ color: green, fontSize: 19, fontWeight: 1000 }}>{restorableEntries.length}</div></div>
            <div style={{ border: "1px solid rgba(148,163,184,.18)", borderRadius: 12, padding: 8, textAlign: "center", background: "rgba(2,6,23,.62)" }}><div style={{ color: muted, fontSize: 9, fontWeight: 900 }}>PARTIES</div><div style={{ color: gold, fontSize: 19, fontWeight: 1000 }}>{matchBackupEntries.length}</div></div>
            <div style={{ border: "1px solid rgba(148,163,184,.18)", borderRadius: 12, padding: 8, textAlign: "center", background: "rgba(2,6,23,.62)" }}><div style={{ color: muted, fontSize: 9, fontWeight: 900 }}>{activeDestination.shortLabel.toUpperCase()}</div><div style={{ color: neon, fontSize: 19, fontWeight: 1000 }}>{destinationStatValue}</div></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>
          <VaultNavButton active={tab === "restore"} icon="restore" label="Restaurer" onClick={() => setTab("restore")}/>
          <VaultNavButton active={tab === "matches"} icon="matches" label="Parties" onClick={() => setTab("matches")}/>
          <VaultNavButton active={tab === "backup"} icon="save" label="Sauver" onClick={() => setTab("backup")}/>
          <VaultNavButton active={tab === "diagnostic"} icon="expert" label="Expert" onClick={() => setTab("diagnostic")}/>
        </div>

        <div style={{ ...panel, padding: "9px 11px", marginBottom: 10, borderColor: busy ? "rgba(251,191,36,.48)" : "rgba(34,211,238,.22)", display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
          <span style={{ color: busy ? amber : green, lineHeight: 0 }}>{busy ? <VaultGlyph name="save" size={20}/> : <VaultGlyph name="shield" size={20}/>}</span>
          <div title={message} style={{ color: "#d9e2ef", fontSize: 11.5, fontWeight: 800, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.25 }}>{message}</div>
          <InfoDot title="État détaillé" size={28} color={busy ? amber : neon} content={<div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{message}</div>}/>
          {busy ? <div style={{ gridColumn: "1 / -1", height: 3, borderRadius: 999, overflow: "hidden", background: "rgba(251,191,36,.14)" }}><div style={{ width: "42%", height: "100%", borderRadius: 999, background: amber, boxShadow: `0 0 12px ${amber}`, animation: "dcVaultBusy 1.1s ease-in-out infinite alternate" }}/></div> : null}
        </div>

        {tab === "restore" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...panel, padding: 11 }}>
              <CompactSectionTitle title="SOURCE DISTANTE" color={neon} info={<div>Le choix NAS / Cloud R2 sert uniquement à afficher les sauvegardes disponibles. Il ne change pas la destination utilisée par le bouton Sauver.</div>}/>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <VaultActionButton icon="nas" label="NAS privé" active={backupProvider === "nas"} onClick={() => void selectRemoteRestoreSource("nas")}/>
                <VaultActionButton icon="cloud" label="Cloud R2" active={backupProvider === "cloud"} onClick={() => void selectRemoteRestoreSource("cloud")}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
                <VaultActionButton icon="current" label="Dernière" active={restoreView === "current"} onClick={() => setRestoreView("current")}/>
                <VaultActionButton icon="archive" label={`Archives ${archiveEntries.length}`} active={restoreView === "archives"} onClick={() => setRestoreView("archives")}/>
                <VaultActionButton icon="trash" label={`Corbeille ${trashRemoteEntries.length}`} active={restoreView === "trash"} onClick={() => setRestoreView("trash")}/>
              </div>
            </div>

            {restoreView === "current" && (latestRemoteEntry ? renderEntry(latestRemoteEntry) : <CompactEmpty title={`Aucune sauvegarde ${backupProvider === "nas" ? "NAS" : "Cloud R2"} courante`} detail="Crée un état depuis l’onglet Sauver, puis actualise."/>)}

            {restoreView === "archives" && (
              <>
                {archiveCompleteEntries.map(renderEntry)}
                {archiveHistoryEntries.map(renderEntry)}
                {backupProvider === "cloud" ? archiveCloudOtherEntries.map(renderEntry) : null}
                {!archiveEntries.length ? <CompactEmpty title="Aucune archive restaurable"/> : null}
              </>
            )}

            {restoreView === "trash" && (
              <>
                <div style={{ ...panel, padding: 11 }}>
                  <CompactSectionTitle title="CORBEILLE" color={red} info={<div>Une sauvegarde placée ici reste récupérable. Le bouton « Vider » la supprime définitivement du serveur.</div>} right={<button style={{ ...dangerBtn, padding: "7px 10px", fontSize: 10.5 }} disabled={busy || !trashRemoteEntries.length} onClick={emptyTrash}>Vider</button>}/>
                </div>
                {trashRemoteEntries.length ? trashRemoteEntries.map(renderTrashEntry) : <CompactEmpty title="Corbeille vide"/>}
              </>
            )}

            <div style={{ ...panel, padding: 11 }}>
              <CompactSectionTitle title="MULTI-APPAREILS" color={gold} info={<div>Crée une copie Cloud R2 sans modifier la destination principale. Sur l’autre appareil, connecte le même compte puis ouvre Restaurer → Cloud R2.</div>}/>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <VaultActionButton icon="upload" label={cloudTransferBusy === "current" ? "Envoi…" : "Cet appareil → R2"} disabled={busy || !hasConnectedAccount} onClick={() => void publishCurrentDeviceToCloud()}/>
                <VaultActionButton icon="file" label={cloudTransferBusy === "file" ? "Lecture…" : "Fichier → R2"} disabled={busy || !hasConnectedAccount} onClick={() => cloudImportRef.current?.click()}/>
                <input ref={cloudImportRef} type="file" accept="application/json,.json,.dcbackup" style={{ display: "none" }} onChange={(e) => void publishFileToCloud(e.currentTarget.files?.[0] || null)}/>
              </div>
            </div>
          </div>
        )}

        {tab === "matches" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...panel, padding: 11 }}><CompactSectionTitle title="PARTIES À L’UNITÉ" color={green} info={<div>Chaque bloc restaure une seule partie dans l’Historique. Aucune autre partie ni aucun profil n’est remplacé.</div>} right={<button type="button" style={{ ...btn, width: 35, height: 35, padding: 0, borderRadius: 999, display: "grid", placeItems: "center" }} onClick={() => void refresh()}><VaultGlyph name="refresh" size={19}/></button>}/></div>
            {matchBackupEntries.length ? matchBackupEntries.map((item) => <MatchBackupCard key={`${item.origin || "local"}:${item.matchId || item.id}`} item={item} busy={busy} onRestore={() => restoreSingleMatch(item)} onExport={() => exportSingleMatch(item)} onDelete={() => deleteSingleMatch(item)}/>) : <CompactEmpty title="Aucune sauvegarde de partie détectée" detail="Les nouvelles parties terminées seront ajoutées automatiquement."/>}
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
                      <div style={{ position: "absolute", top: 8, right: 7 }}><InfoDot title={destination.shortLabel} size={27} color={active ? gold : neon} content={destinationHelp(destination)}/></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ ...panel, padding: 12, borderColor: accentSoftBorder }}>
              <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${gold}`, color: gold, display: "grid", placeItems: "center", background: accentSoftBg }}><VaultGlyph name={destinationIconName(selectedDestination)} size={27}/></div>
                <div style={{ minWidth: 0 }}><div style={{ color: muted, fontSize: 9.5, fontWeight: 900 }}>DESTINATION ACTIVE</div><strong style={{ color: "#fff", fontSize: 13.5, ...wrapText }}>{activeDestination.label}</strong></div>
                <InfoDot title={activeDestination.shortLabel} size={30} color={green} content={<div style={{ display: "grid", gap: 9 }}><div>La sauvegarde inclut les parties, l’Historique, les profils, les statistiques, les compétitions et les références médias. Les blocs incomplets sont refusés par le garde-fou.</div>{destinationHelp(activeDestination)}</div>}/>
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
                  <VaultActionButton icon="folder" label={externalBackupStatus.configured ? "Changer" : "Choisir"} disabled={busy || externalBackupBusy !== null} onClick={() => void runExternalBackupAction("choose")}/>
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
              <CompactSectionTitle title="MODE EXPERT" color={amber} info={<div>Affiche les blocs bruts IndexedDB/localStorage. À utiliser uniquement pour diagnostiquer ou exporter une donnée technique.</div>}/>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <VaultActionButton icon="refresh" label="Scanner" disabled={busy} onClick={() => void refresh()}/>
                <VaultActionButton icon="expert" label={showDiagnostic ? "Masquer blocs" : `Afficher ${technicalCount}`} active={showDiagnostic} onClick={() => setShowDiagnostic((v) => !v)}/>
              </div>
            </div>
            {showDiagnostic ? blocks.map((block) => <TechnicalBlockCard key={`diag-${block.id}`} block={block} busy={busy} onExport={() => exportJsonDownload(block, `${block.id.replace(/[^a-z0-9_-]/gi, "_")}.json`)}/>) : null}
          </div>
        )}
      </div>
      <style>{`@keyframes dcVaultBusy { from { transform: translateX(-40%); opacity:.45 } to { transform: translateX(140%); opacity:1 } }`}</style>
    </div>
  );
}
