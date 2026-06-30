// @ts-nocheck
// ============================================
// src/lib/x01ExternalDeviceClient.ts
// X01 — liaison téléphone/appareil de comptage externe
// - Session publique courte durée via API NAS/Cloudflare
// - Le téléphone compagnon poste les impacts/volées
// - La partie X01 poll les events via externalPollingUrl
// ============================================

import { buildApiUrl, getApiUrl } from "./apiClient";

export type X01DeviceSession = {
  sessionId: string;
  code: string;
  joinUrl: string;
  pollingUrl: string;
  statusUrl: string;
  createdAt: number;
  expiresAt?: number | null;
};

export type X01DeviceStatus = {
  ok?: boolean;
  sessionId?: string;
  code?: string;
  connected?: boolean;
  linked?: boolean;
  calibrated?: boolean;
  deviceLabel?: string;
  deviceKind?: string;
  lastSeenAt?: number | null;
  updatedAt?: number | null;
  message?: string;
  [key: string]: any;
};

const DEVICE_API_OVERRIDE_KEY = "dc:x01-device-api-url:v1";

function cleanCode(input: any): string {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 24);
}

function cleanApiUrl(input: any): string {
  const raw = String(input || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(raw)) return "";
  return raw;
}

function readApiOverrideFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const searchApi = cleanApiUrl(new URLSearchParams(window.location.search || "").get("api"));
    if (searchApi) return searchApi;
  } catch {}
  try {
    const hash = String(window.location.hash || "");
    const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const hashApi = cleanApiUrl(new URLSearchParams(query).get("api"));
    if (hashApi) return hashApi;
  } catch {}
  return "";
}

function readStoredApiOverride(): string {
  if (typeof window === "undefined") return "";
  try {
    return cleanApiUrl(window.localStorage.getItem(DEVICE_API_OVERRIDE_KEY) || "");
  } catch {
    return "";
  }
}

function apiBase(): string {
  const fromUrl = readApiOverrideFromUrl();
  if (fromUrl) {
    try { window.localStorage.setItem(DEVICE_API_OVERRIDE_KEY, fromUrl); } catch {}
    return fromUrl;
  }
  return String(readStoredApiOverride() || getApiUrl() || "").replace(/\/+$/, "");
}

function publicBase(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

function buildDeviceApiUrl(path: string): string {
  const base = apiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return buildApiUrl(normalizedPath);
  return `${base}${normalizedPath}`;
}

export function buildX01DeviceJoinUrl(sessionId: string): string {
  const code = cleanCode(sessionId);
  const base = publicBase();
  const api = apiBase();
  const query = api ? `?api=${encodeURIComponent(api)}` : "";
  // Important : le paramètre api est volontairement dans le hash.
  // Ainsi le téléphone ouvre directement la route publique de calibration SPA,
  // sans passer par login ni perdre le code session.
  return `${base}#/x01-device/${encodeURIComponent(code)}${query}`;
}

export function buildX01DevicePollingUrl(sessionId: string): string {
  return buildDeviceApiUrl(`/x01-device/session/${encodeURIComponent(cleanCode(sessionId))}/events`);
}

export function buildX01DeviceStatusUrl(sessionId: string): string {
  return buildDeviceApiUrl(`/x01-device/session/${encodeURIComponent(cleanCode(sessionId))}/status`);
}

async function rawJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...((init?.headers as any) || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(String(json?.message || json?.error || `HTTP ${res.status}`));
  }
  return json;
}

export async function createX01DeviceSession(): Promise<X01DeviceSession> {
  const json = await rawJson(buildDeviceApiUrl("/x01-device/session"), {
    method: "POST",
    body: JSON.stringify({ kind: "x01_phone_companion_v1" }),
  });
  const code = cleanCode(json?.code || json?.sessionId || json?.id);
  if (!code) throw new Error("Session téléphone invalide : code absent.");
  return {
    sessionId: code,
    code,
    joinUrl: buildX01DeviceJoinUrl(code),
    pollingUrl: buildX01DevicePollingUrl(code),
    statusUrl: buildX01DeviceStatusUrl(code),
    createdAt: Date.now(),
    expiresAt: json?.expiresInSeconds ? Date.now() + Number(json.expiresInSeconds) * 1000 : null,
  };
}

export async function fetchX01DeviceStatus(sessionId: string): Promise<X01DeviceStatus | null> {
  const code = cleanCode(sessionId);
  if (!code) return null;
  return rawJson(buildX01DeviceStatusUrl(code), { method: "GET", cache: "no-store" as any });
}

export async function updateX01DeviceStatus(sessionId: string, patch: Partial<X01DeviceStatus>): Promise<X01DeviceStatus | null> {
  const code = cleanCode(sessionId);
  if (!code) return null;
  return rawJson(buildX01DeviceStatusUrl(code), {
    method: "POST",
    body: JSON.stringify(patch || {}),
  });
}

export async function postX01DeviceEvent(sessionId: string, payload: any): Promise<{ ok: boolean; id?: number }> {
  const code = cleanCode(sessionId);
  if (!code) throw new Error("Code session manquant.");
  const json = await rawJson(buildDeviceApiUrl(`/x01-device/session/${encodeURIComponent(code)}/event`), {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
  return { ok: json?.ok !== false, id: Number(json?.id || json?.seq || 0) || undefined };
}

export async function closeX01DeviceSession(sessionId: string): Promise<void> {
  const code = cleanCode(sessionId);
  if (!code) return;
  try {
    await rawJson(buildDeviceApiUrl(`/x01-device/session/${encodeURIComponent(code)}`), { method: "DELETE" });
  } catch {}
}

export function persistX01PhoneCompanionPrefs(session: X01DeviceSession) {
  if (typeof window === "undefined" || !session?.code) return;
  try {
    const key = "dc:x01v3:external-device:v1";
    const current = JSON.parse(window.localStorage.getItem(key) || "{}");
    window.localStorage.setItem(
      key,
      JSON.stringify({
        ...current,
        mode: "phone_companion",
        externalDeviceMode: "phone_companion",
        pollingUrl: session.pollingUrl,
        externalPollingUrl: session.pollingUrl,
        bridgeUrl: current.bridgeUrl || "ws://localhost:8765",
        externalBridgeUrl: current.externalBridgeUrl || current.bridgeUrl || "ws://localhost:8765",
        phoneSessionId: session.code,
        phoneJoinUrl: session.joinUrl,
        phoneStatusUrl: session.statusUrl,
        updatedAt: Date.now(),
      })
    );
  } catch {}
}

export function readX01PhoneCompanionPrefs(): Partial<X01DeviceSession> & { phoneSessionId?: string; phoneJoinUrl?: string; phoneStatusUrl?: string } {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem("dc:x01v3:external-device:v1") || "{}");
    const code = cleanCode(raw.phoneSessionId || raw.sessionId || "");
    if (!code) return raw || {};
    return {
      ...raw,
      sessionId: code,
      code,
      joinUrl: raw.phoneJoinUrl || buildX01DeviceJoinUrl(code),
      pollingUrl: raw.pollingUrl || raw.externalPollingUrl || buildX01DevicePollingUrl(code),
      statusUrl: raw.phoneStatusUrl || buildX01DeviceStatusUrl(code),
      phoneSessionId: code,
    };
  } catch {
    return {};
  }
}
