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

async function doFetch(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${API_URL}${normalizedPath}`, init);

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
