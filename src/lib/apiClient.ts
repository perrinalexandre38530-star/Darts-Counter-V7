import { getNasApiUrl, isNasProviderEnabled } from "./serverConfig";
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
const localOverride = sanitizeApiUrl(
  typeof window !== "undefined" ? localStorage.getItem("dc_api_url") : ""
);

// ✅ PRIORITÉ : domaine Cloudflare final > éventuel override local legacy
const API_URL = envUrl || localOverride || "http://api.multisports-api.fr:3000";
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
  if (!isNasProviderEnabled()) return "";

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

  let res: Response | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? window.setTimeout(() => {
      try { ctrl.abort(new DOMException("timeout", "AbortError")); } catch { ctrl.abort(); }
    }, API_TIMEOUT_MS) : null;

    try {
      res = await fetch(`${API_URL}${normalizedPath}`, {
        ...init,
        signal: ctrl?.signal ?? init?.signal,
        headers: buildHeaders(init),
      });
    } catch (error: any) {
      const aborted = error?.name === "AbortError" || /abort|timeout/i.test(String(error?.message || ""));
      throw new Error(aborted
        ? `${init?.method || "GET"} ${normalizedPath} failed — Backend NAS trop lent (timeout ${API_TIMEOUT_MS}ms)`
        : (error?.message || "Backend NAS inaccessible"));
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

  if (!res) throw new Error(`${init?.method || "GET"} ${normalizedPath} failed — réponse absente`);

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
    throw new Error(
      `${init?.method || "GET"} ${normalizedPath} failed (${res.status})${errMessage ? ` — ${errMessage}` : ""}`
    );
  }

  return parseJsonSafe(res);
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
  const url = new URL(`${API_URL}${normalizedPath}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function getApiUrl() {
  return API_URL;
}
