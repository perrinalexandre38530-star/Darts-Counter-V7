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

function readNasAccessToken(): string {
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
  const res = await fetch(`${API_URL}${normalizedPath}`, {
    ...init,
    headers: buildHeaders(init),
  });

  if (!res.ok) {
    throw new Error(`${init?.method || "GET"} ${normalizedPath} failed (${res.status})`);
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

export function getApiUrl() {
  return API_URL;
}
