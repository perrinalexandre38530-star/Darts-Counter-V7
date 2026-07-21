import { supabase } from "./supabaseClient";
import type { CloudObjectIndexItem } from "./cloudStorageApi";

const DIRECT_BASE = "/api/storage/backups";
const FALLBACK_BASE = "/api/backend/account/cloud-storage-direct/backups";
const REQUEST_TIMEOUT_MS = 2_500;

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

function tokenFromStoredSession(): string {
  if (typeof window === "undefined") return "";
  const keys = [
    "dc_online_auth_supabase_v1",
    "dc_session",
    "auth_session",
    "current_user",
    "dc_nas_access_token_v1",
    "auth_token",
    "access_token",
  ];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "";
      if (!raw) continue;
      if (raw.startsWith("{") || raw.startsWith("[")) {
        const parsed = safeJson(raw);
        const token = String(
          parsed?.token || parsed?.accessToken || parsed?.access_token || parsed?.session?.access_token ||
          parsed?.session?.token || parsed?.data?.token || parsed?.data?.access_token || ""
        ).trim();
        if (token) return token;
      } else if (raw.length >= 24) {
        return raw.trim();
      }
    } catch {}
  }
  return "";
}

async function readAnyAccessToken(): Promise<string> {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 450)),
    ]);
    const token = String((result as any)?.data?.session?.access_token || "").trim();
    if (token) return token;
  } catch {}
  return tokenFromStoredSession();
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

function shouldTryFallback(status: number, payload: any): boolean {
  const code = String(payload?.code || payload?.error || "").toLowerCase();
  return status === 404 || status === 502 || status === 503 || status === 501 ||
    code.includes("binding") || code.includes("unavailable") || code.includes("not_configured");
}

async function requestDirect(path = "", init: RequestInit = {}): Promise<any> {
  const token = await readAnyAccessToken();
  if (!token) throw new Error("Session utilisateur absente. Reconnecte-toi avant une sauvegarde Cloud R2.");

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const candidates = [`${DIRECT_BASE}${path}`, `${FALLBACK_BASE}${path}`];
  let lastError: Error | null = null;

  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const response = await fetchWithTimeout(candidates[i], { ...init, headers });
      const text = await response.text().catch(() => "");
      const payload = safeJson(text) ?? (text ? { message: text } : null);
      if (response.ok && payload?.ok === true) return payload;
      if (response.ok && i === 0) {
        lastError = new Error("La Function Cloudflare R2 n'est pas déployée sur cette route.");
        continue;
      }
      const error = new Error(String(payload?.message || payload?.error || `Cloud R2 HTTP ${response.status}`));
      (error as any).status = response.status;
      lastError = error;
      if (i === 0 && shouldTryFallback(response.status, payload)) continue;
      throw error;
    } catch (error: any) {
      lastError = error?.name === "AbortError"
        ? new Error("Le stockage Cloud R2 n’a pas répondu en moins de 8 secondes.")
        : error instanceof Error ? error : new Error(String(error));
      if (i === 0) continue;
    }
  }
  throw lastError || new Error("Stockage Cloud R2 indisponible.");
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
