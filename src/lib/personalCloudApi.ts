import { registerPlugin } from "@capacitor/core";
import { apiDelete, apiGet, apiPost, buildApiUrl } from "./apiClient";
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

async function gzipBase64(text: string, onProgress?: PersonalCloudTransferProgress): Promise<{ encoding: "gzip-base64" | "plain-base64"; data: string }> {
  onProgress?.(18, "Compression locale de la sauvegarde…");
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream !== "undefined") {
    // IMPORTANT : ne jamais attendre writer.write() avant de consommer le
    // readable d'un CompressionStream. Sur les gros snapshots (30+ Mo), le
    // buffer interne applique une back-pressure et writer.write() peut rester
    // bloqué indéfiniment. C'était précisément le gel à 42 % de Google Drive.
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    const zipped = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = ""; const step = 0x8000;
    for (let i = 0; i < zipped.length; i += step) binary += String.fromCharCode(...zipped.subarray(i, i + step));
    onProgress?.(36, "Compression terminée. Préparation du transfert…", zipped.byteLength, zipped.byteLength);
    return { encoding: "gzip-base64", data: btoa(binary) };
  }
  let binary = ""; const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
  onProgress?.(36, "Préparation du transfert terminée…", bytes.byteLength, bytes.byteLength);
  return { encoding: "plain-base64", data: btoa(binary) };
}

async function decodePayload(payload: any, onProgress?: PersonalCloudTransferProgress): Promise<any> {
  if (payload?.snapshot) return payload.snapshot;
  if (!payload?.data) throw new Error("Sauvegarde cloud vide.");
  onProgress?.(76, "Téléchargement terminé. Décompression locale…");
  const binary = atob(String(payload.data));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  let text = "";
  if (payload.encoding === "gzip-base64" && typeof DecompressionStream !== "undefined") {
    // Même protection au retour : consommation en pipeline pour éviter la
    // back-pressure lors de la restauration d'une grosse sauvegarde Drive.
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
  } else text = new TextDecoder().decode(bytes);
  onProgress?.(94, "Décompression terminée. Vérification du snapshot…");
  return JSON.parse(text);
}

export async function uploadPersonalCloudSnapshot(provider: PersonalCloudProvider, snapshotJson: string, metadata: Record<string, any> = {}, onProgress?: (percent: number, message: string) => void) {
  const packed = await gzipBase64(snapshotJson, onProgress);
  if (provider === "google_drive") {
    const wrapper = JSON.stringify({ __mssCompressedBackup: 1, ...packed, metadata });
    const body = {
      title: "Sauvegarde MULTISPORTS SCORING",
      snapshotJson: wrapper,
      summary: metadata?.summary || {},
      metadata,
    };

    // Compatibilité ascendante ET descendante : /jobs si présent, /backups sinon.
    // V130: une tâche ACCEPTÉE ne retombe plus ensuite sur un second upload direct.
    // L'ancien comportement pouvait attendre 4 minutes puis renvoyer le même gros
    // snapshot une deuxième fois, d'où les attentes interminables et ambiguës.
    let jobAccepted = false;
    try {
      onProgress?.(48, "Google Drive : création de la tâche…");
      const started: any = await apiPost(`/account/personal-cloud/google_drive/backups/jobs`, body, { timeoutMs: 12_000, manual: true });
      const jobId = String(started?.job?.jobId || started?.jobId || "").trim();
      if (jobId) {
        jobAccepted = true;
        const deadline = Date.now() + 90_000;
        while (Date.now() < deadline) {
          const state: any = await apiGet(`/account/personal-cloud/google_drive/backups/jobs/${encodeURIComponent(jobId)}`, { manual: true, timeoutMs: 10_000 });
          const status = String(state?.job?.status || "").toLowerCase();
          onProgress?.(status === "queued" ? 55 : 75, status === "queued" ? "Google Drive en file d’attente…" : "Google Drive écrit la sauvegarde…");
          if (status === "done") { onProgress?.(90, "Google Drive a confirmé l’écriture."); return state?.job?.result || { ok: true, provider: "google_drive" }; }
          if (status === "failed") throw new Error(state?.job?.error || "Sauvegarde Google Drive impossible.");
          await new Promise((resolve) => window.setTimeout(resolve, 800));
        }
        throw new Error("Google Drive n'a pas confirmé la sauvegarde dans les 90 secondes.");
      }
    } catch (jobError: any) {
      if (jobAccepted) throw jobError;
      const status = Number(jobError?.status || jobError?.statusCode || 0);
      const message = String(jobError?.message || jobError || "");
      const unsupported = [404, 405, 501].includes(status) || /404|405|501|not found|cannot post/i.test(message);
      if (!unsupported) throw jobError;
      console.warn("[personalCloud] Drive /jobs indisponible, fallback endpoint stable", jobError);
    }

    onProgress?.(58, "Envoi Google Drive via le chemin stable…");
    const direct = await apiPost(`/account/personal-cloud/google_drive/backups`, body, { timeoutMs: 180_000, manual: true });
    onProgress?.(90, "Google Drive a confirmé l’écriture.");
    return direct as any;
  }
  return apiPost(`/account/personal-cloud/${provider}/backup`, { ...packed, metadata }) as any;
}

let latestDriveMetaCache: { at: number; value: any | null } | null = null;

async function latestGoogleDriveBackup(force = false): Promise<any | null> {
  if (!force && latestDriveMetaCache && Date.now() - latestDriveMetaCache.at < 30_000) {
    return latestDriveMetaCache.value;
  }
  // V130 PERF: cette requête doit rester purement metadata. Trois entrées suffisent
  // pour déterminer la plus récente et évitent de lister 20 fichiers à chaque clic.
  const res: any = await apiGet(`/account/personal-cloud/google_drive/backups?limit=3`, { manual: true, timeoutMs: 8_000 });
  const items = Array.isArray(res?.backups) ? res.backups : Array.isArray(res?.files) ? res.files : [];
  const value = !items.length
    ? null
    : ([...items].sort((a: any, b: any) => Date.parse(String(b?.updatedAt || b?.createdAt || 0)) - Date.parse(String(a?.updatedAt || a?.createdAt || 0)))[0] || null);
  latestDriveMetaCache = { at: Date.now(), value };
  return value;
}

export async function getPersonalCloudBackupMeta(provider: PersonalCloudProvider): Promise<any | null> {
  if (provider === "google_drive") return latestGoogleDriveBackup();
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup/meta`).catch(() => null);
  return res?.backup || null;
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
