import { exportCloudSnapshot } from "./storage";
import { loadStoragePrefs } from "./storagePlans";

const DB_NAME = "dc-external-backup-target-v1";
const STORE_NAME = "handles";
const TARGET_KEY = "primary";
const STATUS_KEY = "dc_external_backup_status_v1";
const MIN_AUTO_WRITE_MS = 60_000;

export type ExternalBackupStatus = {
  supported: boolean;
  configured: boolean;
  fileName?: string | null;
  permission?: "granted" | "prompt" | "denied" | "unsupported" | "unknown";
  lastSavedAt?: string | null;
  lastBytes?: number;
  lastError?: string | null;
};

let queuedTimer: number | null = null;
let running: Promise<ExternalBackupStatus> | null = null;
let lastAutoWriteAt = 0;

function supportsFilePicker(): boolean {
  return typeof window !== "undefined" && typeof (window as any).showSaveFilePicker === "function";
}

function readStatus(): ExternalBackupStatus {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (raw) return { supported: supportsFilePicker(), ...JSON.parse(raw) };
  } catch {}
  return { supported: supportsFilePicker(), configured: false, permission: supportsFilePicker() ? "unknown" : "unsupported" };
}

function writeStatus(next: ExternalBackupStatus): ExternalBackupStatus {
  const value = { ...next, supported: supportsFilePicker() };
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("dc-external-backup-status", { detail: value }));
  } catch {}
  return value;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB indisponible"));
  });
}

async function getHandle(): Promise<any | null> {
  if (!supportsFilePicker()) return null;
  try {
    const db = await openDb();
    return await new Promise<any | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(TARGET_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  } catch {
    return null;
  }
}

async function putHandle(handle: any): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, TARGET_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Impossible de mémoriser le fichier"));
  });
  db.close();
}

async function deleteHandle(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(TARGET_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {}
}

async function permissionFor(handle: any, request: boolean): Promise<"granted" | "prompt" | "denied" | "unknown"> {
  try {
    const opts = { mode: "readwrite" };
    const current = typeof handle?.queryPermission === "function" ? await handle.queryPermission(opts) : "unknown";
    if (current === "granted" || current === "denied") return current;
    if (request && typeof handle?.requestPermission === "function") {
      const requested = await handle.requestPermission(opts);
      if (requested === "granted" || requested === "denied" || requested === "prompt") return requested;
    }
    return current === "prompt" ? "prompt" : "unknown";
  } catch {
    return "unknown";
  }
}

async function buildBackupJson(reason: string): Promise<string> {
  const snapshot: any = await exportCloudSnapshot();
  const wrapped = {
    ...snapshot,
    externalBackup: {
      version: 1,
      reason,
      exportedAt: new Date().toISOString(),
      app: "multisports-scoring",
    },
  };
  return JSON.stringify(wrapped);
}

function wrapPreparedSnapshotJson(snapshotJson: string, reason: string): string {
  try {
    const parsed = JSON.parse(snapshotJson);
    return JSON.stringify({
      ...parsed,
      externalBackup: {
        version: 1,
        reason,
        exportedAt: new Date().toISOString(),
        app: "multisports-scoring",
      },
    });
  } catch {
    return snapshotJson;
  }
}

export async function chooseExternalBackupFileWithJson(snapshotJson: string, reason = "manual"): Promise<ExternalBackupStatus> {
  if (!supportsFilePicker()) return downloadExternalBackupJson(snapshotJson, reason);
  const handle = await (window as any).showSaveFilePicker({
    suggestedName: "multisports-scoring-backup.json",
    types: [{ description: "Sauvegarde Multisports", accept: { "application/json": [".json", ".dcbackup"] } }],
  });
  await putHandle(handle);
  writeStatus({ ...readStatus(), configured: true, fileName: String(handle?.name || "multisports-scoring-backup.json"), permission: "granted", lastError: null });
  return writeExternalBackupJsonNow(snapshotJson, reason, { requestPermission: true });
}

export async function downloadExternalBackupJson(snapshotJson: string, reason = "manual-download"): Promise<ExternalBackupStatus> {
  try {
    const json = wrapPreparedSnapshotJson(snapshotJson, reason);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `multisports-scoring-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return writeStatus({ ...readStatus(), lastSavedAt: new Date().toISOString(), lastBytes: blob.size, lastError: null });
  } catch (error: any) {
    return writeStatus({ ...readStatus(), lastError: String(error?.message || error || "Export impossible") });
  }
}

export async function writeExternalBackupJsonNow(
  snapshotJson: string,
  reason = "manual",
  opts?: { requestPermission?: boolean }
): Promise<ExternalBackupStatus> {
  const current = readStatus();
  const handle = await getHandle();
  if (!handle) {
    return writeStatus({ ...current, configured: false, permission: supportsFilePicker() ? "unknown" : "unsupported", lastError: "Choisis d'abord un fichier de sauvegarde." });
  }
  const permission = await permissionFor(handle, !!opts?.requestPermission);
  if (permission !== "granted") {
    return writeStatus({ ...current, configured: true, fileName: String(handle?.name || current.fileName || "backup.json"), permission, lastError: "Autorisation d'écriture requise." });
  }
  try {
    const json = wrapPreparedSnapshotJson(snapshotJson, reason);
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    lastAutoWriteAt = Date.now();
    return writeStatus({
      ...current,
      configured: true,
      fileName: String(handle?.name || current.fileName || "backup.json"),
      permission: "granted",
      lastSavedAt: new Date().toISOString(),
      lastBytes: new Blob([json]).size,
      lastError: null,
    });
  } catch (error: any) {
    return writeStatus({ ...current, configured: true, permission, lastError: String(error?.message || error || "Écriture impossible") });
  }
}

export async function getExternalBackupStatus(): Promise<ExternalBackupStatus> {
  const current = readStatus();
  if (!supportsFilePicker()) return current;
  const handle = await getHandle();
  if (!handle) return writeStatus({ ...current, configured: false, permission: "unknown", fileName: null });
  const permission = await permissionFor(handle, false);
  return writeStatus({ ...current, configured: true, fileName: String(handle?.name || current.fileName || "backup-multisports.json"), permission });
}

export async function chooseExternalBackupFile(): Promise<ExternalBackupStatus> {
  if (!supportsFilePicker()) {
    return writeStatus({ ...readStatus(), supported: false, configured: false, permission: "unsupported", lastError: "Sélecteur de fichier avancé non pris en charge par ce navigateur." });
  }
  const handle = await (window as any).showSaveFilePicker({
    suggestedName: "multisports-scoring-backup.json",
    types: [{ description: "Sauvegarde Multisports", accept: { "application/json": [".json", ".dcbackup"] } }],
  });
  await putHandle(handle);
  writeStatus({ ...readStatus(), configured: true, fileName: String(handle?.name || "multisports-scoring-backup.json"), permission: "granted", lastError: null });
  return writeExternalBackupNow("initial-selection", { requestPermission: true });
}

export async function forgetExternalBackupFile(): Promise<ExternalBackupStatus> {
  await deleteHandle();
  return writeStatus({ supported: supportsFilePicker(), configured: false, permission: supportsFilePicker() ? "unknown" : "unsupported", fileName: null, lastSavedAt: null, lastError: null });
}

export async function downloadExternalBackupFallback(reason = "manual-download"): Promise<ExternalBackupStatus> {
  try {
    const json = await buildBackupJson(reason);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `multisports-scoring-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return writeStatus({ ...readStatus(), lastSavedAt: new Date().toISOString(), lastBytes: blob.size, lastError: null });
  } catch (error: any) {
    return writeStatus({ ...readStatus(), lastError: String(error?.message || error || "Export impossible") });
  }
}

export async function writeExternalBackupNow(reason = "manual", opts?: { requestPermission?: boolean }): Promise<ExternalBackupStatus> {
  if (running) return running;
  running = (async () => {
    const current = readStatus();
    const handle = await getHandle();
    if (!handle) {
      return writeStatus({ ...current, configured: false, permission: supportsFilePicker() ? "unknown" : "unsupported", lastError: "Choisis d'abord un fichier de sauvegarde." });
    }
    const permission = await permissionFor(handle, !!opts?.requestPermission);
    if (permission !== "granted") {
      return writeStatus({ ...current, configured: true, fileName: String(handle?.name || current.fileName || "backup.json"), permission, lastError: "Autorisation d'écriture requise. Ouvre les réglages puis clique sur Sauvegarder maintenant." });
    }
    try {
      const json = await buildBackupJson(reason);
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      lastAutoWriteAt = Date.now();
      return writeStatus({
        ...current,
        configured: true,
        fileName: String(handle?.name || current.fileName || "backup.json"),
        permission: "granted",
        lastSavedAt: new Date().toISOString(),
        lastBytes: new Blob([json]).size,
        lastError: null,
      });
    } catch (error: any) {
      return writeStatus({ ...current, configured: true, permission, lastError: String(error?.message || error || "Écriture impossible") });
    }
  })();
  try {
    return await running;
  } finally {
    running = null;
  }
}

export function queueExternalBackup(reason = "auto"): void {
  const prefs = loadStoragePrefs();
  if (prefs.selectedDestination !== "device_file" && prefs.selectedDestination !== "external_sd_manual") return;
  if (typeof window === "undefined") return;
  if (queuedTimer) window.clearTimeout(queuedTimer);
  const delay = Math.max(3000, MIN_AUTO_WRITE_MS - (Date.now() - lastAutoWriteAt));
  queuedTimer = window.setTimeout(() => {
    queuedTimer = null;
    void writeExternalBackupNow(reason, { requestPermission: false });
  }, delay);
}
