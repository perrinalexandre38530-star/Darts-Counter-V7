import { supabase } from "./supabaseClient";
import { readNasAccessToken } from "./apiClient";
import type { CloudObjectIndexItem } from "./cloudStorageApi";

/**
 * Route Cloudflare Pages Function, liée directement au bucket R2.
 * IMPORTANT : aucune solution de repli vers le NAS n'est autorisée ici.
 * Une sauvegarde R2 ne doit jamais dépendre du domaine public du NAS.
 */
const DIRECT_BASE = "/api/storage/backups";
const REQUEST_TIMEOUT_MS = 8_000;

export type DirectBackupSummary = Record<string, any>;

export type DirectR2Status = {
  ok: boolean;
  route?: string;
  binding?: string;
  bucketReady?: boolean;
  supabaseAuthConfigured?: boolean;
  nasJwtConfigured?: boolean;
  acceptedAuthModes?: string[];
  code?: string;
  error?: string;
  message?: string;
};

export type DirectR2Usage = {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  percentUsed: number;
  planId: string;
  billingStatus: string;
  billingExempt: boolean;
  planSource?: string;
  retainedBackups: number;
  retentionTotal: number;
};

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

type DirectStorageToken = {
  token: string;
  kind: "supabase" | "nas" | "none";
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

function isJwtLike(token: string): boolean {
  const parts = String(token || "").split(".");
  return parts.length === 3 && !!decodeJwtPayload(token)?.sub;
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
    "dc-supabase-auth-v2:rckbdaqksujehszafior",
  ];

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i) || "";
      if ((/^sb-.*-auth-token$/i.test(key) || /^dc-supabase-auth-v2:/i.test(key)) && !keys.includes(key)) keys.push(key);
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

/**
 * R2 accepte deux modes d'authentification indépendants :
 * - JWT Supabase, vérifié directement par la Pages Function ;
 * - JWT NAS, vérifié localement dans la Pages Function avec JWT_SECRET.
 *
 * Le second mode permet au compte fondateur de sauvegarder sur R2 même si
 * PostgreSQL, l'API NAS ou le tunnel sont indisponibles.
 */
async function readDirectStorageToken(): Promise<DirectStorageToken> {
  // Pour un compte NAS/fondateur, le JWT NAS est prioritaire : son `sub`
  // correspond directement à l'identifiant canonique du compte et évite toute
  // confusion avec une ancienne session Supabase d'un autre utilisateur.
  const nasToken = String(readNasAccessToken() || "").trim();
  if (nasToken && isJwtLike(nasToken)) return { token: nasToken, kind: "nas" };

  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 900)),
    ]);
    const token = String((result as any)?.data?.session?.access_token || "").trim();
    if (token && isSupabaseAccessToken(token)) return { token, kind: "supabase" };
  } catch {}

  const storedSupabase = tokenFromStoredSupabaseSession();
  if (storedSupabase) return { token: storedSupabase, kind: "supabase" };

  return { token: "", kind: "none" };
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

function conciseR2Error(status: number, payload: any, rawText: string, tokenKind: DirectStorageToken["kind"] = "none"): Error {
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || payload?.error || "").trim();

  if (code === "r2_binding_missing") {
    return new Error("Cloud R2 non relié au projet Cloudflare Pages. Le binding USER_DATA_BUCKET doit pointer vers multisports-user-data, puis le projet doit être redéployé.");
  }
  if (code === "nas_jwt_secret_missing") {
    return new Error("Le JWT NAS ne peut pas être vérifié par Cloudflare Pages : ajoute le secret JWT_SECRET avec exactement la même valeur que sur le backend NAS, puis redéploie Pages.");
  }
  if (code === "supabase_auth_not_configured") {
    return new Error("Les variables SUPABASE_URL et SUPABASE_ANON_KEY manquent dans Cloudflare Pages.");
  }
  if (status === 401) {
    return new Error(tokenKind === "nas"
      ? "Le JWT NAS a été refusé par Cloudflare Pages. Vérifie que le secret JWT_SECRET de Pages est identique à celui du backend NAS."
      : "Session Cloud expirée ou invalide. Reconnecte le compte puis relance la sauvegarde R2.");
  }
  if (status === 413) {
    return new Error(message || "Sauvegarde trop volumineuse ou quota Cloud R2 dépassé.");
  }
  if (/<!doctype|<html/i.test(rawText)) {
    return new Error("La route Cloudflare Pages de sauvegarde R2 ne répond pas correctement. Aucun appel au tunnel NAS n'a été effectué.");
  }
  return new Error(message || `Cloud R2 HTTP ${status}`);
}

async function requestDirect(path = "", init: RequestInit = {}, allowAnonymous = false): Promise<any> {
  const auth = allowAnonymous ? { token: "", kind: "none" as const } : await readDirectStorageToken();
  if (!allowAnonymous && !auth.token) {
    throw new Error("Aucune session Cloud ou NAS exploitable. Reconnecte le compte une fois. Les sauvegardes Local et Fichier restent disponibles hors ligne.");
  }

  const headers = new Headers(init.headers || {});
  if (auth.token) headers.set("Authorization", `Bearer ${auth.token}`);
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
  throw conciseR2Error(response.status, payload, text, auth.kind);
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

export async function getDirectR2Status(): Promise<DirectR2Status> {
  try {
    const response = await fetchWithTimeout(`${DIRECT_BASE}/status`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const text = await response.text().catch(() => "");
    const payload = safeJson(text);
    if (payload && typeof payload === "object") return payload as DirectR2Status;
    return {
      ok: false,
      code: "invalid_status_response",
      error: /<!doctype|<html/i.test(text)
        ? "La route de diagnostic R2 renvoie une page HTML au lieu de JSON."
        : `Réponse de diagnostic R2 invalide (HTTP ${response.status}).`,
    };
  } catch (error: any) {
    return {
      ok: false,
      code: error?.name === "AbortError" ? "status_timeout" : "status_unreachable",
      error: error?.name === "AbortError"
        ? "Le diagnostic Cloudflare Pages/R2 n'a pas répondu en moins de 8 secondes."
        : String(error?.message || error || "Diagnostic R2 inaccessible."),
    };
  }
}

export async function createDirectR2Backup(args: {
  snapshotJson: string;
  title?: string;
  summary?: DirectBackupSummary;
  metadata?: Record<string, any>;
}): Promise<{ ok: boolean; object: CloudObjectIndexItem; previousObject?: CloudObjectIndexItem | null; usage?: DirectR2Usage; cleaned?: number; cleanupPending?: number; plan?: any }> {
  const payload = await requestDirect("", {
    method: "POST",
    body: JSON.stringify({
      snapshotJson: args.snapshotJson,
      title: args.title,
      summary: args.summary || {},
      metadata: args.metadata || {},
    }),
  });
  return {
    ok: true,
    object: toCloudItem(payload?.backup || payload?.object || {}),
    previousObject: payload?.previousBackup ? toCloudItem(payload.previousBackup) : null,
    usage: payload?.usage || undefined,
    cleaned: Number(payload?.cleaned || 0),
    cleanupPending: Number(payload?.cleanupPending || 0),
    plan: payload?.plan || undefined,
  };
}

export async function getDirectR2Usage(): Promise<DirectR2Usage> {
  const payload = await requestDirect("/usage", { method: "GET" });
  return payload?.usage || {
    usedBytes: 0, quotaBytes: 0, remainingBytes: 0, percentUsed: 0,
    planId: "free_test_100mb", billingStatus: "free", billingExempt: false,
    retainedBackups: 0, retentionTotal: 2,
  };
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
