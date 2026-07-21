import { supabase } from "./supabaseClient";
import type { CloudObjectIndexItem } from "./cloudStorageApi";

/**
 * Route Cloudflare Pages Function, liée directement au bucket R2.
 * IMPORTANT : aucune solution de repli vers le NAS n'est autorisée ici.
 * Une sauvegarde R2 ne doit jamais dépendre de api.multisports-api.fr.
 */
const DIRECT_BASE = "/api/storage/backups";
const REQUEST_TIMEOUT_MS = 8_000;

export type DirectBackupSummary = Record<string, any>;

type DirectBackupRecord = {
  id: string;
  objectKey: string;
  title?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  sizeBytes?: number;
  checksum?: string | null;
  summary?: DirectBackupSummary | null;
  metadata?: Record<string, any> | null;
};

function safeJson(raw: string): any {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function decodeJwtPayload(token: string): any {
  try {
    const part = String(token || "").split(".")[1] || "";
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(decodeURIComponent(Array.from(atob(base64)).map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
  } catch {
    return null;
  }
}

function isSupabaseAccessToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const issuer = String(payload?.iss || "").toLowerCase();
  return !!payload?.sub && (issuer.includes("supabase.co/auth/v1") || String(payload?.role || "") === "authenticated");
}

function tokenFromStoredSupabaseSession(): string {
  if (typeof window === "undefined") return "";
  const keys = [
    "dc_online_auth_supabase_v1",
    "sb-rckbdaqksujehszafior-auth-token",
  ];

  // Les SDK Supabase utilisent aussi une clé sb-<project>-auth-token.
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i) || "";
      if (/^sb-.*-auth-token$/i.test(key) && !keys.includes(key)) keys.push(key);
    }
  } catch {}

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "";
      if (!raw) continue;
      const parsed = safeJson(raw);
      const token = String(
        parsed?.access_token || parsed?.accessToken || parsed?.token ||
        parsed?.session?.access_token || parsed?.currentSession?.access_token ||
        parsed?.data?.session?.access_token || parsed?.data?.access_token || ""
      ).trim();
      if (token && isSupabaseAccessToken(token)) return token;
    } catch {}
  }
  return "";
}

async function readSupabaseAccessToken(): Promise<string> {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 900)),
    ]);
    const token = String((result as any)?.data?.session?.access_token || "").trim();
    if (token && isSupabaseAccessToken(token)) return token;
  } catch {}
  return tokenFromStoredSupabaseSession();
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    window.clearTimeout(timer);
  }
}

function conciseR2Error(status: number, payload: any, rawText: string): Error {
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || payload?.error || "").trim();

  if (code === "r2_binding_missing") {
    return new Error("Cloud R2 non relié au projet Cloudflare Pages. Le binding USER_DATA_BUCKET doit pointer vers multisports-user-data, puis le projet doit être redéployé.");
  }
  if (status === 401) {
    return new Error("Session Supabase requise pour Cloud R2. Déconnecte-toi puis reconnecte le même compte avant de sauvegarder.");
  }
  if (status === 413) {
    return new Error(message || "Sauvegarde trop volumineuse ou quota Cloud R2 dépassé.");
  }
  if (/<!doctype|<html/i.test(rawText)) {
    return new Error("La route Cloudflare Pages de sauvegarde R2 ne répond pas correctement. Aucun appel au tunnel NAS n'a été effectué.");
  }
  return new Error(message || `Cloud R2 HTTP ${status}`);
}

async function requestDirect(path = "", init: RequestInit = {}): Promise<any> {
  const token = await readSupabaseAccessToken();
  if (!token) {
    throw new Error("Session Supabase absente. Reconnecte ton compte avant une sauvegarde Cloud R2. Les sauvegardes Local et Fichier restent disponibles hors ligne.");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetchWithTimeout(`${DIRECT_BASE}${path}`, { ...init, headers });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Cloud R2 n'a pas répondu en moins de 8 secondes.");
    }
    throw new Error(`Route Cloudflare Pages R2 inaccessible : ${error?.message || String(error)}`);
  }

  const text = await response.text().catch(() => "");
  const payload = safeJson(text);
  if (response.ok && payload?.ok === true) return payload;
  throw conciseR2Error(response.status, payload, text);
}

function toCloudItem(item: DirectBackupRecord): CloudObjectIndexItem {
  return {
    id: String(item.id || ""),
    object_key: String(item.objectKey || ""),
    object_provider: "r2",
    object_type: "cloud_vault_snapshot_v1",
    sport: "system",
    title: item.title || "Sauvegarde Cloud R2",
    size_bytes: Number(item.sizeBytes || 0),
    checksum: item.checksum || null,
    metadata: {
      ...(item.metadata || {}),
      summary: item.summary || {},
      directR2: true,
      backupKind: "vault_full_snapshot",
    },
    is_deleted: !!item.deletedAt,
    created_at: item.createdAt || undefined,
    updated_at: item.updatedAt || item.createdAt || undefined,
  };
}

export function isDirectR2BackupId(id: string): boolean {
  return String(id || "").startsWith("r2b_");
}

export async function createDirectR2Backup(args: {
  snapshotJson: string;
  title?: string;
  summary?: DirectBackupSummary;
  metadata?: Record<string, any>;
}): Promise<{ ok: boolean; object: CloudObjectIndexItem }> {
  const payload = await requestDirect("", {
    method: "POST",
    body: JSON.stringify({
      snapshotJson: args.snapshotJson,
      title: args.title,
      summary: args.summary || {},
      metadata: args.metadata || {},
    }),
  });
  return { ok: true, object: toCloudItem(payload?.backup || payload?.object || {}) };
}

export async function listDirectR2Backups(limit = 30, includeDeleted = false): Promise<CloudObjectIndexItem[]> {
  const qs = new URLSearchParams({ limit: String(limit), includeDeleted: includeDeleted ? "1" : "0" });
  const payload = await requestDirect(`?${qs.toString()}`, { method: "GET" });
  const rows = Array.isArray(payload?.backups) ? payload.backups : [];
  return rows.map(toCloudItem);
}

export async function downloadDirectR2Backup(id: string): Promise<{ ok: boolean; object: CloudObjectIndexItem; mode: "json" | "text"; content: any; text: string }> {
  const payload = await requestDirect(`/${encodeURIComponent(id)}`, { method: "GET" });
  const text = String(payload?.snapshotJson || payload?.text || "");
  let content: any = text;
  try { content = JSON.parse(text); } catch {}
  return {
    ok: true,
    object: toCloudItem(payload?.backup || payload?.object || { id }),
    mode: typeof content === "string" ? "text" : "json",
    content,
    text,
  };
}

export async function deleteDirectR2Backup(id: string, force = false): Promise<any> {
  return requestDirect(`/${encodeURIComponent(id)}${force ? "?force=1" : ""}`, { method: "DELETE" });
}

export async function restoreDirectR2Backup(id: string): Promise<any> {
  return requestDirect(`/${encodeURIComponent(id)}/undelete`, { method: "POST" });
}

export async function emptyDirectR2Trash(): Promise<any> {
  return requestDirect("/trash", { method: "DELETE" });
}
