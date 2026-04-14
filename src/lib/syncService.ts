import LZString from "lz-string";
import { gzipSync, gunzipSync, strToU8, strFromU8 } from "fflate";
import { apiGet, apiPost } from "./apiClient";
import { exportAll, loadStore, saveStore, importCloudSnapshot } from "./storage";
import { cancelScheduledStatsIndexRefresh, scheduleStatsIndexRefresh } from "./stats/rebuildStatsFromHistory";
import { importHistoryDump } from "./historyCloud";

type CompressedBackupPayload = {
  _format: "lz-string+store-v1" | "gzip+store-v2";
  compressed: true;
  encoding: "base64" | "utf16";
  data: string;
  meta?: {
    rawBytes?: number;
    compressedChars?: number;
    createdAt?: number;
  };
};

function safeJsonParse<T = any>(value: any, fallback: T): T {
  try {
    if (value == null) return fallback;
    if (typeof value !== "string") return value as T;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function getCurrentBackupOwnerId(): Promise<string> {

  try {
    const store = await loadStore();
    const activeProfileId = (store as any)?.activeProfileId ?? null;
    if (activeProfileId) return String(activeProfileId);
  } catch {}

  throw new Error("Impossible de déterminer le propriétaire du backup");
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem("dc_device_id");
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem("dc_device_id", id);
  return id;
}

function safeJsonStringify(value: any, fallback = "{}") {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function isObject(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isDataUrl(value: any) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function stripHeavyAvatarFields(value: any, keepAvatars = false): any {
  if (Array.isArray(value)) {
    return value.map((item) => stripHeavyAvatarFields(item, keepAvatars));
  }

  if (!isObject(value)) return value;

  const out: Record<string, any> = {};
  for (const [key, raw] of Object.entries(value)) {
    const lower = key.toLowerCase();

    if (
      !keepAvatars &&
      (lower === "avatar" ||
        lower === "avatarurl" ||
        lower === "avatardataurl" ||
        lower === "avatar_data_url") &&
      isDataUrl(raw)
    ) {
      continue;
    }

    out[key] = stripHeavyAvatarFields(raw, keepAvatars);
  }
  return out;
}

function buildSlimBackupStore(store: any) {
  const base = JSON.parse(safeJsonStringify(store, "{}"));

  if (Array.isArray(base?.history)) {
    base.history = stripHeavyAvatarFields(base.history, false);
  }
  if (Array.isArray(base?.saved)) {
    base.saved = stripHeavyAvatarFields(base.saved, false);
  }
  if (Array.isArray(base?.matches)) {
    base.matches = stripHeavyAvatarFields(base.matches, false);
  }
  if (Array.isArray(base?.recentMatches)) {
    base.recentMatches = stripHeavyAvatarFields(base.recentMatches, false);
  }

  return base;
}

function uint8ToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToUint8(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function compressBackupPayload(payload: any): CompressedBackupPayload {
  const json = safeJsonStringify(payload, "{}");
  const gz = gzipSync(strToU8(json));
  const base64 = uint8ToBase64(gz);

  return {
    _format: "gzip+store-v2",
    compressed: true,
    encoding: "base64",
    data: base64,
    meta: {
      rawBytes: json.length,
      compressedChars: base64.length,
      createdAt: Date.now(),
    },
  };
}

function decompressBackupPayload(payload: any): any {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (
    payload._format === "gzip+store-v2" &&
    payload.compressed &&
    typeof payload.data === "string"
  ) {
    const bytes = base64ToUint8(payload.data);
    const json = strFromU8(gunzipSync(bytes));
    return JSON.parse(json);
  }

  if (
    payload._format !== "lz-string+store-v1" ||
    !payload.compressed ||
    typeof payload.data !== "string"
  ) {
    return payload;
  }

  let json: string | null = null;

  if (payload.encoding === "base64") {
    json = LZString.decompressFromBase64(payload.data);
  } else if (payload.encoding === "utf16") {
    json = LZString.decompressFromUTF16(payload.data);
  } else {
    throw new Error(
      `Encodage de backup NAS non supporté: ${String(payload.encoding || "unknown")}`
    );
  }

  if (!json) {
    throw new Error("Impossible de décompresser le backup NAS");
  }

  return JSON.parse(json);
}

function buildHistoryDumpFromRawStore(payload: any) {
  const rows: Record<string, any> = {};
  const list = Array.isArray(payload?.history) ? payload.history : [];

  for (const row of list) {
    const id = String(row?.id || row?.matchId || row?.header?.id || "").trim();
    if (!id) continue;

    rows[id] = {
      ...(row || {}),
      id,
      matchId: String(row?.matchId || id),
    };
  }

  return { _v: 1 as const, rows };
}

function isStructuredSnapshot(payload: any) {
  return !!payload && (payload?._v === 1 || payload?._v === 2) && !!payload?.idb;
}

async function pushViaModernSync(compressedPayload: CompressedBackupPayload, ownerId: string, deviceId: string) {
  return apiPost("/sync/push", {
    payload: compressedPayload,
    version: 2,
    ownerId,
    deviceId,
  });
}

// Legacy backup path intentionally disabled.
async function pushViaLegacyBackup(_compressedPayload: CompressedBackupPayload, _ownerId: string, _deviceId: string) {
  throw new Error("Legacy backup endpoints disabled; use /sync/push only");
}

export async function pushFullBackupToNas() {
  let snapshot: any = null;

  try {
    snapshot = await exportAll();
  } catch (e) {
    console.warn("exportAll() a échoué, fallback store slim", e);
  }

  if (!snapshot) {
    const store = await loadStore();

    if (!store) {
      throw new Error("Aucune donnée locale à sauvegarder");
    }

    snapshot = buildSlimBackupStore(store);
  }

  const ownerId = await getCurrentBackupOwnerId();
  const deviceId = getOrCreateDeviceId();
  const compressedPayload = compressBackupPayload(snapshot);

  return pushViaModernSync(compressedPayload, ownerId, deviceId);
}

export async function listBackupsFromNas() {
  const ownerId = await getCurrentBackupOwnerId();

  const data = await apiGet("/sync/pull");
  if (!data?.payload) return [];
  return [
    {
      id: `main:${ownerId}`,
      ownerId,
      version: data?.version ?? 2,
      updatedAt: data?.updatedAt ?? null,
      createdAt: data?.updatedAt ?? null,
    },
  ];
}

export async function deleteAllBackupsFromNas() {
  throw new Error("Legacy backup endpoints disabled; use /sync/pull and /sync/push only");
}

export async function restoreLatestBackupFromNas() {
  const ownerId = await getCurrentBackupOwnerId().catch(() => "");
  let data: any = null;

  data = await apiGet("/sync/pull");

  if (!data?.payload) {
    throw new Error("Aucun backup NAS disponible");
  }

  const payload = decompressBackupPayload(data.payload);

  if (isStructuredSnapshot(payload)) {
    // IMPORTANT:
    // - importAll() restaure bien l'IDB + certaines clés localStorage dc_ / dc-
    // - mais les dart sets et bots ont aussi une "source de vérité" dédiée
    //   (dartSetsStore / bots localStorage compressé)
    // - importCloudSnapshot() réinjecte ces collections dans les bons stores
    //   et sécurise un vrai restore "device -> device"
    await importCloudSnapshot(payload, { mode: "replace" });

    try {
      cancelScheduledStatsIndexRefresh();
      await scheduleStatsIndexRefresh({
        reason: "nas-restore-structured",
        debounceMs: 0,
        includeNonFinished: true,
      });
    } catch (e) {
      console.warn("Refresh stats après importCloudSnapshot échoué", e);
    }
  } else {
    const currentStore = await loadStore();
    const merged = { ...(currentStore || {}), ...(payload || {}) };

    await saveStore(merged);

    try {
      const historyDump = buildHistoryDumpFromRawStore(payload);
      if (Object.keys(historyDump.rows).length > 0) {
        await importHistoryDump(historyDump, { replace: false });
      }
    } catch (e) {
      console.warn("Import history dump échoué", e);
    }

    try {
      cancelScheduledStatsIndexRefresh();
      await scheduleStatsIndexRefresh({
        reason: "nas-restore-legacy",
        debounceMs: 0,
        includeNonFinished: true,
      });
    } catch (e) {
      console.warn("Refresh stats échoué", e);
    }
  }

  window.setTimeout(() => {
    window.location.reload();
  }, 1200);

  return data;
}
