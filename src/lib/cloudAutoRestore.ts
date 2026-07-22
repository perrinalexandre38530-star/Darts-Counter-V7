import { readNasAccessToken } from "./apiClient";
import { importCloudSnapshot, loadStore, setStorageUser } from "./storage";
import {
  downloadCloudObject,
  getAccountStorageUsage,
  listCloudVaultBackups,
  type CloudObjectIndexItem,
} from "./cloudStorageApi";
import { restoreCloudBackupFromJson } from "./cloudBackup";
import { History } from "./history";
import LZString from "lz-string";

const AUTO_RESTORE_PREFIX = "dc_cloud_auto_restore_v1";
const AUTO_RESTORE_DECLINED_PREFIX = "dc_cloud_auto_restore_declined_v1";
const DECLINE_COOLDOWN_MS = 6 * 60 * 60 * 1000;

let inFlight: Promise<void> | null = null;
let lastRunAt = 0;

function safeJsonParse<T = any>(value: any, fallback: T): T {
  try {
    if (value == null) return fallback;
    if (typeof value !== "string") return value as T;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowsFrom(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}


function decodeHistoryPayloadCompressed(value: any): any {
  try {
    const raw = String(value || "");
    if (!raw) return null;
    const text = LZString.decompressFromUTF16(raw);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function mergeHistoryOnlyFromCloudSnapshot(snapshot: any, sourceId: string): Promise<number> {
  const normalized = unwrapSnapshotEnvelope(snapshot);
  const rows = rowsFrom(normalized?.history?.rows);
  if (!rows.length) return 0;

  let imported = 0;
  for (const raw of rows) {
    try {
      const id = String(raw?.matchId || raw?.id || raw?.resumeId || "").trim();
      if (!id) continue;

      const payload =
        raw?.payload && typeof raw.payload === "object"
          ? raw.payload
          : decodeHistoryPayloadCompressed(raw?.payloadCompressed);

      const rec: any = {
        ...(raw || {}),
        id,
        matchId: id,
        ...(payload ? { payload } : {}),
      };
      delete rec.payloadCompressed;

      const result = await History.upsertFromCloud(rec, {
        cloudEventId: `${sourceId}:${id}`,
        cloudCreatedAt: String(raw?.updatedAt || raw?.createdAt || ""),
      });
      if (result?.applied === "cloud") imported += 1;
    } catch (error) {
      console.warn("[cloudAutoRestore] history row merge skipped", error);
    }
  }

  if (imported > 0) {
    try { window.dispatchEvent(new CustomEvent("dc-history-updated", { detail: { reason: "cloud-r2-history-merge", imported } })); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc-store-updated", { detail: { reason: "cloud-r2-history-merge", imported } })); } catch {}
  }
  return imported;
}

const HISTORY_SYNC_PREFIX = "dc_cloud_r2_history_sync_v3";
let historySyncTimer: number | null = null;
let historySyncUserId = "";

async function syncLatestCloudHistory(userId: string): Promise<number> {
  const uid = String(userId || "").trim();
  if (!uid || !readNasAccessToken()) return 0;

  const usage = await getAccountStorageUsage().catch(() => null);
  if (String(usage?.preference?.storage_provider || "").trim() !== "cloud_r2") return 0;

  const cloudItems = await listCloudVaultBackups(20, false).catch(() => []);
  const latest = pickLatestUsefulCloudSlot(cloudItems);
  if (!latest?.id) return 0;

  const updated = String(latest.updated_at || latest.created_at || "");
  const markerKey = `${HISTORY_SYNC_PREFIX}:${uid}`;
  const previous = readStorageKey(markerKey);
  const signature = `${String(latest.id)}|${updated}`;
  if (previous === signature) return 0;

  const payload = await fetchCloudSlotPayload(latest);
  const imported = await mergeHistoryOnlyFromCloudSnapshot(payload, String(latest.id));
  writeStorageKey(markerKey, signature);
  return imported;
}

function ensureCloudHistoryAutoSync(userId: string): void {
  const uid = String(userId || "").trim();
  if (!uid || typeof window === "undefined") return;
  historySyncUserId = uid;

  if (historySyncTimer == null) {
    historySyncTimer = window.setInterval(() => {
      if (!historySyncUserId) return;
      void syncLatestCloudHistory(historySyncUserId).catch((error) =>
        console.warn("[cloudAutoRestore] periodic R2 history sync skipped", error)
      );
    }, 60_000);
  }

  const anyWindow = window as any;
  if (!anyWindow.__dcR2HistoryFocusSyncInstalled) {
    anyWindow.__dcR2HistoryFocusSyncInstalled = true;
    const run = () => {
      if (!historySyncUserId) return;
      void syncLatestCloudHistory(historySyncUserId).catch(() => undefined);
    };
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") run();
    });
  }
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

function readStorageKey(key: string): string {
  try { return window.localStorage.getItem(key) || ""; } catch { return ""; }
}

function writeStorageKey(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch {}
}

function removeStorageKey(key: string): void {
  try { window.localStorage.removeItem(key); } catch {}
}

function rememberAuthKeys(): () => void {
  const keys = [
    "dc_online_auth_supabase_v1",
    "dc_nas_access_token_v1",
    "dc_nas_refresh_token_v1",
    "dc_user_id",
    "dc_storage_user_id_v1",
    "dc_api_url",
  ];
  const saved: Record<string, string> = {};
  try {
    for (const key of keys) {
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

function countProfilesFromStore(store: any): number {
  return Array.isArray(store?.profiles)
    ? store.profiles.filter((p: any) => p && String(p.id || "").trim()).length
    : 0;
}

function countProfilesFromSnapshot(snapshot: any): number {
  let best = Math.max(countProfilesFromStore(snapshot?.store), countProfilesFromStore(snapshot?.data));
  const idb = snapshot?.idb;
  if (idb && typeof idb === "object") {
    for (const [key, value] of Object.entries<any>(idb)) {
      if (/store/i.test(String(key))) best = Math.max(best, countProfilesFromStore(value));
    }
  }
  return best;
}

function countHistoryRows(snapshot: any): number {
  let best = rowsFrom(snapshot?.history?.rows).length;
  const idb = snapshot?.idb;
  if (idb && typeof idb === "object") {
    for (const [key, value] of Object.entries<any>(idb)) {
      const k = String(key || "").toLowerCase();
      if (!k.includes("history")) continue;
      if (Array.isArray(value)) best = Math.max(best, value.length);
      else if (value?.rows) best = Math.max(best, rowsFrom(value.rows).length);
      else if (value && typeof value === "object") best = Math.max(best, Object.keys(value).length);
    }
  }
  return best;
}

function summarizeSnapshot(snapshot: any) {
  const normalized = unwrapSnapshotEnvelope(snapshot);
  return {
    profiles: countProfilesFromSnapshot(normalized),
    matches: countHistoryRows(normalized),
  };
}

async function summarizeLocalState() {
  try {
    const store = await loadStore<any>();
    return {
      profiles: countProfilesFromStore(store),
      matches: 0,
    };
  } catch {
    return { profiles: 0, matches: 0 };
  }
}

function cloudSlotScore(slot: CloudObjectIndexItem): number {
  const meta: any = slot?.metadata && typeof slot.metadata === "object" ? slot.metadata : {};
  const history = Number(meta.historyCount || meta.historyRows || meta.matches || 0) || 0;
  const profiles = Number(meta.profilesCount || meta.profiles || 0) || 0;
  const time = Date.parse(String(slot.updated_at || slot.created_at || "")) || 0;
  return history * 10000 + profiles * 1000 + time / 1_000_000;
}

function pickLatestUsefulCloudSlot(items: CloudObjectIndexItem[]): CloudObjectIndexItem | null {
  const clean = (items || []).filter((it: any) => it?.id && !it?.is_deleted);
  if (!clean.length) return null;
  clean.sort((a, b) => {
    const sb = cloudSlotScore(b);
    const sa = cloudSlotScore(a);
    if (sb !== sa) return sb - sa;
    const tb = Date.parse(String(b.updated_at || b.created_at || "")) || 0;
    const ta = Date.parse(String(a.updated_at || a.created_at || "")) || 0;
    return tb - ta;
  });
  return clean[0] || null;
}

async function fetchCloudSlotPayload(slot: CloudObjectIndexItem): Promise<any> {
  const downloaded = await downloadCloudObject(String(slot.id || ""));
  const content = downloaded?.content ?? downloaded?.text ?? downloaded;
  if (typeof content === "string") return safeJsonParse(content, null);
  return content;
}

async function restoreDownloadedCloudSnapshot(payload: any, slot: CloudObjectIndexItem): Promise<{ profiles: number; matches: number }> {
  const restoreAuth = rememberAuthKeys();
  const normalized = unwrapSnapshotEnvelope(payload);
  const summary = summarizeSnapshot(normalized);

  if (!looksLikeCloudSnapshot(normalized)) {
    // Ancien format cloud backup : on le délègue au restaurateur dédié.
    const restored = await restoreCloudBackupFromJson({ json: JSON.stringify(payload), mode: "merge", rebuild: true });
    if (!restored.ok) throw new Error(restored.error || "Restauration cloud impossible.");
  } else {
    await importCloudSnapshot(normalized, { mode: "merge" });
  }

  restoreAuth();
  writeStorageKey(`${AUTO_RESTORE_PREFIX}:imported:${String(slot.id || "")}`, String(Date.now()));
  try { window.dispatchEvent(new CustomEvent("dc-history-updated", { detail: { reason: "cloud-auto-restore" } })); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc-store-updated", { detail: { reason: "cloud-auto-restore" } })); } catch {}
  return summary;
}

export async function maybeAutoRestoreCloudForSignedInUser(userId?: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  const uid = String(userId || "").trim();
  if (!uid || !readNasAccessToken()) return;

  const now = Date.now();
  if (now - lastRunAt < 10_000) return;
  lastRunAt = now;

  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      try { setStorageUser(uid); } catch {}
      try { window.localStorage.setItem("dc_user_id", uid); } catch {}

      const usage = await getAccountStorageUsage().catch(() => null);
      const provider = String(usage?.preference?.storage_provider || "").trim();
      if (provider !== "cloud_r2") return;

      // Multi-appareils : fusionne toujours l'historique R2 le plus récent,
      // même si ce navigateur possède déjà des profils ou des parties.
      ensureCloudHistoryAutoSync(uid);
      await syncLatestCloudHistory(uid).catch((error) => {
        console.warn("[cloudAutoRestore] immediate R2 history sync skipped", error);
      });

      const local = await summarizeLocalState();
      const localIsEmpty = local.profiles <= 0 && local.matches <= 0;
      if (!localIsEmpty) return;

      const declinedRaw = readStorageKey(`${AUTO_RESTORE_DECLINED_PREFIX}:${uid}`);
      const declinedAt = Number(declinedRaw || "0") || 0;
      if (declinedAt > 0 && now - declinedAt < DECLINE_COOLDOWN_MS) return;

      const cloudItems = await listCloudVaultBackups(10, false).catch(() => []);
      const latest = pickLatestUsefulCloudSlot(cloudItems);
      if (!latest?.id) return;
      if (readStorageKey(`${AUTO_RESTORE_PREFIX}:imported:${String(latest.id)}`)) return;

      const payload = await fetchCloudSlotPayload(latest);
      const remoteSummary = summarizeSnapshot(payload);
      if (remoteSummary.profiles <= 0 && remoteSummary.matches <= 0) return;

      const label = String(latest.title || "Sauvegarde cloud");
      const ok = window.confirm(
        `Une sauvegarde Cloudflare R2 existe pour ce compte.\n\n` +
        `${label}\n` +
        `${remoteSummary.matches} partie(s) • ${remoteSummary.profiles} profil(s)\n\n` +
        `Ce navigateur semble vide pour ce compte. Restaurer maintenant en fusion ?`
      );
      if (!ok) {
        writeStorageKey(`${AUTO_RESTORE_DECLINED_PREFIX}:${uid}`, String(Date.now()));
        return;
      }
      removeStorageKey(`${AUTO_RESTORE_DECLINED_PREFIX}:${uid}`);
      const restoredSummary = await restoreDownloadedCloudSnapshot(payload, latest);
      window.setTimeout(() => {
        try {
          window.alert(`Restauration cloud terminée : ${restoredSummary.matches} partie(s), ${restoredSummary.profiles} profil(s). L’application va se recharger.`);
        } catch {}
        try { window.location.reload(); } catch {}
      }, 250);
    } catch (error) {
      try {
        window.localStorage.setItem("dc_cloud_auto_restore_last_error_v1", JSON.stringify({ at: new Date().toISOString(), message: (error as any)?.message || String(error) }));
      } catch {}
      console.warn("[cloudAutoRestore] skipped", error);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
