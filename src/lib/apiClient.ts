import { getNasApiUrl, isNasDataSyncEnabled } from "./serverConfig";
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
      ""
  ).trim();
}

function looksLikeBearerToken(raw: string): boolean {
  const value = String(raw || "").trim();
  if (!value) return false;
  // JWT classique ou token opaque suffisamment long.
  return value.split(".").length >= 3 || value.length >= 24;
}

export function readNasAccessToken(): string {
  const directKeys = [
    "dc_nas_access_token_v1",
    "auth_token",
    "access_token",
  ];

  for (const key of directKeys) {
    const direct = safeReadLocalStorage(key).trim();
    if (direct) return direct;
  }

  const sessionKeys = [
    "dc_online_auth_supabase_v1",
    "auth_session",
    "dc_session",
    "current_user",
    "supabase.auth.token",
  ];

  for (const key of sessionKeys) {
    const raw = safeReadLocalStorage(key).trim();
    if (!raw) continue;
    if (looksLikeBearerToken(raw)) return raw;

    const parsed = safeParseJson<any>(raw, null);
    const token = extractAuthTokenFromObject(parsed);
    if (token) return token;
  }

  return "";
}

const envUrl = sanitizeApiUrl(getNasApiUrl());
const PUBLIC_HTTPS_API_URL = "https://api.multisports-api.fr";
const LEGACY_HTTP_API_URL = "http://api.multisports-api.fr:3000";
const API_LAST_OK_KEY = "dc_api_url_last_ok";
const API_OVERRIDE_KEY = "dc_api_url";

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

export function getApiBaseCandidates(): string[] {
  const lastOk = sanitizeApiUrl(safeReadLocalStorage(API_LAST_OK_KEY));
  const localOverride = sanitizeApiUrl(safeReadLocalStorage(API_OVERRIDE_KEY));

  // Important : l’override manuel doit pouvoir reprendre la main quand le domaine
  // Vite compilé est cassé / DNS KO. Avant, envUrl gagnait toujours, donc on ne
  // pouvait plus dépanner l’Online depuis l’app.
  return uniqApiUrls([
    lastOk,
    localOverride,
    envUrl,
    PUBLIC_HTTPS_API_URL,
    LEGACY_HTTP_API_URL,
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
// Le NAS/Cloudflare peut dépasser 3,5 s au réveil ou pendant une écriture snapshot/stats.
// Ancien défaut: 3500 ms => les synchros profil lié étaient annulées côté navigateur
// avant même que le backend ait fini de répondre. On laisse maintenant 60 s, surtout pour NAS + Cloudflare au réveil.
const rawApiTimeoutMs = Number((typeof window !== "undefined" ? window.localStorage.getItem("dc_api_timeout_ms") : "") || 60000) || 60000;
const API_TIMEOUT_MS = Math.max(60000, rawApiTimeoutMs);

let lastAuthChangedDispatchAt = 0;

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
  dispatchSignedOut("401", sourcePath);
}

async function recoverNasAuthToken(reason: "missing_token" | "401"): Promise<string> {
  if (!isNasDataSyncEnabled()) return "";

  const existing = readNasAccessToken();
  if (existing && reason === "missing_token") return existing;

  try {
    const session: any = await nasRestoreSession({
      force: reason === "401",
      timeoutMs: reason === "401" ? 3500 : 2500,
    });
    const token = String(session?.token || readNasAccessToken() || "").trim();
    return token;
  } catch (e) {
    console.warn(`[apiClient] NAS auth recovery failed (${reason})`, e);
    return "";
  }
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Réponse JSON invalide: ${text}`);
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

async function doFetch(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Garde anti-spam, mais sans faux positif au boot : avant d'annoncer une
  // déconnexion, on tente de restaurer la session NAS depuis le cache complet.
  if (normalizedPath.startsWith("/online/") && !readNasAccessToken()) {
    const recoveredToken = await recoverNasAuthToken("missing_token");
    if (!recoveredToken) {
      // Route online en arrière-plan : pas de pop-up, pas de purge.
      // L'utilisateur peut être en local, hors ligne, ou la session peut être en cours de restauration.
      console.warn("[apiClient] /online/* ignoré sans token — session conservée", normalizedPath);
      throw new Error(`${init?.method || "GET"} ${normalizedPath} skipped — session online absente`);
    }
  }

  const candidates = getApiBaseCandidates();
  let lastError: any = null;

  for (const apiBase of candidates) {
    let res: Response | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctrl ? window.setTimeout(() => {
        try { ctrl.abort(new DOMException("timeout", "AbortError")); } catch { ctrl.abort(); }
      }, API_TIMEOUT_MS) : null;

      try {
        res = await fetch(`${apiBase}${normalizedPath}`, {
          ...init,
          signal: ctrl?.signal ?? init?.signal,
          headers: buildHeaders(init),
        });
      } catch (error: any) {
        const aborted = error?.name === "AbortError" || /abort|timeout/i.test(String(error?.message || ""));
        lastError = new Error(aborted
          ? `${init?.method || "GET"} ${normalizedPath} failed — Backend NAS trop lent (timeout ${API_TIMEOUT_MS}ms)`
          : `${init?.method || "GET"} ${normalizedPath} failed — Backend NAS inaccessible (${apiBase})`);
        res = null;
        break;
      } finally {
        if (timer) window.clearTimeout(timer);
      }

      if (res.status !== 401 || attempt > 0) break;

      // 401 peut arriver juste après une relance app / réveil NAS alors que le
      // cache local possède encore une session récupérable. On restaure puis on
      // retente une seule fois avant de purger réellement l'auth.
      const recoveredToken = await recoverNasAuthToken("401");
      if (!recoveredToken) break;
    }

    if (!res) continue;

    if (!res.ok) {
      if (res.status === 401) clearNasAuthBecauseUnauthorized(normalizedPath);
      const errPayload = await parseJsonSafe(res).catch(() => null);
      const errMessage = String(
        errPayload?.message ||
          errPayload?.error ||
          errPayload?.detail ||
          errPayload?.hint ||
          ""
      ).trim();
      const error = new Error(
        `${init?.method || "GET"} ${normalizedPath} failed (${res.status})${errMessage ? ` — ${errMessage}` : ""}`
      );

      // Si on a un reverse proxy KO (502/503/504) ou une route health absente
      // sur un ancien endpoint, on tente le candidat suivant. Pour les erreurs
      // métier (400/401/403/404 hors health), on remonte immédiatement.
      if ((res.status >= 500 || (res.status === 404 && normalizedPath === "/health")) && apiBase !== candidates[candidates.length - 1]) {
        lastError = error;
        continue;
      }
      throw error;
    }

    rememberWorkingApiUrl(apiBase);
    return parseJsonSafe(res);
  }

  throw lastError || new Error(`${init?.method || "GET"} ${normalizedPath} failed — aucun backend NAS joignable`);
}

export async function apiGet(path: string) {
  return doFetch(path);
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
