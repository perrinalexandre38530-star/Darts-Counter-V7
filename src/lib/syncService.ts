import LZString from "lz-string";
import { apiGet, apiPost } from "./apiClient";
import { loadStore, importAll, saveStore, exportAll } from "./storage";
import { rebuildStatsToStore } from "./stats/rebuildStatsToStore";
import { importHistoryDump } from "./historyCloud";

type CompressedBackupPayload = {
  _format: "lz-string+store-v1";
  compressed: true;
  encoding: "utf16";
  data: string;
  meta?: {
    rawBytes?: number;
    compressedChars?: number;
    createdAt?: number;
  };
};

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
      (lower === "avatar" || lower === "avatarurl" || lower === "avatardataurl" || lower === "avatar_data_url") &&
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

  // Keep main profile avatars at top-level, but strip duplicated avatars from history/matches payloads.
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

  // Keep top-level profiles/friends as-is so avatars still restore correctly.
  return base;
}

function compressBackupPayload(payload: any): CompressedBackupPayload {
  const json = safeJsonStringify(payload, "{}");
  const compressed = LZString.compressToUTF16(json);

  return {
    _format: "lz-string+store-v1",
    compressed: true,
    encoding: "utf16",
    data: compressed,
    meta: {
      rawBytes: json.length,
      compressedChars: compressed.length,
      createdAt: Date.now(),
    },
  };
}

function decompressBackupPayload(payload: any): any {
  if (!payload || payload._format !== "lz-string+store-v1" || !payload.compressed || typeof payload.data !== "string") {
    return payload;
  }

  const json = LZString.decompressToUTF16(payload.data);
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

export async function pushFullBackupToNas() {
  // exportAll() is too heavy for this project with avatars/history blobs.
  // Save a slimmed store and compress it before upload.
  const store = await loadStore();

  if (!store) {
    throw new Error("Aucun store local à sauvegarder");
  }

  const slimStore = buildSlimBackupStore(store);
  const compressedPayload = compressBackupPayload(slimStore);

  const payload = {
    id: crypto.randomUUID(),
    deviceId: getOrCreateDeviceId(),
    payload: compressedPayload,
  };

  return apiPost("/backup/full", payload);
}

export async function restoreLatestBackupFromNas() {
  const data = await apiGet("/backup/full/latest");

  if (!data?.payload) {
    throw new Error("Aucun backup NAS disponible");
  }

  const payload = decompressBackupPayload(data.payload);

  // Structured snapshots from exportAll()
  if ((payload?._v === 1 || payload?._v === 2) && payload?.idb) {
    await importAll(payload);
  } else {
    // Legacy or slim raw store
    await saveStore(payload);

    try {
      const historyDump = buildHistoryDumpFromRawStore(payload);
      if (Object.keys(historyDump.rows).length > 0) {
        await importHistoryDump(historyDump, { replace: true });
      }
    } catch (e) {
      console.warn("Import history dump échoué", e);
    }

    try {
      await rebuildStatsToStore();
    } catch (e) {
      console.warn("Rebuild stats échoué", e);
    }
  }

  // Leave time for success UI before refreshing
  window.setTimeout(() => {
    window.location.reload();
  }, 1200);

  return data;
}
