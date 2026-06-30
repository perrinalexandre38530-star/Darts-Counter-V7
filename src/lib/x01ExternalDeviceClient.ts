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

function cleanCode(input: any): string {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 24);
}

function apiBase(): string {
  return String(getApiUrl() || "").replace(/\/+$/, "");
}

function publicBase(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

function appendQuery(url: string, params: Record<string, string>): string {
  try {
    const u = new URL(url);
    Object.entries(params).forEach(([k, v]) => {
      if (v) u.searchParams.set(k, v);
    });
    return u.toString();
  } catch {
    const qs = new URLSearchParams(params).toString();
    return `${url}${url.includes("?") ? "&" : "?"}${qs}`;
  }
}

export function buildX01DeviceJoinUrl(sessionId: string): string {
  const code = cleanCode(sessionId);
  const base = publicBase();
  const url = `${base}#/x01-device/${encodeURIComponent(code)}`;
  return appendQuery(url, { api: apiBase() });
}

export function buildX01DevicePollingUrl(sessionId: string): string {
  return buildApiUrl(`/x01-device/session/${encodeURIComponent(cleanCode(sessionId))}/events`);
}

export function buildX01DeviceStatusUrl(sessionId: string): string {
  return buildApiUrl(`/x01-device/session/${encodeURIComponent(cleanCode(sessionId))}/status`);
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
  const json = await rawJson(buildApiUrl("/x01-device/session"), {
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
  const json = await rawJson(buildApiUrl(`/x01-device/session/${encodeURIComponent(code)}/event`), {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
  return { ok: json?.ok !== false, id: Number(json?.id || json?.seq || 0) || undefined };
}

export async function closeX01DeviceSession(sessionId: string): Promise<void> {
  const code = cleanCode(sessionId);
  if (!code) return;
  try {
    await rawJson(buildApiUrl(`/x01-device/session/${encodeURIComponent(code)}`), { method: "DELETE" });
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
