import { registerPlugin } from "@capacitor/core";
import { apiDelete, apiGet, apiPost, buildApiUrl } from "./apiClient";
import { getRuntimePlatform } from "./nativePlatform";

export type PersonalCloudProvider = "google_drive" | "onedrive" | "dropbox";
export type PersonalCloudStatus = { provider: PersonalCloudProvider; configured: boolean; connected: boolean; accountLabel?: string | null; updatedAt?: string | null; error?: string };

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

const NativeOAuth = registerPlugin<NativeOAuthBridge>("SocialAuth");

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
    const { url } = await NativeOAuth.consumeLaunchUrl({ prefix: NATIVE_CLOUD_CALLBACK_PREFIX });
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
    await NativeOAuth.openExternal({ url: String(res.url) });
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

async function gzipBase64(text: string): Promise<{ encoding: "gzip-base64" | "plain-base64"; data: string }> {
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
    return { encoding: "gzip-base64", data: btoa(binary) };
  }
  let binary = ""; const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
  return { encoding: "plain-base64", data: btoa(binary) };
}

async function decodePayload(payload: any): Promise<any> {
  if (payload?.snapshot) return payload.snapshot;
  if (!payload?.data) throw new Error("Sauvegarde cloud vide.");
  const binary = atob(String(payload.data));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  let text = "";
  if (payload.encoding === "gzip-base64" && typeof DecompressionStream !== "undefined") {
    // Même protection au retour : consommation en pipeline pour éviter la
    // back-pressure lors de la restauration d'une grosse sauvegarde Drive.
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
  } else text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

export async function uploadPersonalCloudSnapshot(provider: PersonalCloudProvider, snapshotJson: string, metadata: Record<string, any> = {}, onProgress?: (percent: number, message: string) => void) {
  const packed = await gzipBase64(snapshotJson);
  // Google Drive: contrat historique réellement déployé sur le NAS (/backups).
  // On envoie le snapshot compressé dans une petite enveloppe JSON afin de ne
  // plus pousser 30-40 Mo de JSON brut à travers Express/Cloudflare.
  if (provider === "google_drive") {
    const wrapper = JSON.stringify({ __mssCompressedBackup: 1, ...packed, metadata });

    // Le navigateur ne reste plus accroché pendant tout l'upload Google.
    // Le NAS crée une tâche courte, répond immédiatement, puis pousse le fichier
    // vers Drive en arrière-plan. On ne fait ensuite que sonder l'état de la tâche.
    // Cela élimine le gel historique à 42 % causé par le timeout Pages/NAS.
    try { onProgress?.(48, "Transfert reçu par le serveur, préparation Google Drive…"); } catch {}
    const started: any = await apiPost(`/account/personal-cloud/google_drive/backups/jobs`, {
      title: "Sauvegarde MULTISPORTS SCORING",
      snapshotJson: wrapper,
      summary: metadata?.summary || {},
      metadata,
    }, {
      timeoutMs: 30_000,
      manual: true,
    });

    const jobId = String(started?.job?.jobId || started?.jobId || "").trim();
    if (!jobId) {
      // Compatibilité avec un backend plus ancien : on conserve le chemin direct,
      // mais avec un délai réaliste plutôt que 45 s.
      return apiPost(`/account/personal-cloud/google_drive/backups`, {
        title: "Sauvegarde MULTISPORTS SCORING",
        snapshotJson: wrapper,
        summary: metadata?.summary || {},
        metadata,
      }, {
        timeoutMs: 180_000,
        manual: true,
      }) as any;
    }

    const pollStartedAt = Date.now();
    const deadline = pollStartedAt + 4 * 60_000;
    while (Date.now() < deadline) {
      const state: any = await apiGet(
        `/account/personal-cloud/google_drive/backups/jobs/${encodeURIComponent(jobId)}`,
        { manual: true, timeoutMs: 15_000 },
      );
      const status = String(state?.job?.status || "").toLowerCase();
      const elapsedMs = Date.now() - pollStartedAt;
      const visualPercent = Math.min(88, 52 + Math.floor(elapsedMs / 5000) * 3);
      try { onProgress?.(visualPercent, status === "queued" ? "Google Drive en file d’attente…" : "Google Drive reçoit la sauvegarde…"); } catch {}
      if (status === "done") {
        try { onProgress?.(90, "Google Drive a confirmé l’écriture."); } catch {}
        return state?.job?.result || { ok: true, provider: "google_drive" };
      }
      if (status === "failed") throw new Error(state?.job?.error || "Sauvegarde Google Drive impossible.");
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
    }
    throw new Error("Google Drive n'a pas confirmé la sauvegarde après 4 minutes. La tâche serveur a été arrêtée côté interface afin d'éviter un blocage permanent.");
  }
  return apiPost(`/account/personal-cloud/${provider}/backup`, { ...packed, metadata }) as any;
}

async function latestGoogleDriveBackup(): Promise<any | null> {
  const res: any = await apiGet(`/account/personal-cloud/google_drive/backups?limit=20`, { manual: true, timeoutMs: 30_000 }).catch(() => null);
  const items = Array.isArray(res?.backups) ? res.backups : Array.isArray(res?.files) ? res.files : [];
  if (!items.length) return null;
  return [...items].sort((a: any, b: any) => Date.parse(String(b?.updatedAt || b?.createdAt || 0)) - Date.parse(String(a?.updatedAt || a?.createdAt || 0)))[0] || null;
}

export async function getPersonalCloudBackupMeta(provider: PersonalCloudProvider): Promise<any | null> {
  if (provider === "google_drive") return latestGoogleDriveBackup();
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup/meta`).catch(() => null);
  return res?.backup || null;
}

export async function downloadPersonalCloudSnapshotById(provider: PersonalCloudProvider, backupId: string): Promise<any> {
  const id = String(backupId || "").trim();
  if (!id) throw new Error("Identifiant de sauvegarde cloud manquant.");
  if (provider === "google_drive") {
    const res: any = await apiGet(`/account/personal-cloud/google_drive/backups/${encodeURIComponent(id)}`, { manual: true, timeoutMs: 120_000 });
    const raw = String(res?.snapshotJson || "");
    if (!raw) throw new Error("Sauvegarde Google Drive vide.");
    const parsed = JSON.parse(raw);
    if (parsed?.__mssCompressedBackup === 1) return decodePayload(parsed);
    return parsed;
  }
  // OneDrive/Dropbox conserveront le contrat courant tant qu'un endpoint par ID
  // n'est pas déployé pour ces providers.
  return downloadPersonalCloudSnapshot(provider);
}

export async function downloadPersonalCloudSnapshot(provider: PersonalCloudProvider): Promise<any> {
  if (provider === "google_drive") {
    const latest = await latestGoogleDriveBackup();
    if (!latest?.id) throw new Error("Aucune sauvegarde Google Drive disponible.");
    const res: any = await apiGet(`/account/personal-cloud/google_drive/backups/${encodeURIComponent(String(latest.id))}`, { manual: true, timeoutMs: 120_000 });
    const raw = String(res?.snapshotJson || "");
    if (!raw) throw new Error("Sauvegarde Google Drive vide.");
    const parsed = JSON.parse(raw);
    if (parsed?.__mssCompressedBackup === 1) return decodePayload(parsed);
    return parsed;
  }
  const res: any = await apiGet(`/account/personal-cloud/${provider}/backup`);
  return decodePayload(res);
}

export function personalCloudProviderLabel(provider: PersonalCloudProvider): string {
  return provider === "google_drive" ? "Google Drive" : provider === "onedrive" ? "OneDrive" : "Dropbox";
}
