import { getNasApiUrl } from "./serverConfig";

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

export function readNasAccessToken(): string {
  const direct = safeReadLocalStorage("dc_nas_access_token_v1").trim();
  if (direct) return direct;

  const session = safeParseJson<any>(safeReadLocalStorage("dc_online_auth_supabase_v1"), null);
  return String(
    session?.token ||
      session?.accessToken ||
      session?.access_token ||
      session?.session?.token ||
      session?.session?.accessToken ||
      session?.session?.access_token ||
      ""
  ).trim();
}

const envUrl = sanitizeApiUrl(getNasApiUrl());
const localOverride = sanitizeApiUrl(
  typeof window !== "undefined" ? localStorage.getItem("dc_api_url") : ""
);

// ✅ PRIORITÉ : domaine Cloudflare final > éventuel override local legacy
const API_URL = envUrl || localOverride || "http://api.multisports-api.fr:3000";
const API_TIMEOUT_MS = Math.max(1200, Number((typeof window !== "undefined" ? window.localStorage.getItem("dc_api_timeout_ms") : "") || 3500) || 3500);

function clearNasAuthBecauseUnauthorized() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("dc_nas_access_token_v1");
    window.localStorage.removeItem("dc_nas_refresh_token_v1");
    window.localStorage.removeItem("dc_online_auth_supabase_v1");
    window.dispatchEvent(new CustomEvent("dc-auth-changed", { detail: { status: "signed_out", reason: "401" } }));
  } catch {}
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
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? window.setTimeout(() => {
    try { ctrl.abort(new DOMException("timeout", "AbortError")); } catch { ctrl.abort(); }
  }, API_TIMEOUT_MS) : null;

  let res: Response;
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

  if (!res.ok) {
    if (res.status === 401) clearNasAuthBecauseUnauthorized();
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
