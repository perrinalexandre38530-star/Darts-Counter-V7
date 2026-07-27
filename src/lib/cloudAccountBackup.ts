import { exportCloudSnapshot, getStorageUser } from "./storage";
import { uploadCloudVaultSnapshotJson } from "./cloudStorageApi";
import { loadStoragePrefs } from "./storagePlans";

const RESTORE_GUARD_KEY = "dc_cloud_restore_in_progress_v2";
const MIN_INTERVAL_MS = 15_000;
const DEFAULT_DEBOUNCE_MS = 4_000;

let timer: number | null = null;
let inFlight: Promise<void> | null = null;
let queuedReason = "";
let queuedAfterFlight = false;
let lastSuccessAt = 0;

function signedInUserId(): string {
  try {
    const direct = String(getStorageUser() || "").trim();
    if (direct) return direct;
  } catch {}
  try {
    const raw = localStorage.getItem("dc_online_auth_supabase_v1") || "";
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.userId || parsed?.user?.id || parsed?.session?.user?.id || "").trim();
  } catch {
    return "";
  }
}

function cloudR2Selected(): boolean {
  try {
    return loadStoragePrefs().selectedDestination === "cloud_r2";
  } catch {
    return false;
  }
}

function restoreInProgress(): boolean {
  try { return sessionStorage.getItem(RESTORE_GUARD_KEY) === "1"; } catch { return false; }
}

function snapshotSummary(snapshot: any) {
  const store = (() => {
    const idb = snapshot?.idb && typeof snapshot.idb === "object" ? snapshot.idb : {};
    const rows = Object.entries<any>(idb);
    const found = rows.find(([k, v]) => /(^|[:/])store(?::[^:/]+)?$/.test(String(k)) && v && typeof v === "object");
    return found?.[1] || snapshot?.store || snapshot?.data || {};
  })();
  const portable = snapshot?.portableAccountData || {};
  const historyRows = snapshot?.history?.rows && typeof snapshot.history.rows === "object"
    ? Object.keys(snapshot.history.rows).length
    : 0;
  return {
    profiles: Array.isArray(portable?.profiles) ? portable.profiles.length : (Array.isArray(store?.profiles) ? store.profiles.length : 0),
    bots: Array.isArray(portable?.bots) ? portable.bots.length : (Array.isArray(store?.bots) ? store.bots.length : 0),
    dartSets: Array.isArray(portable?.dartSets) ? portable.dartSets.length : (Array.isArray(store?.dartSets) ? store.dartSets.length : 0),
    teams: Array.isArray(portable?.teams) ? portable.teams.length : (Array.isArray(store?.teams) ? store.teams.length : 0),
    galleryItems: Number(portable?.counts?.galleryItems || 0) || 0,
    tournaments: Number(portable?.counts?.tournaments || snapshot?.tournaments?.counts?.tournaments || 0) || 0,
    matches: historyRows,
  };
}

/**
 * R2 possède déjà chaque image utilisateur comme objet dédié /media/*.
 * Le snapshot JSON ne doit donc pas réembarquer les mêmes base64 dans
 * userMediaFallbacks/avatarFallbacks : cette duplication faisait dépasser la
 * limite HTTP (413) alors que les données métier elles-mêmes sont légères.
 *
 * On conserve portableAccountData (profils/bots/dartsets/galerie/compétitions)
 * et toutes les clés nécessaires pour reconstruire les médias depuis R2.
 */
function prepareSnapshotForDirectR2(snapshot: any): {
  snapshot: any;
  audit: { embeddedMediaRemoved: number; embeddedAvatarFallbacksRemoved: number; galleryLocalStorageRemoved: number };
} {
  if (!snapshot || typeof snapshot !== "object") {
    return { snapshot, audit: { embeddedMediaRemoved: 0, embeddedAvatarFallbacksRemoved: 0, galleryLocalStorageRemoved: 0 } };
  }

  const next: any = { ...snapshot };
  const embeddedMediaRemoved = Object.keys(snapshot?.userMediaFallbacks?.media || snapshot?.user_media_fallbacks?.media || {}).length;
  const embeddedAvatarFallbacksRemoved = Object.keys(snapshot?.avatarFallbacks?.profiles || snapshot?.avatar_fallbacks?.profiles || {}).length;

  delete next.userMediaFallbacks;
  delete next.user_media_fallbacks;
  delete next.avatarFallbacks;
  delete next.avatar_fallbacks;

  let galleryLocalStorageRemoved = 0;
  if (snapshot?.localStorage && typeof snapshot.localStorage === "object") {
    const localStorageCopy: Record<string, any> = { ...snapshot.localStorage };
    for (const key of Object.keys(localStorageCopy)) {
      if (key.startsWith("dc_avatar_gallery_v1:") || key === "msc_avatar_ia_gallery_v1") {
        delete localStorageCopy[key];
        galleryLocalStorageRemoved += 1;
      }
    }
    next.localStorage = localStorageCopy;
  }

  next.r2MediaStrategy = {
    _v: 1,
    mode: "dedicated-r2-media-objects",
    embeddedMediaRemoved,
    embeddedAvatarFallbacksRemoved,
    galleryLocalStorageRemoved,
    portableAccountDataVersion: Number(snapshot?.portableAccountData?._v || 0),
    preparedAt: new Date().toISOString(),
  };

  return {
    snapshot: next,
    audit: { embeddedMediaRemoved, embeddedAvatarFallbacksRemoved, galleryLocalStorageRemoved },
  };
}

async function flushQueuedCloudR2AccountBackup(reason: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (restoreInProgress()) return;
  if (!signedInUserId()) return;
  if (!cloudR2Selected()) return;

  if (inFlight) {
    queuedAfterFlight = true;
    queuedReason = reason || queuedReason;
    return inFlight;
  }

  const elapsed = Date.now() - lastSuccessAt;
  if (lastSuccessAt > 0 && elapsed < MIN_INTERVAL_MS) {
    queueCloudR2AccountBackup(reason, Math.max(DEFAULT_DEBOUNCE_MS, MIN_INTERVAL_MS - elapsed));
    return;
  }

  inFlight = (async () => {
    try {
      const fullSnapshot = await exportCloudSnapshot();
      const summary = snapshotSummary(fullSnapshot);
      const portableVersion = Number(fullSnapshot?.portableAccountData?._v || 0);
      if (portableVersion < 2) {
        throw new Error("Snapshot R2 incomplet : portableAccountData v2 absent.");
      }

      const prepared = prepareSnapshotForDirectR2(fullSnapshot);
      const snapshotJson = JSON.stringify(prepared.snapshot);
      await uploadCloudVaultSnapshotJson({
        snapshotJson,
        title: `Sauvegarde compte automatique — ${new Date().toLocaleString("fr-FR")}`,
        sourceDestination: "cloud_r2",
        metadata: {
          summary,
          source: reason || "account-data-change",
          engine: "account-auto-backup-r2-v3",
          portableAccountDataVersion: portableVersion,
          r2MediaStrategy: prepared.snapshot?.r2MediaStrategy,
          r2MediaAudit: prepared.audit,
          snapshotBytes: new Blob([snapshotJson]).size,
          exportedAt: new Date().toISOString(),
        },
      });
      lastSuccessAt = Date.now();
      try {
        sessionStorage.setItem("dc_cloud_account_backup_last_success_v2", JSON.stringify({
          at: new Date().toISOString(),
          reason,
          summary,
          portableAccountDataVersion: portableVersion,
          r2MediaAudit: prepared.audit,
          snapshotBytes: new Blob([snapshotJson]).size,
        }));
      } catch {}
    } catch (error: any) {
      try {
        sessionStorage.setItem("dc_cloud_account_backup_last_error_v2", JSON.stringify({
          at: new Date().toISOString(),
          reason,
          message: error?.message || String(error || "Sauvegarde R2 impossible"),
        }));
      } catch {}
      console.warn("[cloudAccountBackup] skipped", reason, error);
    } finally {
      inFlight = null;
      if (queuedAfterFlight) {
        queuedAfterFlight = false;
        const nextReason = queuedReason || "account-data-change-after-flight";
        queuedReason = "";
        queueCloudR2AccountBackup(nextReason, DEFAULT_DEBOUNCE_MS);
      }
    }
  })();

  return inFlight;
}

export function queueCloudR2AccountBackup(reason = "account-data-change", delayMs = DEFAULT_DEBOUNCE_MS): void {
  if (typeof window === "undefined") return;
  if (restoreInProgress()) return;
  queuedReason = String(reason || "account-data-change");
  if (timer != null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    const nextReason = queuedReason || "account-data-change";
    queuedReason = "";
    void flushQueuedCloudR2AccountBackup(nextReason);
  }, Math.max(500, Number(delayMs) || DEFAULT_DEBOUNCE_MS));
}

export async function flushCloudR2AccountBackupNow(reason = "manual-account-flush"): Promise<void> {
  if (timer != null && typeof window !== "undefined") {
    window.clearTimeout(timer);
    timer = null;
  }
  queuedReason = "";
  await flushQueuedCloudR2AccountBackup(reason);
}
