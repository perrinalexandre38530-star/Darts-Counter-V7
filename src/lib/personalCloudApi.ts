import { registerPlugin } from "@capacitor/core";
import { apiDelete, apiGet, apiGetBytes, apiPost, buildApiUrl, ensurePublicAccountAccessToken } from "./apiClient";
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
      if (!result.ok) throw new Error(result.message || `Autorisation ${personalCloudProviderLabel(provider)} refusée ou interrompue.`);
      const status = await getPersonalCloudStatus(provider);
      if (!status.connected) throw new Error(`Le retour OAuth a été reçu, mais ${personalCloudProviderLabel(provider)} n'est pas encore connecté.`);
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 350));
  }
  throw new Error(`La connexion ${personalCloudProviderLabel(provider)} a expiré. Réessaie depuis les réglages.`);
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

const ARCHIVE_PERSONAL_CLOUD_PROVIDERS = new Set<PersonalCloudProvider>(["google_drive", "onedrive"]);
// Compatibilité des contrats V131 : les anciennes routes Google restent nommées
// explicitement, même si le moteur est désormais mutualisé avec OneDrive.
const GOOGLE_DRIVE_RAW_JOB_ENDPOINT = "/account/personal-cloud/google_drive/backups/raw/jobs";
function googleDriveRawBackupEndpoint(id: string): string {
  return `/account/personal-cloud/google_drive/backups/${encodeURIComponent(id)}/raw`;
}
const latestCloudMetaCache = new Map<PersonalCloudProvider, { at: number; value: any | null }>();
const cloudBackupsCache = new Map<PersonalCloudProvider, { at: number; value: any[] }>();

function invalidatePersonalCloudCaches(provider: PersonalCloudProvider): void {
  latestCloudMetaCache.delete(provider);
  cloudBackupsCache.delete(provider);
}

function personalCloudTransportCode(provider: PersonalCloudProvider): string {
  return provider === "google_drive" ? "drive" : provider === "onedrive" ? "onedrive" : provider;
}

async function pollPersonalCloudJob(
  provider: PersonalCloudProvider,
  jobId: string,
  onProgress?: PersonalCloudTransferProgress,
): Promise<any> {
  const label = personalCloudProviderLabel(provider);
  const code = personalCloudTransportCode(provider);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const state: any = await apiGet(`/account/personal-cloud/${provider}/backups/jobs/${encodeURIComponent(jobId)}`, { manual: true, timeoutMs: 10_000 });
      const status = String(state?.job?.status || "").toLowerCase();
      onProgress?.(
        status === "queued" ? 62 : 82,
        status === "queued" ? `${label} : transfert accepté, en attente d’écriture…` : `${label} : écriture du fichier…`,
      );
      if (status === "done") {
        invalidatePersonalCloudCaches(provider);
        onProgress?.(92, `${label} a confirmé l’écriture.`);
        return state?.job?.result || { ok: true, provider };
      }
      if (status === "failed") {
        const failed: any = new Error(state?.job?.error || `Sauvegarde ${label} impossible.`);
        failed.code = `${code}_job_failed`;
        throw failed;
      }
    } catch (error: any) {
      const status = Number(error?.status || error?.statusCode || 0);
      if ([404, 410].includes(status)) {
        const lost: any = new Error(`Tâche ${label} perdue après redémarrage du serveur.`);
        lost.code = `${code}_job_lost`;
        throw lost;
      }
      throw error;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 700));
  }
  const timeout: any = new Error(`${label} n’a pas confirmé la sauvegarde dans les 120 secondes.`);
  timeout.code = `${code}_job_timeout`;
  throw timeout;
}

async function pollGoogleDriveJob(jobId: string, onProgress?: PersonalCloudTransferProgress): Promise<any> {
  return pollPersonalCloudJob("google_drive", jobId, onProgress);
}

async function uploadPersonalCloudRawJob(
  provider: PersonalCloudProvider,
  packed: PackedBackup,
  metadata: Record<string, any>,
  onProgress?: PersonalCloudTransferProgress,
): Promise<any> {
  const label = personalCloudProviderLabel(provider);
  const code = personalCloudTransportCode(provider);
  if (packed.encoding !== "gzip-base64" || !packed.bytes.byteLength || typeof XMLHttpRequest === "undefined") {
    const unsupported: any = new Error(`Transport binaire ${label} indisponible.`);
    unsupported.code = `raw_${code}_unsupported`;
    throw unsupported;
  }
  const token = await ensurePublicAccountAccessToken();
  if (!token) throw new Error(`Session MULTISPORTS indisponible pour ${label}.`);

  const compactMeta = {
    title: "Sauvegarde MULTISPORTS SCORING",
    summary: metadata?.summary || {},
    metadata,
  };

  const started: any = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", buildApiUrl(provider === "google_drive" ? GOOGLE_DRIVE_RAW_JOB_ENDPOINT : `/account/personal-cloud/${provider}/backups/raw/jobs`), true);
    xhr.timeout = 45_000;
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/gzip");
    xhr.setRequestHeader("X-MSS-Backup-Meta", jsonHeaderBase64(compactMeta));
    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : packed.bytes.byteLength;
      const ratio = total > 0 ? Math.max(0, Math.min(1, event.loaded / total)) : 0;
      const percent = 42 + Math.round(ratio * 18);
      const mb = (n: number) => `${(Math.max(0, n) / 1024 / 1024).toFixed(1)} Mo`;
      onProgress?.(percent, `Envoi ${label} : ${mb(event.loaded)} / ${mb(total)}`, event.loaded, total);
    };
    xhr.onerror = () => reject(Object.assign(new Error(`Transport binaire ${label} inaccessible.`), { status: xhr.status || 0 }));
    xhr.ontimeout = () => reject(Object.assign(new Error(`Le serveur n’a pas accepté la sauvegarde ${label} assez vite.`), { status: 408 }));
    xhr.onload = () => {
      let data: any = null;
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch {}
      if (xhr.status < 200 || xhr.status >= 300) {
        const err: any = new Error(String(data?.message || data?.error || `${label} HTTP ${xhr.status}`));
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
  if (!jobId) throw new Error(`${label} n’a pas retourné d’identifiant de tâche.`);
  return pollPersonalCloudJob(provider, jobId, onProgress);
}

export async function uploadPersonalCloudSnapshot(
  provider: PersonalCloudProvider,
  snapshotJson: string,
  metadata: Record<string, any> = {},
  onProgress?: PersonalCloudTransferProgress,
) {
  const packed = await gzipBase64(snapshotJson, onProgress);
  const label = personalCloudProviderLabel(provider);
  const code = personalCloudTransportCode(provider);

  if (ARCHIVE_PERSONAL_CLOUD_PROVIDERS.has(provider)) {
    try {
      onProgress?.(40, `${label} : envoi du gzip (${(packed.bytes.byteLength / 1024 / 1024).toFixed(1)} Mo)…`);
      const rawResult = await uploadPersonalCloudRawJob(provider, packed, metadata, onProgress);
      invalidatePersonalCloudCaches(provider);
      return rawResult;
    } catch (rawError: any) {
      const rawStatus = Number(rawError?.status || rawError?.statusCode || 0);
      const canFallback = rawError?.code === `raw_${code}_unsupported` || rawError?.code === `${code}_job_lost` || rawError?.code === `${code}_job_timeout` ||
        [0, 401, 404, 405, 408, 409, 415, 429, 500, 502, 503, 504].includes(rawStatus);
      if (!canFallback) throw rawError;
      console.warn(`[personalCloud] ${label} raw job indisponible, fallback JSON`, rawError);
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
      onProgress?.(48, `${label} : création de la tâche de compatibilité…`);
      const started: any = await apiPost(`/account/personal-cloud/${provider}/backups/jobs`, body, { timeoutMs: 20_000, manual: true });
      const jobId = String(started?.job?.jobId || started?.jobId || "").trim();
      if (jobId) {
        jobAccepted = true;
        try {
          const result = await pollPersonalCloudJob(provider, jobId, onProgress);
          invalidatePersonalCloudCaches(provider);
          return result;
        } catch (pollError: any) {
          if (pollError?.code !== `${code}_job_lost` && pollError?.code !== `${code}_job_timeout`) throw pollError;
          console.warn(`[personalCloud] ${label} job non confirmée, reprise idempotente directe`, pollError);
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
      console.warn(`[personalCloud] ${label} /jobs indisponible, fallback endpoint stable`, jobError);
    }

    onProgress?.(62, `${label} : envoi via le chemin de compatibilité…`);
    try {
      const direct = await apiPost(`/account/personal-cloud/${provider}/backups`, body, { timeoutMs: 180_000, manual: true });
      invalidatePersonalCloudCaches(provider);
      onProgress?.(92, `${label} a confirmé l’écriture.`);
      return direct as any;
    } catch (directError: any) {
      const status = Number(directError?.status || directError?.statusCode || 0);
      const message = String(directError?.message || directError || "");
      const legacyAllowed = [0, 404, 405, 408, 409, 415, 429, 500, 501, 502, 503, 504].includes(status) ||
        /404|405|408|409|415|429|500|501|502|503|504|not found|cannot post|timeout|inaccessible/i.test(message);
      if (!legacyAllowed) throw directError;

      onProgress?.(70, `${label} : reprise via le backend compatible…`);
      const legacy = await apiPost(`/account/personal-cloud/${provider}/backup`, {
        encoding: packed.encoding,
        data: packed.data,
        metadata,
      }, { timeoutMs: 180_000, manual: true });
      invalidatePersonalCloudCaches(provider);
      onProgress?.(92, `${label} a confirmé l’écriture (mode compatible).`);
      return legacy as any;
    }
  }

  return apiPost(`/account/personal-cloud/${provider}/backup`, { encoding: packed.encoding, data: packed.data, metadata }) as any;
}

export async function listPersonalCloudBackups(provider: PersonalCloudProvider, limit = 100): Promise<any[]> {
  const capped = Math.max(1, Math.min(100, Number(limit || 100)));
  if (!ARCHIVE_PERSONAL_CLOUD_PROVIDERS.has(provider)) {
    const meta = await getPersonalCloudBackupMeta(provider);
    return meta ? [meta] : [];
  }
  const cached = cloudBackupsCache.get(provider);
  if (cached && Date.now() - cached.at < 15_000) return cached.value.slice(0, capped);

  let items: any[] = [];
  try {
    const res: any = await apiGet(`/account/personal-cloud/${provider}/backups?limit=${capped}`, { manual: true, timeoutMs: 12_000 });
    items = Array.isArray(res?.backups) ? res.backups : Array.isArray(res?.files) ? res.files : [];
  } catch (error: any) {
    const status = Number(error?.status || error?.statusCode || 0);
    const message = String(error?.message || error || "");
    const legacyAllowed = [0, 404, 405, 501, 502, 503, 504].includes(status) || /404|405|501|not found|inaccessible/i.test(message);
    if (!legacyAllowed) throw error;

    const legacy: any = await apiGet(`/account/personal-cloud/${provider}/backup/meta`, { manual: true, timeoutMs: 12_000 }).catch(() => null);
    const meta = legacy?.backup || null;
    items = meta ? [{
      id: `personal_${provider}_latest`,
      backupId: `personal_${provider}_latest`,
      provider,
      updatedAt: meta.updatedAt || meta.createdAt || meta?.metadata?.exportedAt || null,
      createdAt: meta.createdAt || meta.updatedAt || meta?.metadata?.exportedAt || null,
      metadata: meta.metadata || {},
      summary: meta.summary || meta?.metadata?.summary || {},
      legacy: true,
    }] : [];
  }

  const sorted = [...items].sort((a: any, b: any) => Date.parse(String(b?.updatedAt || b?.createdAt || 0)) - Date.parse(String(a?.updatedAt || a?.createdAt || 0)));
  cloudBackupsCache.set(provider, { at: Date.now(), value: sorted });
  latestCloudMetaCache.set(provider, { at: Date.now(), value: sorted[0] || null });
  return sorted;
}

async function latestPersonalCloudBackup(provider: PersonalCloudProvider, force = false): Promise<any | null> {
  const cached = latestCloudMetaCache.get(provider);
  if (!force && cached && Date.now() - cached.at < 15_000) return cached.value;
  const items = await listPersonalCloudBackups(provider, 100);
  const value = items[0] || null;
  latestCloudMetaCache.set(provider, { at: Date.now(), value });
  return value;
}

export async function getPersonalCloudBackupMeta(provider: PersonalCloudProvider, force = false): Promise<any | null> {
  if (ARCHIVE_PERSONAL_CLOUD_PROVIDERS.has(provider)) return latestPersonalCloudBackup(provider, force);
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup/meta`).catch(() => null);
  return res?.backup || null;
}

async function decodePersonalCloudGzipBytes(
  provider: PersonalCloudProvider,
  bytes: Uint8Array,
  onProgress?: PersonalCloudTransferProgress,
): Promise<any> {
  const label = personalCloudProviderLabel(provider);
  const code = personalCloudTransportCode(provider);
  if (typeof DecompressionStream === "undefined") throw Object.assign(new Error("Décompression gzip native indisponible."), { code: `${code}_raw_decode_unsupported` });
  onProgress?.(76, `${label} : décompression locale…`);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  onProgress?.(94, `${label} : contrôle du snapshot…`);
  return JSON.parse(text);
}

export async function downloadPersonalCloudSnapshotById(
  provider: PersonalCloudProvider,
  backupId: string,
  onProgress?: PersonalCloudTransferProgress,
): Promise<any> {
  const id = String(backupId || "").trim();
  if (!id) throw new Error("Identifiant de sauvegarde cloud manquant.");
  if (!ARCHIVE_PERSONAL_CLOUD_PROVIDERS.has(provider)) return downloadPersonalCloudSnapshot(provider, onProgress);

  const label = personalCloudProviderLabel(provider);
  const code = personalCloudTransportCode(provider);
  if (id === `personal_${provider}_latest`) {
    onProgress?.(8, `${label} : téléchargement compatible…`);
    const legacy: any = await apiGet(`/account/personal-cloud/${provider}/backup`, {
      manual: true,
      timeoutMs: 180_000,
      onDownloadProgress: (loadedBytes, totalBytes) => {
        const ratio = totalBytes > 0 ? Math.max(0, Math.min(1, loadedBytes / totalBytes)) : 0;
        onProgress?.(totalBytes > 0 ? 8 + Math.round(ratio * 64) : 12, `Téléchargement ${label}…`, loadedBytes, totalBytes);
      },
    });
    return decodePayload(legacy, onProgress);
  }

  onProgress?.(4, `Connexion à ${label}…`);
  try {
    const rawPath = provider === "google_drive" ? googleDriveRawBackupEndpoint(id) : `/account/personal-cloud/${provider}/backups/${encodeURIComponent(id)}/raw`;
    const raw = await apiGetBytes(rawPath, {
      manual: true,
      timeoutMs: 180_000,
      onDownloadProgress: (loadedBytes, totalBytes) => {
        const ratio = totalBytes > 0 ? Math.max(0, Math.min(1, loadedBytes / totalBytes)) : 0;
        const percent = totalBytes > 0 ? 6 + Math.round(ratio * 66) : 12;
        const mb = (n: number) => `${(Math.max(0, n) / 1024 / 1024).toFixed(1)} Mo`;
        onProgress?.(percent, totalBytes > 0
          ? `Téléchargement ${label} : ${mb(loadedBytes)} / ${mb(totalBytes)}`
          : `Téléchargement ${label} : ${mb(loadedBytes)}`, loadedBytes, totalBytes);
      },
    });
    const bytes = raw.bytes;
    if (bytes.byteLength < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw Object.assign(new Error(`Flux ${label} gzip invalide.`), { code: `${code}_raw_invalid` });
    return await decodePersonalCloudGzipBytes(provider, bytes, onProgress);
  } catch (rawError: any) {
    const status = Number(rawError?.status || rawError?.statusCode || 0);
    const compatible = rawError?.code === `${code}_raw_decode_unsupported` || rawError?.code === `${code}_raw_invalid` ||
      [404, 405, 406, 415, 501].includes(status);
    if (!compatible) throw rawError;
    console.warn(`[personalCloud] restauration ${label} binaire indisponible, fallback JSON`, rawError);
  }

  try {
    const res: any = await apiGet(`/account/personal-cloud/${provider}/backups/${encodeURIComponent(id)}`, {
      manual: true,
      timeoutMs: 180_000,
      onDownloadProgress: (loadedBytes, totalBytes) => {
        const ratio = totalBytes > 0 ? Math.max(0, Math.min(1, loadedBytes / totalBytes)) : 0;
        const percent = totalBytes > 0 ? 6 + Math.round(ratio * 66) : 12;
        const mb = (n: number) => `${(Math.max(0, n) / 1024 / 1024).toFixed(1)} Mo`;
        onProgress?.(percent, totalBytes > 0
          ? `Téléchargement ${label} : ${mb(loadedBytes)} / ${mb(totalBytes)}`
          : `Téléchargement ${label} : ${mb(loadedBytes)}`, loadedBytes, totalBytes);
      },
    });
    const raw = String(res?.snapshotJson || "");
    if (!raw) throw new Error(`Sauvegarde ${label} vide.`);
    onProgress?.(74, `Snapshot ${label} reçu. Lecture du conteneur…`);
    const parsed = JSON.parse(raw);
    if (parsed?.__mssCompressedBackup === 1) return decodePayload(parsed, onProgress);
    onProgress?.(94, `Snapshot ${label} prêt à être restauré.`);
    return parsed;
  } catch (error: any) {
    const status = Number(error?.status || error?.statusCode || 0);
    const compatible = [0, 404, 405, 501, 502, 503, 504].includes(status) || /404|405|501|not found|inaccessible/i.test(String(error?.message || error || ""));
    if (!compatible) throw error;
    const legacy: any = await apiGet(`/account/personal-cloud/${provider}/backup`, { manual: true, timeoutMs: 180_000 });
    return decodePayload(legacy, onProgress);
  }
}

export async function downloadPersonalCloudSnapshot(
  provider: PersonalCloudProvider,
  onProgress?: PersonalCloudTransferProgress,
): Promise<any> {
  if (ARCHIVE_PERSONAL_CLOUD_PROVIDERS.has(provider)) {
    const latest = await latestPersonalCloudBackup(provider);
    if (!latest?.id) throw new Error(`Aucune sauvegarde ${personalCloudProviderLabel(provider)} disponible.`);
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
