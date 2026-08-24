import { getNasApiUrl, isNasDataSyncEnabled, isNasProviderEnabled } from "./serverConfig";
import { nasRestoreSession } from "./nasApi";

const LEGACY_BAD_HOSTS = [
  "sustainability-accordingly-steven-investments.trycloudflare.com",
];

function sanitizeApiUrl(raw: string | null | undefined): string {
  const value = String(raw || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (LEGACY_BAD_HOSTS.some((host) => value.includes(host))) return "";
  return value;
}

function safeReadLocalStorage(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeReadSessionStorage(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeParseJson<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function extractAuthTokenFromObject(value: any): string {
  return String(
    value?.token ||
      value?.accessToken ||
      value?.access_token ||
      value?.jwt ||
      value?.access ||
      value?.bearer ||
      value?.session?.token ||
      value?.session?.accessToken ||
      value?.session?.access_token ||
      value?.session?.jwt ||
      value?.data?.token ||
      value?.data?.accessToken ||
      value?.data?.access_token ||
      value?.data?.jwt ||
      value?.data?.session?.token ||
      value?.data?.session?.accessToken ||
      value?.data?.session?.access_token ||
      value?.auth?.token ||
      value?.auth?.accessToken ||
      value?.auth?.access_token ||
      value?.currentSession?.token ||
      value?.currentSession?.accessToken ||
      value?.currentSession?.access_token ||
      value?.current_session?.token ||
      value?.current_session?.accessToken ||
      value?.current_session?.access_token ||
      ""
  ).trim();
}

function looksLikeBearerToken(raw: string): boolean {
  const value = String(raw || "").trim();
  if (!value) return false;
  // JWT classique ou token opaque suffisamment long.
  return value.split(".").length >= 3 || value.length >= 24;
}

let volatileAccessToken = "";
let lastAnnouncedAccessToken = "";

/**
 * Propage immédiatement au client /online/* le JWT NAS interne porté par la
 * session React. Cela couvre la courte fenêtre de boot où la session est déjà
 * restaurée en mémoire mais pas encore relue depuis le stockage navigateur.
 */
export function setApiAccessToken(rawToken: string | null | undefined): void {
  const token = String(rawToken || "").trim();

  // Cette fonction peut recevoir un JWT Supabase depuis le provider React.
  // On ne le considère jamais comme JWT NAS lorsqu'une session publique est
  // actuellement active, même si le build autorise aussi le NAS fondateur.
  volatileAccessToken = isNasProviderEnabled() && !activeSessionIsPublicSupabase() ? token : "";

  if (!volatileAccessToken) {
    lastAnnouncedAccessToken = "";
    return;
  }
  if (volatileAccessToken === lastAnnouncedAccessToken || typeof window === "undefined") return;
  lastAnnouncedAccessToken = volatileAccessToken;
  try { window.dispatchEvent(new CustomEvent("dc-api-auth-token-ready")); } catch {}
}

function activeSessionIsPublicSupabase(): boolean {
  const raw = (
    safeReadLocalStorage("dc_online_auth_supabase_v1") ||
    safeReadSessionStorage("dc_online_auth_supabase_v1")
  ).trim();
  if (!raw) return false;
  const parsed = safeParseJson<any>(raw, null);
  const provider = String(parsed?.authProvider || parsed?.auth_provider || "").trim().toLowerCase();
  return provider === "supabase" || provider === "supabase_failover" || parsed?.degradedMode === true;
}

function tokenFromStoredValue(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";

  // Une session JSON dépasse largement 24 caractères. L'ancienne détection la
  // prenait donc pour un token opaque et envoyait tout le JSON dans le header
  // Authorization. On parse toujours le JSON avant le fallback token brut.
  if (value.startsWith("{") || value.startsWith("[")) {
    const parsed = safeParseJson<any>(value, null);
    const isSupabaseFailover =
      parsed?.degradedMode === true ||
      String(parsed?.authProvider || parsed?.auth_provider || "") === "supabase_failover";
    if (isSupabaseFailover) return "";
    return extractAuthTokenFromObject(parsed);
  }
  if (looksLikeBearerToken(value)) return value;
  return extractAuthTokenFromObject(safeParseJson<any>(value, null));
}

export function readNasAccessToken(): string {
  // Source canonique : seule la clé NAS dédiée est fiable.
  const directNas = (safeReadLocalStorage("dc_nas_access_token_v1") || safeReadSessionStorage("dc_nas_access_token_v1")).trim();
  if (directNas && looksLikeBearerToken(directNas)) return directNas;

  // Compatibilité avec les anciennes sessions NAS enregistrées dans la clé
  // historique dc_online_auth_supabase_v1. On refuse explicitement toute
  // session marquée Supabase pour ne jamais envoyer son JWT au backend NAS.
  const legacySessionRaw = (
    safeReadLocalStorage("dc_online_auth_supabase_v1") ||
    safeReadSessionStorage("dc_online_auth_supabase_v1")
  ).trim();

  if (legacySessionRaw) {
    const parsed = safeParseJson<any>(legacySessionRaw, null);
    const provider = String(parsed?.authProvider || parsed?.auth_provider || "").trim().toLowerCase();
    const isPublicSupabase =
      provider === "supabase" ||
      provider === "supabase_failover" ||
      parsed?.degradedMode === true;

    if (!isPublicSupabase) {
      const legacyNasToken = String(parsed?.token || "").trim();
      if (legacyNasToken && looksLikeBearerToken(legacyNasToken)) return legacyNasToken;
    }
  }

  // Le token volatile n'est accepté que lorsque le provider est explicitement NAS.
  if (isNasProviderEnabled() && volatileAccessToken && looksLikeBearerToken(volatileAccessToken)) {
    return volatileAccessToken;
  }

  return "";
}

export function canUseNasOnlineApi(): boolean {
  // Le droit NAS et la présence d'un ancien JWT NAS ne suffisent pas :
  // une bascule explicite vers Cloud public doit immédiatement forcer tout
  // l'ONLINE/social/realtime sur Supabase, tout en conservant le token NAS
  // afin de pouvoir revenir ensuite au mode privé sans perdre le bridge.
  return isNasProviderEnabled() && !activeSessionIsPublicSupabase() && !!readNasAccessToken();
}
const envUrl = sanitizeApiUrl(getNasApiUrl());
const PUBLIC_HTTPS_API_URL = "https://api.multisports-api.fr";
const LEGACY_HTTP_API_URL = "http://api.multisports-api.fr:3000";
const SAME_ORIGIN_API_PROXY_PATH = "/api/backend";
const API_LAST_OK_KEY = "dc_api_url_last_ok";
const API_OVERRIDE_KEY = "dc_api_url";

function sameOriginApiProxyBase(): string {
  if (typeof window === "undefined") return "";
  try {
    const host = String(window.location.hostname || "").toLowerCase();
    // Le proxy Pages supprime entièrement le problème CORS navigateur tout en
    // conservant le backend NAS/R2 comme source de vérité.
    if (window.location.protocol === "https:" && host.endsWith(".pages.dev")) {
      return `${window.location.origin}${SAME_ORIGIN_API_PROXY_PATH}`;
    }
  } catch {}
  return "";
}

function isAuthScreenRoute(): boolean {
  if (typeof window === "undefined") return false;
  const hash = String(window.location.hash || "").toLowerCase();
  return hash.startsWith("#/auth/") || hash.startsWith("#/account/start");
}

function uniqApiUrls(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const url = sanitizeApiUrl(raw);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function legacyHttpApiAllowed(): boolean {
  if (typeof window === "undefined") return false;
  const manual = String(safeReadLocalStorage("dc_allow_legacy_http_api") || "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(manual)) return true;
  // Depuis l'app publique HTTPS, on évite de spammer l'ancien :3000 qui provoque
  // des erreurs de connexion trompeuses. Il reste possible via override manuel.
  return window.location.protocol !== "https:";
}

export function getApiBaseCandidates(): string[] {
  const legacyAllowed = legacyHttpApiAllowed();
  const rawLastOk = sanitizeApiUrl(safeReadLocalStorage(API_LAST_OK_KEY));
  const lastOk = (!legacyAllowed && rawLastOk === LEGACY_HTTP_API_URL) ? "" : rawLastOk;
  const localOverride = sanitizeApiUrl(safeReadLocalStorage(API_OVERRIDE_KEY));
  const legacy = legacyAllowed ? LEGACY_HTTP_API_URL : "";

  // Important : l’override manuel doit pouvoir reprendre la main quand le domaine
  // Vite compilé est cassé / DNS KO. Avant, envUrl gagnait toujours, donc on ne
  // pouvait plus dépanner l’Online depuis l’app.
  return uniqApiUrls([
    sameOriginApiProxyBase(),
    lastOk,
    localOverride,
    envUrl,
    PUBLIC_HTTPS_API_URL,
    legacy,
  ]);
}

function rememberWorkingApiUrl(url: string) {
  if (typeof window === "undefined") return;
  try {
    const clean = sanitizeApiUrl(url);
    if (clean) window.localStorage.setItem(API_LAST_OK_KEY, clean);
  } catch {}
}

function currentApiUrl(): string {
  return getApiBaseCandidates()[0] || PUBLIC_HTTPS_API_URL;
}
// Délais courts et différenciés. Une panne NAS ne doit plus bloquer l'interface
// pendant 60 secondes. Les écritures explicites disposent d'un peu plus de temps,
// tandis que les lectures automatiques du démarrage abandonnent rapidement.
const rawApiTimeoutMs = Number((typeof window !== "undefined" ? window.localStorage.getItem("dc_api_timeout_ms") : "") || 8000) || 8000;
const API_TIMEOUT_MS = Math.max(2500, Math.min(20_000, rawApiTimeoutMs));
const API_BACKGROUND_TIMEOUT_MS = 4_000;
const API_WRITE_TIMEOUT_MS = 10_000;

// Evite qu'une panne PostgreSQL/NAS déclenche des dizaines de GET simultanés.
// Les actions utilisateur POST/PUT/DELETE restent toujours tentées.
const ONLINE_BACKEND_COOLDOWN_MS = 20_000;
const DATABASE_BACKEND_COOLDOWN_MS = 30_000;
let onlineBackendCooldownUntil = 0;
let databaseBackendCooldownUntil = 0;
let backendHealthyUntil = 0;
let backendHealthProbeInFlight: Promise<boolean> | null = null;

let lastAuthChangedDispatchAt = 0;
let lastMissingTokenWarningAt = 0;
let nasAuthRecoveryInFlight: Promise<string> | null = null;

function isAutomaticBackendRead(path: string, method: string): boolean {
  if (String(method || "GET").toUpperCase() !== "GET") return false;
  const normalized = String(path || "");
  return normalized.startsWith("/online/") ||
    normalized === "/auth/me" ||
    normalized === "/profiles/me" ||
    normalized.startsWith("/account/storage-usage") ||
    normalized.startsWith("/account/storage-preferences") ||
    normalized.startsWith("/sync/slots") ||
    normalized.startsWith("/sync/pull") ||
    normalized.startsWith("/sync/match-backups");
}

function requestTimeoutFor(path: string, method: string): number {
  const verb = String(method || "GET").toUpperCase();
  if (verb !== "GET") return API_WRITE_TIMEOUT_MS;
  if (isAutomaticBackendRead(path, verb)) return API_BACKGROUND_TIMEOUT_MS;
  return API_TIMEOUT_MS;
}

function isDatabaseUnavailablePayload(payload: any): boolean {
  const code = String(payload?.code || "").toLowerCase();
  const text = String(payload?.message || payload?.error || payload?.detail || "").toLowerCase();
  return code === "database_unavailable" ||
    text.includes("postgresql") ||
    text.includes("base de données nas indisponible") ||
    text.includes("database unavailable");
}

async function ensureAutomaticBackendAvailable(): Promise<boolean> {
  const now = Date.now();
  if (now < databaseBackendCooldownUntil) return false;
  if (now < backendHealthyUntil) return true;
  if (backendHealthProbeInFlight) return backendHealthProbeInFlight;

  backendHealthProbeInFlight = (async () => {
    const base = sameOriginApiProxyBase() || getApiBaseCandidates()[0] || "";
    if (!base) return false;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), 1_800) : null;
    try {
      const response = await fetch(`${base}/health`, { cache: "no-store", signal: controller?.signal });
      const payload = await response.clone().json().catch(() => null);
      if (response.ok && payload?.dbReady !== false) {
        backendHealthyUntil = Date.now() + 15_000;
        return true;
      }
      databaseBackendCooldownUntil = Date.now() + DATABASE_BACKEND_COOLDOWN_MS;
      return false;
    } catch {
      databaseBackendCooldownUntil = Date.now() + DATABASE_BACKEND_COOLDOWN_MS;
      return false;
    } finally {
      if (timer) window.clearTimeout(timer);
      backendHealthProbeInFlight = null;
    }
  })();

  return backendHealthProbeInFlight;
}

function isSoftOnlineEndpoint(path: string): boolean {
  const normalized = String(path || "");
  // Ces routes sont lancées en arrière-plan au boot (appels, push, présence...).
  // Un 401 ici ne doit JAMAIS déconnecter le compte ni afficher le bloc flottant :
  // au pire, la fonctionnalité online concernée se resynchronisera au prochain refresh.
  return normalized.startsWith("/online/");
}

function dispatchSignedOut(reason: "401" | "missing_token", sourcePath = "") {
  if (typeof window === "undefined") return;
  const now = Date.now();
  // Évite de déclencher 20 fois le même écran flottant quand plusieurs hooks partent ensemble.
  if (now - lastAuthChangedDispatchAt < 1200) return;
  lastAuthChangedDispatchAt = now;
  try {
    window.dispatchEvent(new CustomEvent("dc-auth-changed", { detail: { status: "signed_out", reason, sourcePath } }));
  } catch {}
}

function clearNasAuthBecauseUnauthorized(sourcePath = "") {
  if (typeof window === "undefined") return;

  // Correctif anti-déconnexion fantôme : les appels /online/* peuvent recevoir 401
  // pendant le réveil NAS, au chargement du service worker ou pendant une course
  // entre restauration de session et polling. On ne purge pas les JWT sur ces routes.
  if (isSoftOnlineEndpoint(sourcePath)) {
    console.warn("[apiClient] 401 ignoré sur route online non critique — session conservée", sourcePath);
    return;
  }

  try {
    window.localStorage.removeItem("dc_nas_access_token_v1");
    window.localStorage.removeItem("dc_nas_refresh_token_v1");
    window.localStorage.removeItem("dc_online_auth_supabase_v1");
  } catch {}
  setApiAccessToken("");
  dispatchSignedOut("401", sourcePath);
}

async function recoverNasAuthToken(reason: "missing_token" | "401"): Promise<string> {
  if (!isNasDataSyncEnabled()) return "";

  const existing = readNasAccessToken();
  if (existing && reason === "missing_token") return existing;

  if (nasAuthRecoveryInFlight) return nasAuthRecoveryInFlight;
  nasAuthRecoveryInFlight = (async () => {
    try {
      const session: any = await nasRestoreSession({
        force: reason === "401",
        timeoutMs: reason === "401" ? 3500 : 2500,
      });
      const token = String(session?.token || readNasAccessToken() || "").trim();
      setApiAccessToken(token);
      return token;
    } catch (e) {
      console.warn(`[apiClient] NAS auth recovery failed (${reason})`, e);
      return "";
    } finally {
      nasAuthRecoveryInFlight = null;
    }
  })();
  return nasAuthRecoveryInFlight;
}

async function readResponseText(
  res: Response,
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
): Promise<string> {
  const totalBytes = Math.max(0, Number(res.headers.get("content-length") || 0));
  if (!onProgress || !res.body || typeof res.body.getReader !== "function") {
    const text = await res.text();
    try { onProgress?.(text.length, totalBytes || text.length); } catch {}
    return text;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let loadedBytes = 0;
  try { onProgress(0, totalBytes); } catch {}
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.byteLength) {
      loadedBytes += value.byteLength;
      parts.push(decoder.decode(value, { stream: true }));
      try { onProgress(loadedBytes, totalBytes); } catch {}
    }
  }
  parts.push(decoder.decode());
  try { onProgress(loadedBytes, totalBytes || loadedBytes); } catch {}
  return parts.join("");
}

async function readResponseBytes(
  res: Response,
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
): Promise<Uint8Array> {
  const totalBytes = Math.max(0, Number(res.headers.get("content-length") || 0));
  if (!res.body || typeof res.body.getReader !== "function") {
    const bytes = new Uint8Array(await res.arrayBuffer());
    try { onProgress?.(bytes.byteLength, totalBytes || bytes.byteLength); } catch {}
    return bytes;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;
  try { onProgress?.(0, totalBytes); } catch {}
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.byteLength) {
      chunks.push(value);
      loadedBytes += value.byteLength;
      try { onProgress?.(loadedBytes, totalBytes); } catch {}
    }
  }
  const bytes = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try { onProgress?.(loadedBytes, totalBytes || loadedBytes); } catch {}
  return bytes;
}

export type ApiBinaryResponse = {
  bytes: Uint8Array;
  contentType: string;
  contentLength: number;
  snapshotId: string;
  snapshotVersion: number | null;
  snapshotUpdatedAt: string | null;
};

async function parseJsonSafe(
  res: Response,
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
) {
  const text = await readResponseText(res, onProgress);
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    if (/<!doctype|<html/i.test(text)) {
      const cloudflareCode = text.match(/Error\s*<\/span>\s*<span>(\d+)|Error\s+(\d{3,4})/i);
      const code = cloudflareCode?.[1] || cloudflareCode?.[2] || "";
      throw new Error(code
        ? `Réponse HTML Cloudflare inattendue (erreur ${code}).`
        : "Réponse HTML inattendue du backend.");
    }
    throw new Error(`Réponse JSON invalide (${text.slice(0, 240)})`);
  }
}

function buildHeaders(init?: RequestInit): HeadersInit {
  const token = readNasAccessToken();
  const baseHeaders = new Headers(init?.headers || {});

  if (token && !baseHeaders.has("Authorization")) {
    baseHeaders.set("Authorization", `Bearer ${token}`);
  }

  return baseHeaders;
}

export type ApiRequestOptions = {
  /**
   * Délai réseau explicite pour une action déclenchée par l'utilisateur.
   * Ne modifie pas les délais courts des lectures automatiques au démarrage.
   */
  timeoutMs?: number;
  /**
   * Une lecture manuelle ne doit pas être bloquée par le probe/cooldown réservé
   * aux hooks automatiques. Exemple : restauration choisie depuis la page Sauvegarde.
   */
  manual?: boolean;
  /** Progression réelle du corps HTTP pour les téléchargements volumineux. */
  onDownloadProgress?: (loadedBytes: number, totalBytes: number) => void;
  /** Corps JSON classique ou flux binaire (gros snapshot gzip). */
  responseType?: "json" | "bytes";
};

function clampRequestTimeout(value: number): number {
  if (!Number.isFinite(value)) return API_TIMEOUT_MS;
  return Math.max(2_500, Math.min(180_000, Math.round(value)));
}

async function doFetch(path: string, init?: RequestInit, options?: ApiRequestOptions) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const requestMethod = String(init?.method || "GET").toUpperCase();
  const isBackgroundOnlineGet = requestMethod === "GET" && normalizedPath.startsWith("/online/");
  const isAutomaticRead = options?.manual === true
    ? false
    : isAutomaticBackendRead(normalizedPath, requestMethod);
  const requestTimeoutMs = options?.timeoutMs != null
    ? clampRequestTimeout(Number(options.timeoutMs))
    : requestTimeoutFor(normalizedPath, requestMethod);
  const proxyBase = sameOriginApiProxyBase();

  // Invariant d'architecture : en mode public/hybride, AUCUNE route /online/*
  // ne doit retomber sur l'API NAS. Les fonctions publiques migrées parlent
  // directement à Supabase. Les anciennes lectures encore non migrées sont
  // neutralisées localement afin d'éviter les rafales 401/timeout au boot.
  if (normalizedPath.startsWith("/online/") && !canUseNasOnlineApi()) {
    if (requestMethod === "GET") {
      return {
        ok: true,
        skipped: true,
        provider: "supabase",
        code: "legacy_nas_online_read_disabled",
      };
    }

    const error: any = new Error(
      `${requestMethod} ${normalizedPath} non disponible via le backend NAS en mode public/hybride.`
    );
    error.status = 409;
    error.code = "legacy_nas_online_write_disabled";
    throw error;
  }

  // Les badges/messages/appels ne doivent jamais lancer une rafale réseau sur
  // l'écran de connexion, même si un ancien JWT NAS traîne encore en cache.
  if (isBackgroundOnlineGet && isAuthScreenRoute()) {
    const error: any = new Error(`GET ${normalizedPath} suspendu pendant l’authentification`);
    error.status = 204;
    error.code = "auth_route_suspended";
    throw error;
  }

  if (isBackgroundOnlineGet && Date.now() < onlineBackendCooldownUntil) {
    const seconds = Math.max(1, Math.ceil((onlineBackendCooldownUntil - Date.now()) / 1000));
    const error: any = new Error(`GET ${normalizedPath} différé — backend NAS indisponible, nouvel essai dans ${seconds}s`);
    error.status = 503;
    error.code = "backend_cooldown";
    throw error;
  }

  if (isAutomaticRead && Date.now() < databaseBackendCooldownUntil) {
    const seconds = Math.max(1, Math.ceil((databaseBackendCooldownUntil - Date.now()) / 1000));
    const error: any = new Error(`GET ${normalizedPath} suspendu — PostgreSQL NAS indisponible, nouvel essai dans ${seconds}s`);
    error.status = 503;
    error.code = "database_cooldown";
    throw error;
  }

  // Un seul /health très court sert de garde au démarrage. Tous les hooks
  // automatiques partagent ce probe : si PostgreSQL est coupé, on obtient une
  // seule requête en erreur au lieu de dizaines d'appels rouges concurrents.
  if (isAutomaticRead) {
    const available = await ensureAutomaticBackendAvailable();
    if (!available) {
      const error: any = new Error(`GET ${normalizedPath} suspendu — backend NAS/PostgreSQL indisponible`);
      error.status = 503;
      error.code = "database_probe_failed";
      throw error;
    }
  }

  // Garde anti-spam, mais sans faux positif au boot : avant d'annoncer une
  // déconnexion, on tente de restaurer la session NAS depuis le cache complet.
  if (normalizedPath.startsWith("/online/") && !readNasAccessToken()) {
    const recoveredToken = await recoverNasAuthToken("missing_token");
    if (!recoveredToken) {
      // Route online en arrière-plan : pas de pop-up, pas de purge.
      // L'utilisateur peut être en local, hors ligne, ou la session peut être en cours de restauration.
      const now = Date.now();
      if (now - lastMissingTokenWarningAt > 15_000) {
        lastMissingTokenWarningAt = now;
        console.warn("[apiClient] /online/* en attente du token — session conservée", normalizedPath);
      }
      throw new Error(`${init?.method || "GET"} ${normalizedPath} skipped — session online absente`);
    }
  }

  const candidates = getApiBaseCandidates();
  let lastError: any = null;

  for (const apiBase of candidates) {
    let res: Response | null = null;
    let clearResponseDeadline = () => {};

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctrl ? window.setTimeout(() => {
        try { ctrl.abort(new DOMException("timeout", "AbortError")); } catch { ctrl.abort(); }
      }, requestTimeoutMs) : null;
      const clearDeadline = () => {
        if (timer) window.clearTimeout(timer);
      };

      try {
        res = await fetch(`${apiBase}${normalizedPath}`, {
          ...init,
          signal: ctrl?.signal ?? init?.signal,
          headers: buildHeaders(init),
        });
        // Le délai reste actif pendant la lecture du corps. Avant V61 il était
        // supprimé dès la réception des en-têtes, ce qui pouvait laisser un
        // gros /sync/pull bloqué indéfiniment au milieu du téléchargement.
        clearResponseDeadline = clearDeadline;
      } catch (error: any) {
        clearDeadline();
        const aborted = error?.name === "AbortError" || /abort|timeout/i.test(String(error?.message || ""));
        lastError = new Error(aborted
          ? `${init?.method || "GET"} ${normalizedPath} failed — Backend NAS trop lent (timeout ${requestTimeoutMs}ms)`
          : `${init?.method || "GET"} ${normalizedPath} failed — Backend NAS inaccessible (${apiBase})`);
        res = null;
        if (proxyBase && apiBase === proxyBase) throw lastError;
        break;
      }

      if (res.status !== 401 || attempt > 0) break;

      clearResponseDeadline();
      clearResponseDeadline = () => {};
      const recoveredToken = await recoverNasAuthToken("401");
      if (!recoveredToken) break;
    }

    if (!res) continue;

    if (!res.ok) {
      if (res.status === 401) clearNasAuthBecauseUnauthorized(normalizedPath);
      const errPayload = await parseJsonSafe(res).catch(() => null).finally(clearResponseDeadline);
      clearResponseDeadline = () => {};
      const errMessage = String(
        errPayload?.message ||
          errPayload?.error ||
          errPayload?.detail ||
          errPayload?.hint ||
          ""
      ).trim();
      const error: any = new Error(
        `${init?.method || "GET"} ${normalizedPath} failed (${res.status})${errMessage ? ` — ${errMessage}` : ""}`
      );
      error.status = res.status;
      error.payload = errPayload;
      if (isBackgroundOnlineGet && [502, 503, 504].includes(res.status)) {
        onlineBackendCooldownUntil = Date.now() + ONLINE_BACKEND_COOLDOWN_MS;
      }
      if (res.status === 503 && isDatabaseUnavailablePayload(errPayload)) {
        databaseBackendCooldownUntil = Date.now() + DATABASE_BACKEND_COOLDOWN_MS;
      }

      if (proxyBase && apiBase === proxyBase && res.status >= 500) {
        throw error;
      }

      if ((res.status >= 500 || (res.status === 404 && normalizedPath === "/health")) && apiBase !== candidates[candidates.length - 1]) {
        lastError = error;
        continue;
      }
      throw error;
    }

    try {
      const parsed = options?.responseType === "bytes"
        ? {
            bytes: await readResponseBytes(res, options?.onDownloadProgress),
            contentType: String(res.headers.get("content-type") || ""),
            contentLength: Math.max(0, Number(res.headers.get("content-length") || 0)),
            snapshotId: String(res.headers.get("x-mss-snapshot-id") || ""),
            snapshotVersion: Number(res.headers.get("x-mss-snapshot-version") || 0) || null,
            snapshotUpdatedAt: String(res.headers.get("x-mss-snapshot-updated-at") || "") || null,
          }
        : await parseJsonSafe(res, options?.onDownloadProgress);
      rememberWorkingApiUrl(apiBase);
      if (normalizedPath.startsWith("/online/")) onlineBackendCooldownUntil = 0;
      databaseBackendCooldownUntil = 0;
      backendHealthyUntil = Date.now() + 15_000;
      return parsed;
    } catch (error: any) {
      const aborted = error?.name === "AbortError" || /abort|timeout/i.test(String(error?.message || ""));
      if (aborted) {
        throw new Error(`${init?.method || "GET"} ${normalizedPath} failed — téléchargement NAS interrompu après ${requestTimeoutMs}ms`);
      }
      throw error;
    } finally {
      clearResponseDeadline();
    }
  }

  throw lastError || new Error(`${init?.method || "GET"} ${normalizedPath} failed — aucun backend NAS joignable`);
}

export async function apiGet(path: string, options?: ApiRequestOptions) {
  return doFetch(path, undefined, options);
}

export async function apiGetBytes(path: string, options?: Omit<ApiRequestOptions, "responseType">): Promise<ApiBinaryResponse> {
  return doFetch(path, undefined, { ...options, responseType: "bytes" }) as Promise<ApiBinaryResponse>;
}

export async function apiPost(path: string, body: unknown) {
  return doFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPut(path: string, body: unknown) {
  return doFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string) {
  return doFetch(path, {
    method: "DELETE",
  });
}

export function buildApiUrl(path: string, query?: Record<string, string | number | boolean | null | undefined>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${currentApiUrl()}${normalizedPath}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function getApiUrl() {
  return currentApiUrl();
}
