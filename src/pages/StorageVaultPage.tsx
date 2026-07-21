import * as React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { apiPost, readNasAccessToken } from "../lib/apiClient";
import { exportCloudSnapshot, importCloudSnapshot, loadStore, setStorageUser } from "../lib/storage";
import {
  createLocalMemorySlot,
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
  listCloudVaultBackups,
  purgeCloudObjectRemote,
  restoreCloudObjectFromTrash,
  uploadCloudVaultSnapshotJson,
  type CloudObjectIndexItem,
} from "../lib/cloudStorageApi";
import { restoreCloudBackupFromJson } from "../lib/cloudBackup";

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
  const historyCount = Number(meta.historyCount ?? meta.matches ?? meta.historyRows ?? 0) || 0;
  const profilesCount = Number(meta.profilesCount ?? meta.profiles ?? 0) || 0;
  const dartsetsCount = Number(meta.dartsetsCount ?? 0) || 0;
  const rawSize = Number(meta.rawSizeBytes ?? meta.originalByteSize ?? item?.size_bytes ?? 0) || 0;
  if (!historyCount && !profilesCount && !dartsetsCount && !rawSize) return null;
  return {
    bytes: rawSize,
    keys: 0,
    profiles: profilesCount,
    matches: historyCount,
    historyRows: historyCount,
    statsBlocks: 0,
    mediaRefs: 0,
    dataImages: 0,
    sports: [],
    names: [],
    exportedAt: meta.exportedAt || item?.created_at || null,
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

function cloudTitle(item: CloudObjectIndexItem, idx: number, latest = false) {
  if (item.title) return item.title;
  return latest ? "Sauvegarde cloud courante" : `Sauvegarde cloud ${String(idx + 1).padStart(2, "0")}`;
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

function SaveCard({ entry, busy, expanded, onToggle, onRestore, onExport, onDelete, restoreLabel = "Restaurer cet état", exportLabel = "Exporter JSON", deleteLabel = "Supprimer" }: {
  entry: SaveEntry;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onExport: () => void;
  onDelete?: () => void;
  restoreLabel?: string;
  exportLabel?: string;
  deleteLabel?: string;
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

export default function StorageVaultPage({ go }: Props) {
  const { theme } = useTheme();
  const auth = useAuthOnline();
  const themeVars = React.useMemo(() => ({ "--dc-accent": theme?.primary || "#d9ff33", "--dc-accent-soft": theme?.accent1 || theme?.primary || "#22d3ee" }) as React.CSSProperties, [theme]);
  const [tab, setTab] = React.useState<TabKey>("restore");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Scan en attente…");
  const [localSlots, setLocalSlots] = React.useState<MemorySlot[]>([]);
  const [nasSlots, setNasSlots] = React.useState<NasSlot[]>([]);
  const [trashNasSlots, setTrashNasSlots] = React.useState<NasSlot[]>([]);
  const [cloudSlots, setCloudSlots] = React.useState<CloudSlot[]>([]);
  const [trashCloudSlots, setTrashCloudSlots] = React.useState<CloudSlot[]>([]);
  const [backupProvider, setBackupProvider] = React.useState<BackupProvider>("nas");
  const [restoreView, setRestoreView] = React.useState<RestoreView>("current");
  const [matchBackups, setMatchBackups] = React.useState<MatchBackupItem[]>([]);
  const [blocks, setBlocks] = React.useState<StorageBlock[]>([]);
  const [showDiagnostic, setShowDiagnostic] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [accountScopeId, setAccountScopeId] = React.useState<string | null>(() => getVaultCurrentUserId());
  const inputRef = React.useRef<HTMLInputElement | null>(null);

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
    try {
      const usage = await getAccountStorageUsage();
      const provider = String(usage?.preference?.storage_provider || "").trim();
      return provider === "cloud_r2" ? "cloud" : "nas";
    } catch {
      return "nas";
    }
  }, []);

  const refresh = React.useCallback(async () => {
    setBusy(true);
    ensureVaultNasToken();
    setAccountScopeId(getVaultCurrentUserId());
    try {
      const provider = await resolveBackupProvider();
      setBackupProvider(provider);

      const [ls, bs, localMatches] = await Promise.all([
        listLocalMemorySlots().catch(() => []),
        scanLocalStorageAndIndexedDb().catch(() => []),
        listLocalMatchBackups().catch(() => []),
      ]);

      setLocalSlots(ls);
      setBlocks(bs);

      if (provider === "cloud") {
        const [cloudRaw, cloudAllRaw] = await Promise.all([
          listCloudVaultBackups(120, false).catch(() => []),
          listCloudVaultBackups(120, true).catch(() => []),
        ]);
        const trashRaw = cloudAllRaw.filter((item) => !!item.is_deleted);
        const activeRaw = cloudRaw.filter((item) => !item.is_deleted);

        const activeToCheck = activeRaw.slice(0, 30);
        const checkedCloud = await Promise.all(activeToCheck.map(async (slot: CloudObjectIndexItem, idx: number) => {
          try {
            const pulled = await pullCloudVaultSlot(slot);
            return { ...slot, __payload: pulled.payload, __summary: pulled.summary, latest: idx === 0 } as CloudSlot;
          } catch {
            const fallback = strictSummaryForCloudPayload(null, cloudObjectMetadataSummary(slot));
            return { ...slot, __summary: fallback, latest: idx === 0 } as CloudSlot;
          }
        }));

        const trashToCheck = trashRaw.slice(0, 30);
        const checkedTrashCloud = await Promise.all(trashToCheck.map(async (slot: CloudObjectIndexItem) => {
          try {
            const pulled = await pullCloudVaultSlot(slot, { trash: true });
            return { ...slot, __payload: pulled.payload, __summary: pulled.summary, deletedAt: slot.updated_at || null } as CloudSlot;
          } catch {
            const fallback = strictSummaryForCloudPayload(null, cloudObjectMetadataSummary(slot));
            return { ...slot, __summary: fallback, deletedAt: slot.updated_at || null } as CloudSlot;
          }
        }));

        setNasSlots([]);
        setTrashNasSlots([]);
        const cloudMatches = await listCloudMatchBackups().catch(() => []);

        setCloudSlots(checkedCloud);
        setTrashCloudSlots(checkedTrashCloud);
        setMatchBackups([...(localMatches || []), ...(cloudMatches || [])]);

        const validCloud = checkedCloud.filter((slot) => assessSaveForProvider(slot.__summary, "cloud").restorable).length;
        const validLocal = ls.filter((slot) => isRestorable(strictSummaryForRestore(slot.payload, slot.summary))).length;
        const hidden = Math.max(0, activeRaw.length - checkedCloud.length);
        const accountHint = getVaultCurrentUserId() ? `Compte public cloud : ${shortId(getVaultCurrentUserId())}.` : "Aucun compte connecté : les sauvegardes cloud sont masquées.";
        setMessage(`${accountHint} ${validCloud + validLocal} vrai(s) emplacement(s) restaurable(s). Destination : Cloudflare R2. La dernière sauvegarde cloud reste visible, les anciennes sont dans Archives, la corbeille contient ${checkedTrashCloud.length} sauvegarde(s). ${cloudMatches.length} sauvegarde(s) cloud de partie à l’unité + ${localMatches.length} locale(s) détectée(s). ${hidden ? `${hidden} ancien(s) slot(s) cloud non scanné(s) restent en expert.` : ""}`);
        return;
      }

      const [nsRaw, trashRaw, nasMatches] = await Promise.all([
        listNasMemorySlots().catch(() => []),
        listNasDeletedMemorySlots().catch(() => []),
        listNasMatchBackups().catch(() => []),
      ]);

      const nsToCheck = nsRaw.slice(0, 30);
      const checkedNas = await Promise.all(nsToCheck.map(async (slot: NasSlot) => {
        try {
          const id = String(slot.id || "latest");
          const pulled = await pullNasMemorySlot(id);
          return {
            ...slot,
            summary: strictSummaryForRestore(pulled.payload, pulled.summary),
            updatedAt: pulled.slot.updatedAt || slot.updatedAt,
            createdAt: pulled.slot.createdAt || slot.createdAt,
            __strictChecked: true,
          } as NasSlot & { __strictChecked?: boolean };
        } catch {
          return { ...slot, summary: normalizeSummary(slot.summary || {}), __strictChecked: false } as NasSlot & { __strictChecked?: boolean };
        }
      }));

      const trashToCheck = trashRaw.slice(0, 30);
      const checkedTrashNas = await Promise.all(trashToCheck.map(async (slot: NasSlot) => {
        try {
          const id = String(slot.id || "");
          const pulled = await pullNasMemorySlot(id, { trash: true });
          return {
            ...slot,
            summary: strictSummaryForRestore(pulled.payload, pulled.summary),
            updatedAt: pulled.slot.updatedAt || slot.updatedAt,
            createdAt: pulled.slot.createdAt || slot.createdAt,
            deletedAt: slot.deletedAt || pulled.slot.deletedAt || null,
            __strictChecked: true,
          } as NasSlot & { __strictChecked?: boolean };
        } catch {
          return { ...slot, summary: normalizeSummary(slot.summary || {}), __strictChecked: false } as NasSlot & { __strictChecked?: boolean };
        }
      }));

      setCloudSlots([]);
      setTrashCloudSlots([]);
      setNasSlots(checkedNas);
      setTrashNasSlots(checkedTrashNas);
      setMatchBackups([...(localMatches || []), ...(nasMatches || [])]);

      const validNas = checkedNas.filter((slot) => isRestorable(slot.summary)).length;
      const validLocal = ls.filter((slot) => isRestorable(strictSummaryForRestore(slot.payload, slot.summary))).length;
      const hidden = Math.max(0, nsRaw.length - checkedNas.length);
      const accountHint = getVaultCurrentUserId() ? `Compte isolé : ${shortId(getVaultCurrentUserId())}.` : "Aucun compte connecté : les sauvegardes utilisateur sont masquées.";
      setMessage(`${accountHint} ${validNas + validLocal} vrai(s) emplacement(s) restaurable(s). Affichage simple : la dernière sauvegarde NAS reste visible, les anciennes sont dans l’onglet Archives, la corbeille contient ${checkedTrashNas.length} emplacement(s). ${((localMatches || []).length + (nasMatches || []).length)} sauvegarde(s) de partie à l’unité détectée(s). Les blocs locaux d’un autre compte sont maintenant masqués. ${hidden ? `${hidden} ancien(s) slot(s) non scanné(s) restent en expert.` : ""}`);
    } catch (error: any) {
      setMessage(`Erreur scan : ${error?.message || error}`);
    } finally {
      setBusy(false);
    }
  }, [ensureVaultNasToken, resolveBackupProvider]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const afterRestoreHousekeeping = async (reason: string) => {
    try { markStatsIndexDirty(reason); } catch {}
    try { await refreshStatsIndexFromHistoryNow({ includeNonFinished: true, persist: true, reason }); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-history-updated", { detail: { reason } })); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-store-updated", { detail: { reason } })); } catch {}
  };

  const uploadCurrentSnapshotToCloudVault = async (reason: string, title?: string) => {
    const snapshot = await exportCloudSnapshot();
    const summary = strictSummaryForCloudPayload(snapshot);
    const snapshotJson = JSON.stringify(snapshot);
    const uploaded = await uploadCloudVaultSnapshotJson({
      snapshotJson,
      title: title || `Sauvegarde cloud — ${new Date().toLocaleString("fr-FR")}`,
      metadata: {
        reason,
        exportedAt: new Date().toISOString(),
        historyCount: summary.historyRows || summary.matches || 0,
        profilesCount: summary.profiles || 0,
        statsBlocks: summary.statsBlocks || 0,
        rawSizeBytes: new Blob([snapshotJson]).size,
      },
    });
    return { uploaded, summary };
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

  const createLocalSlot = async () => {
    setBusy(true);
    try {
      const slot = await createLocalMemorySlot("Bloc local de sécurité", "manual");
      const q = assessSave(strictSummaryForRestore(slot.payload, slot.summary));
      setMessage(`Bloc local créé : ${q.label} · ${slot.summary.matches} parties • ${slot.summary.profiles} profils.`);
      await refresh();
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
      const { uploaded, summary } = await uploadCurrentSnapshotToCloudVault("manual-storage-vault", `Sauvegarde cloud manuelle — ${new Date().toLocaleString("fr-FR")}`);
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
            <StatBox label={backupProvider === "cloud" ? "CLOUD" : "NAS"} value={remoteEntries.length} color={neon} />
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
            <div style={panel}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 19 }}>Créer un point de restauration</h2>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, ...wrapText }}>
                Utilise surtout <b>{backupProvider === "cloud" ? "Créer sauvegarde cloud" : "Créer sauvegarde NAS"}</b>. C’est l’équivalent “Sauvegarder la partie” : historique, stats, profils et médias sont envoyés vers la destination active du compte.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <button style={primaryBtn} disabled={busy} onClick={backupProvider === "cloud" ? createCloudBackup : createNasBackup}>{backupProvider === "cloud" ? "Créer sauvegarde cloud" : "Créer sauvegarde NAS"}</button>
                <button style={btn} disabled={busy} onClick={createLocalSlot}>Créer sécurité locale</button>
                <button style={btn} disabled={busy} onClick={pushCurrentToAccount}>Envoyer état actuel</button>
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
