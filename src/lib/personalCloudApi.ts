import { registerPlugin } from "@capacitor/core";
import { apiDelete, apiGet, apiPost, buildApiUrl, ensureAccountBackendAccessToken } from "./apiClient";
import { getRuntimePlatform } from "./nativePlatform";

export type PersonalCloudProvider = "google_drive" | "onedrive" | "dropbox";
export type PersonalCloudStatus = { provider: PersonalCloudProvider; configured: boolean; connected: boolean; accountLabel?: string | null; updatedAt?: string | null; error?: string };
export type PersonalCloudTransferProgress = (percent: number, message: string, loadedBytes?: number, totalBytes?: number) => void;

const PROVIDERS: PersonalCloudProvider[] = ["google_drive", "onedrive", "dropbox"];
export function isPersonalCloudProvider(v: unknown): v is PersonalCloudProvider { return PROVIDERS.includes(String(v) as PersonalCloudProvider); }

export async function getPersonalCloudStatus(provider: PersonalCloudProvider): Promise<PersonalCloudStatus> {
  return apiGet(`/account/personal-cloud/${provider}/status`) as any;
}

const NATIVE_CLOUD_CALLBACK_URL = "multisportsscoring://cloud/callback";
const NATIVE_CLOUD_CALLBACK_PREFIX = "multisportsscoring://cloud/callback";
const PERSONAL_CLOUD_PENDING_KEY = "msc_personal_cloud_pending_v1";
const PERSONAL_CLOUD_CALLBACK_KEY = "msc_personal_cloud_callback_v1";

type NativeOAuthBridge = {
  openExternal(options: { url: string }): Promise<void>;
  consumeLaunchUrl(options?: { prefix?: string }): Promise<{ url?: string | null }>;
};

let nativeOAuthBridge: NativeOAuthBridge | null = null;

function getNativeOAuthBridge(): NativeOAuthBridge {
  // PERF/CONSOLE V70: ne pas enregistrer SocialAuth au chargement du bundle web.
  // socialAuth.ts possède déjà ce plugin et Capacitor avertissait "already registered".
  // Ici on ne crée le proxy qu'au moment où Android natif en a réellement besoin.
  if (!isAndroidNativeCloudRuntime()) {
    throw new Error("Le pont OAuth natif n'est disponible que dans l'application Android.");
  }
  if (!nativeOAuthBridge) nativeOAuthBridge = registerPlugin<NativeOAuthBridge>("SocialAuth");
  return nativeOAuthBridge;
}

type PersonalCloudPending = {
  provider: PersonalCloudProvider;
  startedAt: number;
  returnHash: string;
};

type PersonalCloudCallbackResult = {
  provider: PersonalCloudProvider;
  ok: boolean;
  message?: string;
  at: number;
};

function isAndroidNativeCloudRuntime(): boolean {
  return getRuntimePlatform() === "android";
}

function rememberPersonalCloudPending(provider: PersonalCloudProvider): void {
  if (typeof window === "undefined") return;
  try {
    const pending: PersonalCloudPending = {
      provider,
      startedAt: Date.now(),
      returnHash: String(window.location.hash || "#/settings/storage"),
    };
    localStorage.setItem(PERSONAL_CLOUD_PENDING_KEY, JSON.stringify(pending));
    localStorage.removeItem(PERSONAL_CLOUD_CALLBACK_KEY);
  } catch {}
}

function readPersonalCloudPending(): PersonalCloudPending | null {
  try {
    const raw = localStorage.getItem(PERSONAL_CLOUD_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isPersonalCloudProvider(parsed?.provider)) return null;
    const startedAt = Number(parsed?.startedAt || 0);
    if (!startedAt || Date.now() - startedAt > 10 * 60 * 1000) {
      localStorage.removeItem(PERSONAL_CLOUD_PENDING_KEY);
      return null;
    }
    return {
      provider: parsed.provider,
      startedAt,
      returnHash: String(parsed?.returnHash || "#/settings/storage"),
    };
  } catch {
    return null;
  }
}

function readPersonalCloudCallbackResult(): PersonalCloudCallbackResult | null {
  try {
    const raw = localStorage.getItem(PERSONAL_CLOUD_CALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isPersonalCloudProvider(parsed?.provider)) return null;
    if (Date.now() - Number(parsed?.at || 0) > 10 * 60 * 1000) {
      localStorage.removeItem(PERSONAL_CLOUD_CALLBACK_KEY);
      return null;
    }
    return parsed as PersonalCloudCallbackResult;
  } catch {
    return null;
  }
}

function savePersonalCloudCallbackResult(result: PersonalCloudCallbackResult): void {
  try {
    localStorage.setItem(PERSONAL_CLOUD_CALLBACK_KEY, JSON.stringify(result));
    localStorage.removeItem(PERSONAL_CLOUD_PENDING_KEY);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("msc-personal-cloud-callback", { detail: result }));
  } catch {}
}

let nativeCloudBridgeStarted = false;
let nativeCloudPollBusy = false;
let nativeCloudPollTimer: number | null = null;

async function pollNativePersonalCloudCallback(): Promise<void> {
  if (!isAndroidNativeCloudRuntime() || nativeCloudPollBusy) return;
  const pending = readPersonalCloudPending();
  if (!pending) return;

  nativeCloudPollBusy = true;
  try {
    const { url } = await getNativeOAuthBridge().consumeLaunchUrl({ prefix: NATIVE_CLOUD_CALLBACK_PREFIX });
    if (!url) return;

    const parsed = new URL(String(url));
    const providerRaw = parsed.searchParams.get("provider") || pending.provider;
    const provider = isPersonalCloudProvider(providerRaw) ? providerRaw : pending.provider;
    const status = String(parsed.searchParams.get("status") || "").toLowerCase();
    const message = parsed.searchParams.get("error") || undefined;
    const ok = status === "connected" || status === "ok" || status === "success";
    const result: PersonalCloudCallbackResult = { provider, ok, message, at: Date.now() };
    savePersonalCloudCallbackResult(result);

    // En cold start, restaure l'écran qui avait lancé l'autorisation.
    if (pending.returnHash && typeof window !== "undefined" && window.location.hash !== pending.returnHash) {
      window.location.hash = pending.returnHash;
    }
  } catch (error) {
    console.warn("[personalCloud] native callback poll failed", error);
  } finally {
    nativeCloudPollBusy = false;
  }
}

/**
 * Installe le pont global Android pour récupérer le retour du navigateur système,
 * y compris après un cold start de l'application.
 */
export function initNativePersonalCloudBridge(): void {
  if (nativeCloudBridgeStarted || !isAndroidNativeCloudRuntime() || typeof window === "undefined") return;
  nativeCloudBridgeStarted = true;

  const poll = () => { void pollNativePersonalCloudCallback(); };
  window.addEventListener("focus", poll);
  window.addEventListener("pageshow", poll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") poll();
  });
  nativeCloudPollTimer = window.setInterval(() => {
    if (readPersonalCloudPending()) poll();
  }, 1200);
  poll();
}

async function waitForNativePersonalCloudCallback(provider: PersonalCloudProvider): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 4 * 60 * 1000) {
    await pollNativePersonalCloudCallback();
    const result = readPersonalCloudCallbackResult();
    if (result?.provider === provider) {
      try { localStorage.removeItem(PERSONAL_CLOUD_CALLBACK_KEY); } catch {}
      if (!result.ok) throw new Error(result.message || "Autorisation Google Drive refusée ou interrompue.");
      const status = await getPersonalCloudStatus(provider);
      if (!status.connected) throw new Error("Le retour OAuth a été reçu, mais Google Drive n'est pas encore connecté.");
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 350));
  }
  throw new Error("La connexion Google Drive a expiré. Réessaie depuis les réglages.");
}

export async function connectPersonalCloud(provider: PersonalCloudProvider): Promise<void> {
  const nativeAndroid = isAndroidNativeCloudRuntime();
  const returnTo = nativeAndroid
    ? NATIVE_CLOUD_CALLBACK_URL
    : typeof window !== "undefined"
      ? window.location.href.split("#")[0] + "#/settings/storage"
      : "";
  const res: any = await apiGet(`/account/personal-cloud/${provider}/connect-url?returnTo=${encodeURIComponent(returnTo)}`);
  if (!res?.url) throw new Error(res?.error || "Connexion cloud indisponible.");

  if (nativeAndroid) {
    rememberPersonalCloudPending(provider);
    await getNativeOAuthBridge().openExternal({ url: String(res.url) });
    await waitForNativePersonalCloudCallback(provider);
    return;
  }

  window.location.assign(String(res.url));
  // La page va être remplacée par le flux OAuth. Ne laisse pas l'appelant
  // continuer comme si la connexion était déjà terminée avant la navigation.
  await new Promise<void>(() => undefined);
}

export async function disconnectPersonalCloud(provider: PersonalCloudProvider): Promise<void> {
  const res: any = await apiDelete(`/account/personal-cloud/${provider}/disconnect`);
  if (res?.ok === false) throw new Error(res?.error || "Déconnexion cloud impossible.");
}

type PackedBackup = {
  encoding: "gzip-base64" | "plain-base64";
  data: string;
  bytes: Uint8Array;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(binary);
}

function jsonHeaderBase64(value: unknown): string {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(value ?? {})));
}

async function gzipBase64(text: string, onProgress?: PersonalCloudTransferProgress): Promise<PackedBackup> {
  onProgress?.(18, "Compression locale de la sauvegarde…");
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream !== "undefined") {
    // IMPORTANT : ne jamais attendre writer.write() avant de consommer le
    // readable d'un CompressionStream. Sur les gros snapshots (30+ Mo), le
    // buffer interne applique une back-pressure et writer.write() peut rester
    // bloqué indéfiniment.
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    const zipped = new Uint8Array(await new Response(stream).arrayBuffer());
    onProgress?.(36, "Compression terminée. Préparation du transfert…", zipped.byteLength, zipped.byteLength);
    return { encoding: "gzip-base64", data: bytesToBase64(zipped), bytes: zipped };
  }
  onProgress?.(36, "Préparation du transfert terminée…", bytes.byteLength, bytes.byteLength);
  return { encoding: "plain-base64", data: bytesToBase64(bytes), bytes };
}

async function decodePayload(payload: any, onProgress?: PersonalCloudTransferProgress): Promise<any> {
  if (payload?.snapshot) return payload.snapshot;
  if (!payload?.data) throw new Error("Sauvegarde cloud vide.");
  onProgress?.(76, "Téléchargement terminé. Décompression locale…");
  const binary = atob(String(payload.data));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  let text = "";
  if (payload.encoding === "gzip-base64" && typeof DecompressionStream !== "undefined") {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
  } else text = new TextDecoder().decode(bytes);
  onProgress?.(94, "Décompression terminée. Vérification du snapshot…");
  return JSON.parse(text);
}

let latestDriveMetaCache: { at: number; value: any | null } | null = null;
let driveBackupsCache: { at: number; value: any[] } | null = null;

function invalidateGoogleDriveCaches(): void {
  latestDriveMetaCache = null;
  driveBackupsCache = null;
}

async function pollGoogleDriveJob(jobId: string, onProgress?: PersonalCloudTransferProgress): Promise<any> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const state: any = await apiGet(`/account/personal-cloud/google_drive/backups/jobs/${encodeURIComponent(jobId)}`, { manual: true, timeoutMs: 10_000 });
      const status = String(state?.job?.status || "").toLowerCase();
      onProgress?.(
        status === "queued" ? 62 : 82,
        status === "queued" ? "Google Drive : transfert accepté, en attente d'écriture…" : "Google Drive : écriture du fichier…",
      );
      if (status === "done") {
        invalidateGoogleDriveCaches();
        onProgress?.(92, "Google Drive a confirmé l’écriture.");
        return state?.job?.result || { ok: true, provider: "google_drive" };
      }
      if (status === "failed") {
        const failed: any = new Error(state?.job?.error || "Sauvegarde Google Drive impossible.");
        failed.code = "drive_job_failed";
        throw failed;
      }
    } catch (error: any) {
      const status = Number(error?.status || error?.statusCode || 0);
      // Une tâche en mémoire peut disparaître lors d'un redémarrage du backend.
      // Dans ce cas l'appelant retombe sur l'endpoint synchrone idempotent.
      if ([404, 410].includes(status)) {
        const lost: any = new Error("Tâche Google Drive perdue après redémarrage du serveur.");
        lost.code = "drive_job_lost";
        throw lost;
      }
      throw error;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 700));
  }
  const timeout: any = new Error("Google Drive n'a pas confirmé la sauvegarde dans les 120 secondes.");
  timeout.code = "drive_job_timeout";
  throw timeout;
}

async function uploadGoogleDriveRawJob(
  packed: PackedBackup,
  metadata: Record<string, any>,
  onProgress?: PersonalCloudTransferProgress,
): Promise<any> {
  if (packed.encoding !== "gzip-base64" || !packed.bytes.byteLength || typeof XMLHttpRequest === "undefined") {
    const unsupported: any = new Error("Transport binaire Google Drive indisponible.");
    unsupported.code = "raw_drive_unsupported";
    throw unsupported;
  }
  const token = await ensureAccountBackendAccessToken();
  if (!token) throw new Error("Session MULTISPORTS indisponible pour Google Drive.");

  const compactMeta = {
    title: "Sauvegarde MULTISPORTS SCORING",
    summary: metadata?.summary || {},
    metadata,
  };

  const started: any = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", buildApiUrl("/account/personal-cloud/google_drive/backups/raw/jobs"), true);
    xhr.timeout = 45_000;
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/gzip");
    xhr.setRequestHeader("X-MSS-Backup-Meta", jsonHeaderBase64(compactMeta));
    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : packed.bytes.byteLength;
      const ratio = total > 0 ? Math.max(0, Math.min(1, event.loaded / total)) : 0;
      const percent = 42 + Math.round(ratio * 18);
      const mb = (n: number) => `${(Math.max(0, n) / 1024 / 1024).toFixed(1)} Mo`;
      onProgress?.(percent, `Envoi Google Drive : ${mb(event.loaded)} / ${mb(total)}`, event.loaded, total);
    };
    xhr.onerror = () => reject(Object.assign(new Error("Transport binaire Google Drive inaccessible."), { status: xhr.status || 0 }));
    xhr.ontimeout = () => reject(Object.assign(new Error("Le serveur n'a pas accepté la sauvegarde Google Drive assez vite."), { status: 408 }));
    xhr.onload = () => {
      let data: any = null;
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch {}
      if (xhr.status < 200 || xhr.status >= 300) {
        const err: any = new Error(String(data?.message || data?.error || `Google Drive HTTP ${xhr.status}`));
        err.status = xhr.status;
        err.payload = data;
        reject(err);
        return;
      }
      resolve(data || {});
    };
    xhr.send(packed.bytes);
  });

  const jobId = String(started?.job?.jobId || started?.jobId || "").trim();
  if (!jobId) throw new Error("Google Drive n'a pas retourné d'identifiant de tâche.");
  return pollGoogleDriveJob(jobId, onProgress);
}

export async function uploadPersonalCloudSnapshot(
  provider: PersonalCloudProvider,
  snapshotJson: string,
  metadata: Record<string, any> = {},
  onProgress?: PersonalCloudTransferProgress,
) {
  const packed = await gzipBase64(snapshotJson, onProgress);
  if (provider === "google_drive") {
    // Chemin rapide V131 : gzip binaire direct vers le backend, sans +33 % de
    // base64 sur le réseau téléphone -> NAS. Le serveur construit ensuite le
    // conteneur portable et l'écrit dans Drive en arrière-plan.
    try {
      onProgress?.(40, `Google Drive : envoi du gzip (${(packed.bytes.byteLength / 1024 / 1024).toFixed(1)} Mo)…`);
      const rawResult = await uploadGoogleDriveRawJob(packed, metadata, onProgress);
      invalidateGoogleDriveCaches();
      return rawResult;
    } catch (rawError: any) {
      const rawStatus = Number(rawError?.status || rawError?.statusCode || 0);
      const canFallback = rawError?.code === "raw_drive_unsupported" || rawError?.code === "drive_job_lost" || rawError?.code === "drive_job_timeout" ||
        [0, 404, 405, 408, 409, 415, 429, 500, 502, 503, 504].includes(rawStatus);
      if (!canFallback) throw rawError;
      console.warn("[personalCloud] Drive raw job indisponible, fallback JSON", rawError);
    }

    const wrapper = JSON.stringify({ __mssCompressedBackup: 1, encoding: packed.encoding, data: packed.data, metadata });
    const body = {
      title: "Sauvegarde MULTISPORTS SCORING",
      snapshotJson: wrapper,
      summary: metadata?.summary || {},
      metadata,
    };

    let jobAccepted = false;
    try {
      onProgress?.(48, "Google Drive : création de la tâche de compatibilité…");
      const started: any = await apiPost(`/account/personal-cloud/google_drive/backups/jobs`, body, { timeoutMs: 20_000, manual: true });
      const jobId = String(started?.job?.jobId || started?.jobId || "").trim();
      if (jobId) {
        jobAccepted = true;
        try {
          const result = await pollGoogleDriveJob(jobId, onProgress);
          invalidateGoogleDriveCaches();
          return result;
        } catch (pollError: any) {
          if (pollError?.code !== "drive_job_lost" && pollError?.code !== "drive_job_timeout") throw pollError;
          console.warn("[personalCloud] Drive job non confirmée, reprise idempotente directe", pollError);
          // La route directe réutilise/écrase le même fichier courant : elle est
          // sûre même si la tâche précédente s'est terminée entre-temps.
          jobAccepted = false;
        }
      }
    } catch (jobError: any) {
      if (jobAccepted) throw jobError;
      const status = Number(jobError?.status || jobError?.statusCode || 0);
      const message = String(jobError?.message || jobError || "");
      const fallbackAllowed = [0, 404, 405, 408, 409, 429, 500, 501, 502, 503, 504].includes(status) ||
        /404|405|408|409|429|500|501|502|503|504|not found|cannot post|timeout|inaccessible/i.test(message);
      if (!fallbackAllowed) throw jobError;
      console.warn("[personalCloud] Drive /jobs indisponible, fallback endpoint stable", jobError);
    }

    onProgress?.(62, "Google Drive : envoi via le chemin de compatibilité…");
    const direct = await apiPost(`/account/personal-cloud/google_drive/backups`, body, { timeoutMs: 180_000, manual: true });
    invalidateGoogleDriveCaches();
    onProgress?.(92, "Google Drive a confirmé l’écriture.");
    return direct as any;
  }
  return apiPost(`/account/personal-cloud/${provider}/backup`, { encoding: packed.encoding, data: packed.data, metadata }) as any;
}

export async function listPersonalCloudBackups(provider: PersonalCloudProvider, limit = 100): Promise<any[]> {
  if (provider !== "google_drive") {
    const meta = await getPersonalCloudBackupMeta(provider);
    return meta ? [meta] : [];
  }
  const capped = Math.max(1, Math.min(100, Number(limit || 100)));
  if (driveBackupsCache && Date.now() - driveBackupsCache.at < 15_000) return driveBackupsCache.value.slice(0, capped);
  const res: any = await apiGet(`/account/personal-cloud/google_drive/backups?limit=${capped}`, { manual: true, timeoutMs: 12_000 });
  const items = Array.isArray(res?.backups) ? res.backups : Array.isArray(res?.files) ? res.files : [];
  const sorted = [...items].sort((a: any, b: any) => Date.parse(String(b?.updatedAt || b?.createdAt || 0)) - Date.parse(String(a?.updatedAt || a?.createdAt || 0)));
  driveBackupsCache = { at: Date.now(), value: sorted };
  latestDriveMetaCache = { at: Date.now(), value: sorted[0] || null };
  return sorted;
}

async function latestGoogleDriveBackup(force = false): Promise<any | null> {
  if (!force && latestDriveMetaCache && Date.now() - latestDriveMetaCache.at < 15_000) {
    return latestDriveMetaCache.value;
  }
  const items = await listPersonalCloudBackups("google_drive", 100);
  const value = items[0] || null;
  latestDriveMetaCache = { at: Date.now(), value };
  return value;
}

export async function getPersonalCloudBackupMeta(provider: PersonalCloudProvider, force = false): Promise<any | null> {
  if (provider === "google_drive") return latestGoogleDriveBackup(force);
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup/meta`).catch(() => null);
  return res?.backup || null;
}

async function decodeGoogleDriveGzipBytes(bytes: Uint8Array, onProgress?: PersonalCloudTransferProgress): Promise<any> {
  if (typeof DecompressionStream === "undefined") throw Object.assign(new Error("Décompression gzip native indisponible."), { code: "drive_raw_decode_unsupported" });
  onProgress?.(76, "Google Drive : décompression locale…");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  onProgress?.(94, "Google Drive : contrôle du snapshot…");
  return JSON.parse(text);
}

export async function downloadPersonalCloudSnapshotById(
  provider: PersonalCloudProvider,
  backupId: string,
  onProgress?: PersonalCloudTransferProgress,
): Promise<any> {
  const id = String(backupId || "").trim();
  if (!id) throw new Error("Identifiant de sauvegarde cloud manquant.");
  if (provider === "google_drive") {
    onProgress?.(4, "Connexion à Google Drive…");
    // V131 : restauration binaire. Le backend renvoie un gzip brut même pour les
    // anciennes sauvegardes JSON/base64. On évite ainsi une seconde enveloppe JSON
    // et le surcoût réseau du base64. Les vieux backends restent compatibles.
    try {
      const raw = await apiGetBytes(`/account/personal-cloud/google_drive/backups/${encodeURIComponent(id)}/raw`, {
        manual: true,
        timeoutMs: 180_000,
        onDownloadProgress: (loadedBytes, totalBytes) => {
          const ratio = totalBytes > 0 ? Math.max(0, Math.min(1, loadedBytes / totalBytes)) : 0;
          const percent = totalBytes > 0 ? 6 + Math.round(ratio * 66) : 12;
          const mb = (n: number) => `${(Math.max(0, n) / 1024 / 1024).toFixed(1)} Mo`;
          onProgress?.(percent, totalBytes > 0
            ? `Téléchargement Google Drive : ${mb(loadedBytes)} / ${mb(totalBytes)}`
            : `Téléchargement Google Drive : ${mb(loadedBytes)}`, loadedBytes, totalBytes);
        },
      });
      const bytes = raw.bytes;
      if (bytes.byteLength < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw Object.assign(new Error("Flux Google Drive gzip invalide."), { code: "drive_raw_invalid" });
      return await decodeGoogleDriveGzipBytes(bytes, onProgress);
    } catch (rawError: any) {
      const status = Number(rawError?.status || rawError?.statusCode || 0);
      const compatible = rawError?.code === "drive_raw_decode_unsupported" || rawError?.code === "drive_raw_invalid" ||
        [404, 405, 406, 415, 501].includes(status);
      if (!compatible) throw rawError;
      console.warn("[personalCloud] restauration Drive binaire indisponible, fallback JSON", rawError);
    }

    const res: any = await apiGet(`/account/personal-cloud/google_drive/backups/${encodeURIComponent(id)}`, {
      manual: true,
      timeoutMs: 180_000,
      onDownloadProgress: (loadedBytes, totalBytes) => {
        const ratio = totalBytes > 0 ? Math.max(0, Math.min(1, loadedBytes / totalBytes)) : 0;
        const percent = totalBytes > 0 ? 6 + Math.round(ratio * 66) : 12;
        const mb = (n: number) => `${(Math.max(0, n) / 1024 / 1024).toFixed(1)} Mo`;
        onProgress?.(
          percent,
          totalBytes > 0
            ? `Téléchargement Google Drive : ${mb(loadedBytes)} / ${mb(totalBytes)}`
            : `Téléchargement Google Drive : ${mb(loadedBytes)}`,
          loadedBytes,
          totalBytes,
        );
      },
    });
    const raw = String(res?.snapshotJson || "");
    if (!raw) throw new Error("Sauvegarde Google Drive vide.");
    onProgress?.(74, "Snapshot Google Drive reçu. Lecture du conteneur…");
    const parsed = JSON.parse(raw);
    if (parsed?.__mssCompressedBackup === 1) return decodePayload(parsed, onProgress);
    onProgress?.(94, "Snapshot Google Drive prêt à être restauré.");
    return parsed;
  }
  return downloadPersonalCloudSnapshot(provider, onProgress);
}

export async function downloadPersonalCloudSnapshot(
  provider: PersonalCloudProvider,
  onProgress?: PersonalCloudTransferProgress,
): Promise<any> {
  if (provider === "google_drive") {
    const latest = await latestGoogleDriveBackup();
    if (!latest?.id) throw new Error("Aucune sauvegarde Google Drive disponible.");
    return downloadPersonalCloudSnapshotById(provider, String(latest.id), onProgress);
  }
  onProgress?.(8, `Téléchargement ${personalCloudProviderLabel(provider)}…`);
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup`, {
    manual: true,
    timeoutMs: 180_000,
    onDownloadProgress: (loadedBytes, totalBytes) => {
      const ratio = totalBytes > 0 ? Math.max(0, Math.min(1, loadedBytes / totalBytes)) : 0;
      onProgress?.(totalBytes > 0 ? 8 + Math.round(ratio * 64) : 12, `Téléchargement ${personalCloudProviderLabel(provider)}…`, loadedBytes, totalBytes);
    },
  });
  return decodePayload(res, onProgress);
}

export function personalCloudProviderLabel(provider: PersonalCloudProvider): string {
  return provider === "google_drive" ? "Google Drive" : provider === "onedrive" ? "OneDrive" : "Dropbox";
}
