import * as React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { apiPost, buildApiUrl, readNasAccessToken } from "../lib/apiClient";
import { exportCloudSnapshot, importCloudSnapshot, loadStore, setStorageUser } from "../lib/storage";
import {
  createLocalMemorySlot,
  createLocalMemorySlotFromSnapshot,
  createNasVersionedSnapshot,
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
import { getDirectR2Status, getDirectR2Usage, type DirectR2Status, type DirectR2Usage } from "../lib/directR2BackupApi";
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

type PreparedBackup = {
  snapshot: any;
  snapshotJson: string;
  summary: VaultSummary;
  bytes: number;
  preparedAt: number;
};

let preparedBackupInFlight: Promise<PreparedBackup> | null = null;
let preparedBackupCache: PreparedBackup | null = null;

async function prepareCurrentBackupOnce(): Promise<PreparedBackup> {
  if (preparedBackupInFlight) return preparedBackupInFlight;
  if (preparedBackupCache && Date.now() - preparedBackupCache.preparedAt < 2_000) return preparedBackupCache;
  preparedBackupInFlight = (async () => {
    const snapshot = normalizeCloudPayload(unwrapSnapshotEnvelope(await exportCloudSnapshot()));
    if (!looksLikeCloudSnapshot(snapshot) && !looksLikeCloudBackupV1(snapshot)) {
      throw new Error("L’état courant ne contient pas une sauvegarde Multisports exploitable.");
    }
    const summary = strictSummaryForRestore(snapshot);
    const snapshotJson = JSON.stringify(snapshot);
    const prepared = {
      snapshot,
      snapshotJson,
      summary,
      bytes: new Blob([snapshotJson]).size,
      preparedAt: Date.now(),
    };
    preparedBackupCache = prepared;
    return prepared;
  })();
  try {
    return await preparedBackupInFlight;
  } finally {
    preparedBackupInFlight = null;
  }
}

async function withFastFallback<T>(promise: Promise<T>, fallback: T, timeoutMs = 2_500): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

async function pushSnapshotToNasFast(payload: any, reason: string, token: string): Promise<any> {
  const snapshot = unwrapSnapshotEnvelope(payload);
  const version = Number(snapshot?._v || snapshot?.v || 2) || 2;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(buildApiUrl("/sync/push"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ payload: snapshot, version, reason }),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text().catch(() => "");
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) throw new Error(String(data?.message || data?.error || text || `NAS HTTP ${response.status}`));
    return data;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("Le NAS n’a pas répondu en moins de 5 secondes.");
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export default function StorageVaultPage({ go }: Props) {
  const { theme } = useTheme();
  const auth = useAuthOnline();
  const themeVars = React.useMemo(() => ({ "--dc-accent": theme?.primary || "#d9ff33", "--dc-accent-soft": theme?.accent1 || theme?.primary || "#22d3ee" }) as React.CSSProperties, [theme]);
  const [tab, setTab] = React.useState<TabKey>("restore");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Scan en attente…");
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
      .filter((entry) => entry.quality.grade === "complete" || entry.quality.grade === "history")
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
    const latest = remoteEntries.find((entry) => entry.latest) || remoteEntries[0] || null;
    return latest;
  }, [remoteEntries]);

  const archivedRemoteEntries = React.useMemo(() => {
    return remoteEntries.filter((entry) => !entry.latest && entry.key !== latestRemoteEntry?.key);
  }, [remoteEntries, latestRemoteEntry]);


  const localEntries = React.useMemo<SaveEntry[]>(() => {
    return localSlots
      .map((slot, idx) => {
        const summary = strictSummaryForRestore(slot.payload, slot.summary);
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
    for (const item of matchBackups || []) {
      const id = String(item.matchId || item.id || "").trim();
      if (!id) continue;
      const existing = byId.get(id);
      if (!existing || priority(item.origin) >= priority(existing.origin)) byId.set(id, item);
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
          withFastFallback(listCloudMatchBackups(), [], 2_500),
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

      const [nsRaw, trashRaw, nasMatches] = await Promise.all([
        withFastFallback(listNasMemorySlots(), [], 2_500),
        withFastFallback(listNasDeletedMemorySlots(), [], 2_500),
        withFastFallback(listNasMatchBackups(), [], 2_500),
      ]);
      const activeNas = nsRaw.map((slot) => ({ ...slot, summary: normalizeSummary(slot.summary || {}) }));
      const trashNas = trashRaw.map((slot) => ({ ...slot, summary: normalizeSummary(slot.summary || {}) }));

      setCloudSlots([]);
      setTrashCloudSlots([]);
      setNasSlots(activeNas);
      setTrashNasSlots(trashNas);
      setMatchBackups([...(localMatches || []), ...(nasMatches || [])]);
      if (lastUserActionAtRef.current <= refreshStartedAt) setMessage(`Prêt. Destination active : ${selectedForSaveLabel}. ${activeNas.length} sauvegarde(s) NAS, ${ls.length} sauvegarde(s) locale(s). Aucun snapshot n'a été téléchargé pendant le scan.`);
    } catch (error: any) {
      if (lastUserActionAtRef.current <= refreshStartedAt) setMessage(`Actualisation impossible : ${error?.message || error}`);
    } finally {
      // Aucun verrou global : une liste distante lente ne doit jamais empêcher
      // une sauvegarde locale ou fichier immédiate.
    }
  }, [ensureVaultNasToken, resolveBackupProvider, tab]);

  React.useEffect(() => { void refresh(); }, [refresh]);

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
    const snapshot = await exportCloudSnapshot();
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
        ? await pullNasMatchBackup(item.matchId || item.id)
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
        ? await pullNasMatchBackup(item.matchId || item.id)
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
      if (item.origin === "nas") await deleteNasMatchBackup(item.matchId || item.id);
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
        payload = (entry.slot as MemorySlot).payload;
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
      preferExternalStorage: destination === "device_file" || destination === "external_sd_manual",
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
      const prepared = await prepareCurrentBackupOnce();
      const slot = await createLocalMemorySlotFromSnapshot(prepared.snapshot, "Bloc local de sécurité", "manual", prepared.summary);
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
    const startedAt = performance.now();
    const destination = loadStoragePrefs().selectedDestination;
    const destinationLabel = getStorageDestination(destination).label;
    setBusy(true);
    setMessage(`Préparation de la sauvegarde vers ${destinationLabel}…`);

    try {
      // Le snapshot complet n'est construit qu'une seule fois, puis le même
      // objet est écrit vers la destination choisie.
      const prepared = await prepareCurrentBackupOnce();
      const quality = assessSaveForProvider(prepared.summary, destination === "cloud_r2" ? "cloud" : destination === "founder_nas" ? "nas" : "local");
      if (!quality.restorable) throw new Error(`Sauvegarde refusée : ${quality.reason}`);

      const elapsed = () => `${Math.max(1, Math.round(performance.now() - startedAt))} ms`;
      const localLabel = `Sauvegarde ${destinationLabel} — ${new Date().toLocaleString("fr-FR")}`;

      if (destination === "app_local") {
        const slot = await createLocalMemorySlotFromSnapshot(prepared.snapshot, localLabel, "manual", prepared.summary);
        setLocalSlots((current) => [slot, ...current.filter((item) => item.id !== slot.id)].slice(0, 10));
        setMessage(`Sauvegarde locale créée en ${elapsed()} · ${prepared.summary.matches} partie(s) · ${prepared.summary.profiles} profil(s) · ${formatStorageBytes(prepared.bytes)}.`);
        return;
      }

      if (destination === "device_file" || destination === "external_sd_manual") {
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
          const slot = await createLocalMemorySlotFromSnapshot(prepared.snapshot, `Sécurité locale — ${localLabel}`, "manual", prepared.summary);
          setLocalSlots((current) => [slot, ...current.filter((item) => item.id !== slot.id)].slice(0, 10));
        }
        setMessage(`Sauvegarde fichier créée en ${elapsed()} · ${status.fileName || "fichier téléchargé"} · ${formatStorageBytes(status.lastBytes || prepared.bytes)}.`);
        return;
      }

      if (destination === "cloud_r2") {
        const localSlot = storagePrefs.keepLocalSafetyCopy
          ? await createLocalMemorySlotFromSnapshot(prepared.snapshot, `Sécurité locale — ${localLabel}`, "manual", prepared.summary).catch(() => null)
          : null;
        if (localSlot) setLocalSlots((current) => [localSlot, ...current.filter((item) => item.id !== localSlot.id)].slice(0, 10));

        const uploaded = await uploadCloudVaultSnapshotJson({
          snapshotJson: prepared.snapshotJson,
          title: localLabel,
          sourceDestination: "cloud_r2",
          metadata: {
            summary: prepared.summary,
            exportedAt: new Date().toISOString(),
            rawSizeBytes: prepared.bytes,
            engine: "instant-backup-v44",
          },
        });
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
            billingStatus: String(u.preference?.billing_status || u.billingStatus || "free"),
            billingExempt: u.preference?.billing_exempt === true || u.billingExempt === true,
            retainedBackups: Number(u.retainedBackups || 1), retentionTotal: Number(u.retentionTotal || 2),
          });
        }
        setMessage(`Sauvegarde Cloud R2 créée en ${elapsed()} · ${prepared.summary.matches} partie(s) · ${formatStorageBytes(prepared.bytes)} · conservation automatique : courante + précédente uniquement.`);
        return;
      }

      // NAS : on crée d'abord une copie locale immédiate avec le même snapshot,
      // puis l'appel réseau est limité à 5 secondes.
      const localSlot = await createLocalMemorySlotFromSnapshot(
        prepared.snapshot,
        `Sécurité locale avant NAS — ${new Date().toLocaleString("fr-FR")}`,
        "before-restore",
        prepared.summary
      );
      setLocalSlots((current) => [localSlot, ...current.filter((item) => item.id !== localSlot.id)].slice(0, 10));

      const token = await ensureNasTokenFromOnlineRuntime(currentAuthForVault);
      setAccountScopeId(getVaultCurrentUserId());
      if (!token) throw new Error("Token NAS introuvable. La copie locale a été créée, mais l'envoi NAS nécessite une reconnexion au compte NAS.");
      const response = await pushSnapshotToNasFast(prepared.snapshot, "storage-vault-instant", token);
      const slotId = String(response?.slotId || response?.id || `nas_${Date.now()}`);
      const nasSlot: NasSlot = {
        id: slotId,
        latest: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        summary: prepared.summary,
      };
      setNasSlots((current) => [nasSlot, ...current.map((row) => ({ ...row, latest: false })).filter((row) => row.id !== slotId)].slice(0, 120));
      setBackupProvider("nas");
      writePreferredRemoteSource("nas");
      setMessage(`Sauvegarde NAS créée en ${elapsed()} · ${prepared.summary.matches} partie(s) · copie locale de sécurité conservée.`);
    } catch (error: any) {
      setMessage(`Sauvegarde impossible vers ${destinationLabel} : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
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
      await restoreSnapshotIntoBrowserAndAccount(slot.payload, `restore-local:${slot.id}`, entry.title);
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
            exportJsonDownload(entry.slot, `${(entry.slot as MemorySlot).id}.json`);
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
        : selectedDestination === "cloud_r2"
          ? "Créer sauvegarde Cloud R2"
          : "Créer sauvegarde NAS";

  const destinationStatValue = selectedDestination === "app_local"
    ? localEntries.length
    : selectedDestination === "device_file" || selectedDestination === "external_sd_manual"
      ? (externalBackupStatus.configured ? 1 : 0)
      : selectedDestination === "cloud_r2"
        ? cloudEntries.length
        : nasEntries.length;

  const remoteDestinationNeedsAccount = selectedDestination === "cloud_r2" || selectedDestination === "founder_nas";
  const primaryBackupDisabled = busy || externalBackupBusy !== null || (remoteDestinationNeedsAccount && !hasConnectedAccount);

  return (
    <div style={{ ...pageStyle, ...themeVars }}>
      <div style={shellStyle}>
        <div style={{ ...panel, borderColor: "color-mix(in srgb, var(--dc-accent, #d9ff33) 36%, transparent)", marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 44px", gap: 10, alignItems: "center", minWidth: 0 }}>
            <button
              style={{ ...btn, width: 42, height: 42, borderRadius: 999, padding: 0, borderColor: gold, color: gold, boxShadow: "0 0 16px color-mix(in srgb, var(--dc-accent, #d9ff33) 22%, transparent)" }}
              onClick={() => { try { if (window.history.length > 1) window.history.back(); else go?.("settings"); } catch { go?.("settings"); } }}
              aria-label="Retour"
            >
              ←
            </button>
            <div style={{ textAlign: "center", minWidth: 0 }}>
              <div style={{ color: gold, fontWeight: 1000, fontSize: 25, lineHeight: 1.05, letterSpacing: ".04em", textShadow: "0 0 18px color-mix(in srgb, var(--dc-accent, #d9ff33) 80%, transparent)", ...wrapText }}>SAUVEGARDE</div>
              <div style={{ color: "#cbd5e1", fontSize: 11, marginTop: 4, ...wrapText }}>Carte mémoire de l’application</div>
              <div style={{ color: muted, fontSize: 11, ...wrapText }}>On n’affiche que les emplacements restaurables.</div>
              <div style={{ color: accountScopeId ? green : red, fontSize: 11, marginTop: 3, fontWeight: 900, ...wrapText }}>
                Compte sauvegarde : {accountScopeId ? shortId(accountScopeId) : "aucun compte connecté"}
              </div>
              <div style={{ color: gold, fontSize: 10.5, marginTop: 3, fontWeight: 900, ...wrapText }}>
                Destination active : {activeDestination.shortLabel}
              </div>
            </div>
            <button
              style={{ ...btn, width: 42, height: 42, borderRadius: 999, padding: 0, borderColor: neon, color: neon, boxShadow: "0 0 16px color-mix(in srgb, var(--dc-accent-soft, #22d3ee) 22%, transparent)" }}
              disabled={busy}
              onClick={refresh}
              aria-label="Actualiser"
            >
              ↻
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 14 }}>
            <StatBox label="Emplacements" value={restorableEntries.length} color={green} />
            <StatBox label="Parties auto" value={matchBackupEntries.length} color={gold} />
            <StatBox label={activeDestination.shortLabel.toUpperCase()} value={destinationStatValue} color={neon} />
          </div>
        </div>

        <div style={{ ...panel, borderColor: busy ? `rgba(251,191,36,.45)` : "color-mix(in srgb, var(--dc-accent-soft, #22d3ee) 28%, transparent)", marginBottom: 12 }}>
          <strong style={{ color: busy ? amber : neon }}>{busy ? "Traitement en cours" : "Info"}</strong>
          <div style={{ marginTop: 5, color: "#cbd5e1", fontSize: 13, lineHeight: 1.4, ...wrapText }}>{message}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
          <TabButton active={tab === "restore"} onClick={() => setTab("restore")}>🎮 Restaurer</TabButton>
          <TabButton active={tab === "matches"} onClick={() => setTab("matches")}>🎯 Parties</TabButton>
          <TabButton active={tab === "backup"} onClick={() => setTab("backup")}>💾 Sauver</TabButton>
          <TabButton active={tab === "diagnostic"} onClick={() => setTab("diagnostic")}>🔎 Expert</TabButton>
        </div>

        {tab === "restore" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...panel, borderColor: accentSoftBorder }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 19 }}>Source distante à afficher</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Ce choix est indépendant de la destination utilisée pour sauvegarder. Affiche <b style={{ color: gold }}>Cloud R2</b> pour retrouver une copie depuis un autre appareil, ou <b style={{ color: neon }}>NAS</b> pour consulter les sauvegardes privées du serveur.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <TabButton active={backupProvider === "cloud"} onClick={() => void selectRemoteRestoreSource("cloud")}>Cloud R2</TabButton>
                <TabButton active={backupProvider === "nas"} onClick={() => void selectRemoteRestoreSource("nas")}>NAS</TabButton>
              </div>
            </div>

            <div style={{ ...panel, borderColor: "rgba(251,191,36,.38)" }}>
              <h2 style={{ margin: 0, color: gold, fontSize: 19 }}>Rendre une sauvegarde disponible sur tous mes appareils</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Une sauvegarde locale, sur HDD, clé USB, carte SD ou fichier reste attachée à l’appareil tant qu’elle n’est pas copiée dans Cloudflare R2. L’envoi ci-dessous crée seulement une <b>copie multi-appareils</b> et ne change pas ta destination principale.
              </p>
              {!hasConnectedAccount && (
                <div style={{ marginBottom: 10, color: red, fontSize: 12, fontWeight: 900 }}>
                  Connecte ton compte pour associer la copie R2 à la même identité sur tous les appareils.
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
                <button style={primaryBtn} disabled={busy || !hasConnectedAccount} onClick={() => void publishCurrentDeviceToCloud()}>
                  {cloudTransferBusy === "current" ? "Envoi en cours…" : "Envoyer cet appareil vers R2"}
                </button>
                <button style={btn} disabled={busy || !hasConnectedAccount} onClick={() => cloudImportRef.current?.click()}>
                  {cloudTransferBusy === "file" ? "Lecture du fichier…" : "Choisir un fichier et l’envoyer"}
                </button>
                <input
                  ref={cloudImportRef}
                  type="file"
                  accept="application/json,.json,.dcbackup"
                  style={{ display: "none" }}
                  onChange={(e) => void publishFileToCloud(e.currentTarget.files?.[0] || null)}
                />
              </div>
              <div style={{ marginTop: 9, color: muted, fontSize: 11.5, lineHeight: 1.4 }}>
                Sur le second appareil : connecte le même compte → Sauvegarde → Restaurer → Cloud R2 → Actualiser → Restaurer cet état.
              </div>
            </div>

            <div style={{ ...panel, borderColor: "rgba(52,211,153,.36)" }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 19 }}>Choisir un état à restaurer</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Affichage simplifié : la page montre d’abord <b>la dernière sauvegarde {backupProvider === "cloud" ? "cloud" : "NAS"}</b>. Les anciennes sauvegardes sont rangées dans Archives, et les suppressions passent par la Corbeille avant suppression définitive serveur.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
                <TabButton active={restoreView === "current"} onClick={() => setRestoreView("current")}>Dernière</TabButton>
                <TabButton active={restoreView === "archives"} onClick={() => setRestoreView("archives")}>Archives ({archiveEntries.length})</TabButton>
                <TabButton active={restoreView === "trash"} onClick={() => setRestoreView("trash")}>Corbeille ({trashRemoteEntries.length})</TabButton>
              </div>
            </div>

            {restoreView === "current" && (
              <>
                <h2 style={{ margin: "4px 0 0", color: green, fontSize: 17, textShadow: "0 0 12px rgba(52,211,153,.45)" }}>{backupProvider === "cloud" ? "Dernière sauvegarde cloud" : "Dernière sauvegarde NAS"}</h2>
                {latestRemoteEntry ? renderEntry(latestRemoteEntry) : (
                  <div style={panel}>
                    <strong style={{ color: amber }}>{backupProvider === "cloud" ? "Aucune sauvegarde cloud courante affichable" : "Aucune sauvegarde NAS courante affichable"}</strong>
                    <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
                      Crée une sauvegarde depuis l’onglet Sauver. Les anciens blocs restent accessibles dans Archives si le serveur les renvoie.
                    </div>
                  </div>
                )}
              </>
            )}

            {restoreView === "archives" && (
              <>
                <h2 style={{ margin: "4px 0 0", color: gold, fontSize: 17, textShadow: "0 0 12px color-mix(in srgb, var(--dc-accent, #d9ff33) 35%, transparent)" }}>Anciennes sauvegardes restaurables</h2>
                {archiveCompleteEntries.length > 0 && archiveCompleteEntries.map(renderEntry)}
                {archiveHistoryEntries.length > 0 && (
                  <>
                    <h3 style={{ margin: "4px 0 0", color: amber, fontSize: 15 }}>Historique à vérifier</h3>
                    {archiveHistoryEntries.map(renderEntry)}
                  </>
                )}
                {backupProvider === "cloud" && archiveCloudOtherEntries.length > 0 && (
                  <>
                    <h3 style={{ margin: "4px 0 0", color: neon, fontSize: 15 }}>Profils / état cloud</h3>
                    {archiveCloudOtherEntries.map(renderEntry)}
                  </>
                )}
                {!archiveEntries.length && (
                  <div style={panel}>
                    <strong style={{ color: amber }}>Aucune ancienne sauvegarde restaurable</strong>
                    <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
                      Les blocs techniques, stats seules ou sans historique réel restent masqués pour éviter les mauvaises restaurations.
                    </div>
                  </div>
                )}
              </>
            )}

            {restoreView === "trash" && (
              <>
                <div style={{ ...panel, borderColor: "rgba(251,113,133,.35)" }}>
                  <h2 style={{ margin: 0, color: red, fontSize: 18 }}>{backupProvider === "cloud" ? "Corbeille cloud" : "Corbeille NAS"}</h2>
                  <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                    Ici les sauvegardes sont seulement mises de côté. <b>Vider la corbeille</b> les supprime définitivement du serveur et libère la place.
                  </p>
                  <button style={dangerBtn} disabled={busy || !trashRemoteEntries.length} onClick={emptyTrash}>Vider la corbeille</button>
                </div>
                {trashRemoteEntries.length > 0 ? trashRemoteEntries.map(renderTrashEntry) : (
                  <div style={panel}>
                    <strong style={{ color: green }}>Corbeille vide</strong>
                    <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
                      Rien à supprimer définitivement pour le moment.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "matches" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...panel, borderColor: "rgba(52,211,153,.36)" }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 19 }}>Restaurer une partie à l’unité</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Chaque partie terminée est sauvegardée séparément après son enregistrement dans l’Historique. Ici tu peux remettre une seule partie sans remplacer tout le compte.
              </p>
            </div>

            {matchBackupEntries.length > 0 ? matchBackupEntries.map((item) => (
              <MatchBackupCard
                key={`${item.origin || "local"}:${item.matchId || item.id}`}
                item={item}
                busy={busy}
                onRestore={() => restoreSingleMatch(item)}
                onExport={() => exportSingleMatch(item)}
                onDelete={() => deleteSingleMatch(item)}
              />
            )) : (
              <div style={panel}>
                <strong style={{ color: amber }}>Aucune sauvegarde de partie encore détectée</strong>
                <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
                  Termine une nouvelle partie : elle créera automatiquement un bloc local, puis un bloc Cloudflare R2 si ton compte public est actif, ou NAS si ton compte fondateur utilise encore le NAS.
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "backup" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...panel, borderColor: accentSoftBorder }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 19 }}>Choisir la destination</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Choisis ici où cette sauvegarde complète doit être écrite. Ce choix est mémorisé et devient aussi la destination des prochaines sauvegardes automatiques compatibles.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 9, marginTop: 10 }}>
                {[...getPublicStorageDestinations(), getStorageDestination("founder_nas")].map((destination) => {
                  const active = selectedDestination === destination.id;
                  const accountRequired = destination.id === "cloud_r2" || destination.id === "founder_nas";
                  const disabled = accountRequired && !hasConnectedAccount;
                  return (
                    <button
                      key={destination.id}
                      type="button"
                      disabled={disabled || busy}
                      onClick={() => void selectStorageDestination(destination.id)}
                      style={{
                        textAlign: "left",
                        borderRadius: 16,
                        padding: 12,
                        minWidth: 0,
                        border: active ? `2px solid ${gold}` : "1px solid rgba(148,163,184,.28)",
                        background: active ? accentSoftBg : "rgba(255,255,255,.035)",
                        color: "#fff",
                        cursor: disabled || busy ? "not-allowed" : "pointer",
                        opacity: disabled ? .55 : 1,
                        boxShadow: active ? `0 0 18px ${accentGlow}` : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <span
                          style={{
                            width: 44,
                            height: 44,
                            flex: "0 0 44px",
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 14,
                            color: active ? gold : neon,
                            border: active ? `1px solid ${accentSoftBorder}` : "1px solid rgba(148,163,184,.24)",
                            background: active ? accentSoftBg : "rgba(15,23,42,.55)",
                            boxShadow: active ? `0 0 16px ${accentGlow}` : "none",
                          }}
                        >
                          <StorageDestinationIcon id={destination.id} />
                        </span>
                        {active && <span style={{ color: green, fontSize: 10, fontWeight: 1000, paddingTop: 4 }}>ACTIF</span>}
                      </div>
                      <strong style={{ display: "block", marginTop: 9, color: active ? gold : "#fff", fontSize: 13, ...wrapText }}>{destination.label}</strong>
                      <div style={{ marginTop: 5, color: muted, fontSize: 11, lineHeight: 1.38, ...wrapText }}>{destination.description}</div>
                      {accountRequired && !hasConnectedAccount && <div style={{ marginTop: 6, color: amber, fontSize: 10.5, fontWeight: 900 }}>Connexion requise</div>}
                      {destination.warning && <div style={{ marginTop: 6, color: amber, fontSize: 10.5, lineHeight: 1.35 }}>{destination.warning}</div>}
                    </button>
                  );
                })}
              </div>

              {selectedDestination === "app_local" && (
                <div style={{ marginTop: 12, padding: 11, borderRadius: 14, border: "1px solid rgba(52,211,153,.28)", background: "rgba(52,211,153,.06)" }}>
                  <strong style={{ color: green }}>Espace local de cet appareil</strong>
                  <div style={{ marginTop: 5, color: "#cbd5e1", fontSize: 12, lineHeight: 1.4 }}>
                    Utilisé : {formatStorageBytes(storageEstimate.usage)} · Disponible estimé : {formatStorageBytes(storageEstimate.free)} · Quota navigateur : {formatStorageBytes(storageEstimate.quota)}
                  </div>
                </div>
              )}

              {(selectedDestination === "device_file" || selectedDestination === "external_sd_manual") && (
                <div style={{ marginTop: 12, padding: 11, borderRadius: 14, border: `1px solid ${externalBackupStatus.configured ? "rgba(52,211,153,.34)" : "rgba(251,191,36,.34)"}`, background: "rgba(255,255,255,.025)" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ color: externalBackupStatus.configured ? green : amber }}>
                      {externalBackupStatus.configured ? externalBackupStatus.fileName || "Fichier configuré" : "Aucun fichier sélectionné"}
                    </strong>
                    <span style={{ marginLeft: "auto", color: externalBackupStatus.permission === "granted" ? green : muted, fontSize: 10.5, fontWeight: 900 }}>
                      {externalBackupStatus.permission === "granted" ? "ÉCRITURE AUTORISÉE" : externalBackupStatus.supported ? "AUTORISATION À DONNER" : "TÉLÉCHARGEMENT MANUEL"}
                    </span>
                  </div>
                  <div style={{ marginTop: 5, color: muted, fontSize: 11.5, lineHeight: 1.4 }}>
                    Le fichier peut se trouver sur le PC, un HDD, une clé USB, une carte SD ou un partage NAS déjà monté dans le système.
                  </div>
                  {externalBackupStatus.lastSavedAt && (
                    <div style={{ marginTop: 5, color: green, fontSize: 10.5 }}>
                      Dernière écriture : {new Date(externalBackupStatus.lastSavedAt).toLocaleString("fr-FR")} · {formatStorageBytes(externalBackupStatus.lastBytes || 0)}
                    </div>
                  )}
                  {externalBackupStatus.lastError && <div style={{ marginTop: 5, color: red, fontSize: 10.5 }}>{externalBackupStatus.lastError}</div>}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9 }}>
                    <button style={btn} disabled={busy || externalBackupBusy !== null} onClick={() => void runExternalBackupAction("choose")}>
                      {externalBackupBusy === "choose" ? "Ouverture…" : externalBackupStatus.configured ? "Changer de fichier" : "Choisir un fichier"}
                    </button>
                    <button style={btn} disabled={busy || externalBackupBusy !== null || !externalBackupStatus.configured} onClick={() => void runExternalBackupAction("save")}>
                      {externalBackupBusy === "save" ? "Écriture…" : "Sauvegarder maintenant"}
                    </button>
                    <button style={btn} disabled={busy || externalBackupBusy !== null} onClick={() => void runExternalBackupAction("download")}>
                      {externalBackupBusy === "download" ? "Export…" : "Télécharger une copie"}
                    </button>
                  </div>
                </div>
              )}

              {selectedDestination === "cloud_r2" && (
                <div style={{ marginTop: 12, padding: 11, borderRadius: 14, border: `1px solid ${directR2Status?.ok ? "rgba(52,211,153,.34)" : "rgba(251,191,36,.34)"}`, background: "rgba(255,255,255,.025)", color: "#cbd5e1", fontSize: 11.5, lineHeight: 1.42 }}>
                  <strong style={{ color: directR2Status?.ok ? green : amber }}>
                    {directR2Status == null
                      ? "Vérification Cloudflare Pages/R2…"
                      : directR2Status.ok
                        ? "R2 DIRECT PRÊT — indépendant du NAS"
                        : "R2 DIRECT INCOMPLET"}
                  </strong>
                  <div style={{ marginTop: 5 }}>
                    Les parties, historiques, statistiques, sauvegardes et médias sont envoyés dans <b style={{ color: neon }}>Cloudflare R2</b>. Supabase reste limité à l’authentification et au profil léger.
                  </div>
                  <div style={{ marginTop: 6, color: green, fontSize: 10.8, fontWeight: 900 }}>
                    Rétention automatique : 2 sauvegardes maximum — la courante + la précédente. Toute génération plus ancienne est supprimée physiquement de R2 après chaque nouvelle sauvegarde.
                  </div>
                  {directR2Usage && (() => {
                    const plan = getStoragePlan(directR2Usage.planId);
                    const unlimited = directR2Usage.billingExempt || directR2Usage.quotaBytes >= Number.MAX_SAFE_INTEGER;
                    return (
                      <div style={{ marginTop: 8, padding: 9, borderRadius: 12, border: "1px solid rgba(34,211,238,.22)", background: "rgba(34,211,238,.05)" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <b style={{ color: neon }}>Offre : {plan.label}</b>
                          <span style={{ color: muted }}>· {unlimited ? "quota admin" : `${formatStorageBytes(directR2Usage.usedBytes)} / ${formatStorageBytes(directR2Usage.quotaBytes)}`}</span>
                          <span style={{ color: green, marginLeft: "auto" }}>{directR2Usage.retainedBackups}/{directR2Usage.retentionTotal} backup(s)</span>
                        </div>
                        {!directR2Usage.billingExempt && (
                          <button
                            type="button"
                            onClick={() => { window.location.hash = "#/settings?account=storage"; }}
                            style={{ ...btn, marginTop: 8, borderColor: gold, color: gold }}
                          >
                            Gérer / passer à une offre cloud payante
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  {directR2Status && (
                    <div style={{ marginTop: 6, color: directR2Status.ok ? green : amber, fontSize: 10.5 }}>
                      Binding USER_DATA_BUCKET : {directR2Status.bucketReady ? "OK" : "MANQUANT"} · Auth Supabase : {directR2Status.supabaseAuthConfigured ? "OK" : "NON"} · Auth JWT NAS : {directR2Status.nasJwtConfigured ? "OK" : "NON"}
                      {!directR2Status.ok && directR2Status.message ? ` · ${directR2Status.message}` : ""}
                    </div>
                  )}
                </div>
              )}

              {selectedDestination === "founder_nas" && (
                <div style={{ marginTop: 12, color: "#cbd5e1", fontSize: 11.5, lineHeight: 1.42 }}>
                  Le NAS reçoit la sauvegarde complète. Une sécurité locale est créée avant l’envoi. Supabase sert uniquement de connexion de secours et ne reçoit aucune partie.
                </div>
              )}
            </div>

            <div style={panel}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 19 }}>Créer un point de restauration</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Destination sélectionnée : <b style={{ color: gold }}>{activeDestination.label}</b>. La sauvegarde contient les parties, l’historique, les profils, les statistiques, les compétitions et les références médias.
              </p>
              {remoteDestinationNeedsAccount && !hasConnectedAccount && (
                <div style={{ marginBottom: 10, padding: 9, borderRadius: 12, border: "1px solid rgba(251,113,133,.35)", color: red, background: "rgba(251,113,133,.07)", fontSize: 12, lineHeight: 1.4 }}>
                  Aucun compte connecté : cette destination distante ne peut pas être utilisée. Choisis Local/Fichier ou reconnecte ton compte.
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <button style={primaryBtn} disabled={primaryBackupDisabled} onClick={() => void createSelectedDestinationBackup()}>{primaryBackupLabel}</button>
                {selectedDestination !== "app_local" && <button style={btn} disabled={busy} onClick={createLocalSlot}>Créer sécurité locale</button>}
                <button style={{ ...btn, borderColor: amber, color: amber, background: "rgba(251,191,36,.10)" }} disabled={busy} onClick={() => inputRef.current?.click()}>Importer JSON</button>
                <input ref={inputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => importJsonFile(e.currentTarget.files?.[0] || null)} />
              </div>
            </div>

            <div style={{ ...panel, borderColor: "rgba(251,191,36,.34)" }}>
              <strong style={{ color: amber }}>Règle simple</strong>
              <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.48, marginTop: 7, ...wrapText }}>
                Une sauvegarde fiable doit contenir <b>parties + historique + profils + stats</b>. Les blocs “stats seules” ou “techniques” sont masqués parce qu’ils ne peuvent pas reconstruire correctement les cartes historiques.
              </div>
            </div>
          </div>
        )}

        {tab === "diagnostic" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={panel}>
              <h2 style={{ color: "#fff", margin: 0, fontSize: 19 }}>Mode expert</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Ici seulement on voit les blocs bruts IndexedDB/localStorage. Ils servent à comprendre où sont les données, pas à choisir une restauration normale.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={primaryBtn} disabled={busy} onClick={refresh}>Scanner maintenant</button>
                <button style={btn} onClick={() => setShowDiagnostic((v) => !v)}>{showDiagnostic ? "Masquer blocs bruts" : `Afficher ${technicalCount} blocs bruts`}</button>
              </div>
            </div>

            {showDiagnostic && blocks.map((block) => (
              <TechnicalBlockCard
                key={`diag-${block.id}`}
                block={block}
                busy={busy}
                onExport={() => exportJsonDownload(block, `${block.id.replace(/[^a-z0-9_-]/gi, "_")}.json`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
