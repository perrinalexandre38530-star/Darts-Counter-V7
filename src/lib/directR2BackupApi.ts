import { supabase } from "./supabaseClient";
import { readNasAccessToken } from "./apiClient";
import type { CloudObjectIndexItem } from "./cloudStorageApi";
import { isPaidCloudPlanId, loadStoragePrefs, type StoragePlanId } from "./storagePlans";
import {
  isFreshSupabaseAccessToken,
  isJwtFresh,
} from "./authSessionGuard";

/**
 * Route Cloudflare Pages Function, liée directement au bucket R2.
 * IMPORTANT : aucune solution de repli vers le NAS n'est autorisée ici.
 * Une sauvegarde R2 ne doit jamais dépendre du domaine public du NAS.
 */
const DIRECT_BASE = (() => {
  if (typeof window === "undefined") return "/api/storage/backups";
  const host = String(window.location.hostname || "").toLowerCase();
  const protocol = String(window.location.protocol || "").toLowerCase();
  const isNativeWebView = host === "localhost" || host === "127.0.0.1" || protocol === "capacitor:";
  return isNativeWebView
    ? "https://multisports-scoring.pages.dev/api/storage/backups"
    : "/api/storage/backups";
})();
const REQUEST_TIMEOUT_READ_MS = 15_000;
const REQUEST_TIMEOUT_MUTATION_MS = 25_000;
const REQUEST_TIMEOUT_DOWNLOAD_MS = 45_000;
const REQUEST_TIMEOUT_UPLOAD_MS = 60_000;

// Les médias sont nombreux et partagent un manifeste R2 unique. On évite les
// rafales, et surtout on ne ré-uploade pas un média déjà à jour.
const MEDIA_UPLOAD_MAX_ATTEMPTS = 4;
const MEDIA_UPLOAD_RETRY_BASE_MS = 350;
const MEDIA_MANIFEST_CACHE_MS = 30_000;
let mediaUploadTail: Promise<void> = Promise.resolve();
let mediaManifestCache: DirectR2MediaManifest | null = null;
let mediaManifestCacheAt = 0;
let mediaManifestPromise: Promise<DirectR2MediaManifest | null> | null = null;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
}

function enqueueR2MediaUpload<T>(task: () => Promise<T>): Promise<T> {
  const run = mediaUploadTail.then(task, task);
  mediaUploadTail = run.then(() => undefined, () => undefined);
  return run;
}

function transientR2Status(error: any): boolean {
  const status = Number(error?.status || 0);
  return status === 500 || status === 502 || status === 503 || status === 504;
}

export type DirectBackupSummary = Record<string, any>;


export type DirectR2MediaFallback = {
  version?: number;
  key: string;
  kind?: string;
  dataUrl: string;
  updatedAt?: string | null;
  updatedAtMs?: number | null;
  sourceUrl?: string | null;
};

export type DirectR2AvatarFallback = {
  version?: number;
  profileId: string;
  dataUrl: string;
  avatarUpdatedAt?: number | null;
  avatarAssetId?: string | null;
  updatedAt?: string | null;
};

export type DirectR2NasUserMirror = {
  version?: number;
  kind?: string;
  createdAt?: string | null;
  user?: any;
  profile?: any;
  storeSnapshot?: { payload?: any; data?: any; version?: number; updatedAt?: string | null; store?: string } | null;
  relatedTables?: Record<string, any[]>;
};

export type DirectR2MediaManifest = {
  version?: number;
  userId?: string;
  updatedAt?: string | null;
  media?: Record<string, { key: string; kind?: string; sizeBytes?: number; checksum?: string; updatedAtMs?: number; sourceUrl?: string | null }>;
};

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
  writeAllowed?: boolean;
  premiumRequired?: boolean;
};

export type DirectR2CheckoutResult = {
  ok: boolean;
  url?: string;
  sessionId?: string;
  planId?: string;
  interval?: "monthly" | "yearly" | string;
  message?: string;
  error?: string;
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

const DIRECT_R2_USAGE_CACHE_KEY = "dc_direct_r2_usage_v2";
const DIRECT_R2_USAGE_CACHE_MS = 60_000;

function isActiveBillingStatus(value: any): boolean {
  return ["active", "trialing"].includes(String(value || "").toLowerCase());
}

export function isDirectR2PremiumWriteAllowed(usage: DirectR2Usage | null | undefined): boolean {
  if (!usage) return false;
  return isPaidCloudPlanId(usage.planId) && isActiveBillingStatus(usage.billingStatus);
}

function readCachedDirectR2Usage(): DirectR2Usage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DIRECT_R2_USAGE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.usage || Date.now() - Number(parsed.at || 0) > DIRECT_R2_USAGE_CACHE_MS) return null;
    return parsed.usage as DirectR2Usage;
  } catch { return null; }
}

function cacheDirectR2Usage(usage: DirectR2Usage): DirectR2Usage {
  const normalized = {
    ...usage,
    writeAllowed: isDirectR2PremiumWriteAllowed(usage),
    premiumRequired: !isDirectR2PremiumWriteAllowed(usage),
  };
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(DIRECT_R2_USAGE_CACHE_KEY, JSON.stringify({ at: Date.now(), usage: normalized }));
  } catch {}
  return normalized;
}

async function ensureDirectR2WriteAllowed(opts?: { requireCloudDestination?: boolean }): Promise<DirectR2Usage> {
  if (opts?.requireCloudDestination !== false) {
    const selected = loadStoragePrefs().selectedDestination;
    if (selected !== "cloud_r2") {
      const error = new Error("Cloud R2 n'est pas la destination active : aucune écriture R2 n'a été effectuée.");
      (error as any).code = "r2_destination_inactive";
      throw error;
    }
  }
  const usage = readCachedDirectR2Usage() || await getDirectR2Usage();
  if (!isDirectR2PremiumWriteAllowed(usage)) {
    const error = new Error("Sauvegarde Cloud R2 réservée aux offres PREMIUM. Choisis une offre cloud payante ou utilise Local / fichier / USB / SD / cloud personnel gratuitement.");
    (error as any).code = "premium_required";
    (error as any).status = 402;
    throw error;
  }
  return usage;
}

function safeJson(raw: string): any {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function isJwtLike(token: string): boolean {
  return isJwtFresh(String(token || ""), 5_000);
}

function isSupabaseAccessToken(token: string): boolean {
  return isFreshSupabaseAccessToken(String(token || ""), 30_000);
}

function tokenFromStoredSupabaseSession(): string {
  if (typeof window === "undefined") return "";
  const keys = [
    "dc_online_auth_supabase_v1",
    "sb-rckbdaqksujehszafior-auth-token",
    "dc-supabase-auth-v2:rckbdaqksujehszafior",
  ];

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i) || "";
        if ((/^sb-.*-auth-token$/i.test(key) || /^dc-supabase-auth-v2:/i.test(key)) && !keys.includes(key)) keys.push(key);
      }
    } catch {}
  }

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

const DIRECT_AUTH_REJECT_COOLDOWN_MS = 60_000;
let directAuthRejectedUntil = 0;
let directAuthRejectedFingerprint = "";
let directTokenPromise: Promise<DirectStorageToken> | null = null;

function tokenFingerprint(token: string): string {
  const value = String(token || "");
  return value ? `${value.slice(0, 10)}:${value.slice(-12)}` : "";
}

function markDirectAuthRejected(auth: DirectStorageToken): void {
  directAuthRejectedFingerprint = tokenFingerprint(auth.token);
  directAuthRejectedUntil = Date.now() + DIRECT_AUTH_REJECT_COOLDOWN_MS;
}

function isDirectAuthRejected(auth: DirectStorageToken): boolean {
  if (!auth.token || Date.now() >= directAuthRejectedUntil) return false;
  return tokenFingerprint(auth.token) === directAuthRejectedFingerprint;
}

function clearDirectAuthRejectionForNewToken(auth: DirectStorageToken): void {
  if (!auth.token) return;
  if (directAuthRejectedFingerprint && tokenFingerprint(auth.token) !== directAuthRejectedFingerprint) {
    directAuthRejectedFingerprint = "";
    directAuthRejectedUntil = 0;
  }
}

export function canAttemptDirectR2FromStoredSession(): boolean {
  const nasToken = String(readNasAccessToken() || "").trim();
  if (nasToken && isJwtLike(nasToken)) {
    const auth = { token: nasToken, kind: "nas" as const };
    if (!isDirectAuthRejected(auth)) return true;
  }
  const storedSupabase = tokenFromStoredSupabaseSession();
  if (storedSupabase) {
    const auth = { token: storedSupabase, kind: "supabase" as const };
    return !isDirectAuthRejected(auth);
  }
  return false;
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
  if (directTokenPromise) return directTokenPromise;

  directTokenPromise = (async () => {
    // Pour un compte NAS/fondateur, le JWT NAS valide reste prioritaire.
    const nasToken = String(readNasAccessToken() || "").trim();
    if (nasToken && isJwtLike(nasToken)) {
      const auth = { token: nasToken, kind: "nas" as const };
      if (!isDirectAuthRejected(auth)) {
        clearDirectAuthRejectionForNewToken(auth);
        return auth;
      }
    }

    // Évite de réveiller le SDK Supabase (et son refresh réseau) si un access token
    // frais est déjà persisté localement.
    const storedSupabase = tokenFromStoredSupabaseSession();
    if (storedSupabase) {
      const auth = { token: storedSupabase, kind: "supabase" as const };
      clearDirectAuthRejectionForNewToken(auth);
      return auth;
    }

    // Un seul getSession/refresh à la fois pour toute l'application.
    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1_200)),
      ]);
      const token = String((result as any)?.data?.session?.access_token || "").trim();
      if (token && isSupabaseAccessToken(token)) {
        const auth = { token, kind: "supabase" as const };
        clearDirectAuthRejectionForNewToken(auth);
        return auth;
      }
    } catch {}

    return { token: "", kind: "none" as const };
  })().finally(() => {
    directTokenPromise = null;
  });

  return directTokenPromise;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_READ_MS
): Promise<Response> {
  const controller = new AbortController();
  const safeTimeoutMs = Math.max(5_000, Number(timeoutMs) || REQUEST_TIMEOUT_READ_MS);
  const timer = window.setTimeout(() => controller.abort(), safeTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    window.clearTimeout(timer);
  }
}

function timeoutForDirectRequest(path: string, init: RequestInit): number {
  const method = String(init?.method || "GET").toUpperCase();
  const cleanPath = String(path || "");

  // Une sauvegarde complète peut faire plusieurs Mo et Cloudflare doit ensuite
  // calculer le checksum + écrire R2 + mettre à jour le manifeste.
  if (method === "POST" && cleanPath === "") return REQUEST_TIMEOUT_UPLOAD_MS;

  // La restauration télécharge le snapshot complet.
  if (method === "GET" && /^\/r2b_[^/]+$/i.test(cleanPath)) {
    return REQUEST_TIMEOUT_DOWNLOAD_MS;
  }

  // Suppression/restauration depuis corbeille : plus généreux qu'un simple GET.
  if (method !== "GET") return REQUEST_TIMEOUT_MUTATION_MS;

  return REQUEST_TIMEOUT_READ_MS;
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
  if (status === 402 || code === "premium_required") {
    return new Error(message || "Cloud R2 est verrouillé : une offre PREMIUM active est obligatoire pour toute nouvelle écriture.");
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
    const error = new Error("Aucune session Cloud ou NAS exploitable. Reconnecte le compte une fois. Les sauvegardes Local et Fichier restent disponibles hors ligne.");
    (error as any).code = "cloud_session_missing";
    throw error;
  }
  if (!allowAnonymous && isDirectAuthRejected(auth)) {
    const error = new Error("Session Cloud temporairement suspendue après refus d'authentification. Reconnecte le compte.");
    (error as any).status = 401;
    (error as any).code = "cloud_session_rejected";
    throw error;
  }

  const headers = new Headers(init.headers || {});
  if (auth.token) headers.set("Authorization", `Bearer ${auth.token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let response: Response;
  const timeoutMs = timeoutForDirectRequest(path, init);
  try {
    response = await fetchWithTimeout(`${DIRECT_BASE}${path}`, { ...init, headers }, timeoutMs);
  } catch (error: any) {
    if (error?.name === "AbortError") {
      const seconds = Math.max(1, Math.round(timeoutMs / 1000));
      throw new Error(`Cloud R2 n'a pas répondu en moins de ${seconds} secondes.`);
    }
    throw new Error(`Route Cloudflare Pages R2 inaccessible : ${error?.message || String(error)}`);
  }

  const text = await response.text().catch(() => "");
  const payload = safeJson(text);
  if (response.ok && payload?.ok === true) return payload;
  if (response.status === 401 && !allowAnonymous) markDirectAuthRejected(auth);
  const error = conciseR2Error(response.status, payload, text, auth.kind);
  (error as any).status = response.status;
  (error as any).code = String(payload?.code || "");
  throw error;
}

async function readCachedMediaManifest(): Promise<DirectR2MediaManifest | null> {
  const now = Date.now();
  if (mediaManifestCacheAt > 0 && now - mediaManifestCacheAt < MEDIA_MANIFEST_CACHE_MS) return mediaManifestCache;
  if (mediaManifestPromise) return mediaManifestPromise;
  mediaManifestPromise = (async () => {
    try {
      const payload = await requestDirect("/media-manifest", { method: "GET" });
      mediaManifestCache = (payload?.manifest || { version: 2, media: {} }) as DirectR2MediaManifest;
      mediaManifestCacheAt = Date.now();
      return mediaManifestCache;
    } catch {
      // Un échec d'auth ne doit pas relancer /media-manifest pour chaque image.
      mediaManifestCacheAt = Date.now();
      return mediaManifestCache;
    } finally {
      mediaManifestPromise = null;
    }
  })();
  return mediaManifestPromise;
}

function updateCachedMediaManifest(row: any) {
  try {
    const key = String(row?.key || "").trim();
    if (!key) return;
    if (!mediaManifestCache) mediaManifestCache = { version: 2, media: {} };
    if (!mediaManifestCache.media) mediaManifestCache.media = {};
    mediaManifestCache.media[key] = {
      key,
      kind: String(row?.kind || "user_image"),
      sizeBytes: Number(row?.sizeBytes || 0) || undefined,
      checksum: row?.checksum ? String(row.checksum) : undefined,
      updatedAtMs: Number(row?.updatedAtMs || 0) || undefined,
      sourceUrl: row?.sourceUrl ? String(row.sourceUrl) : null,
    };
    mediaManifestCacheAt = Date.now();
  } catch {}
}

export async function isDirectR2MediaFresh(args: { key: string; updatedAt?: number | null }): Promise<boolean> {
  const manifest = await readCachedMediaManifest();
  const row = manifest?.media?.[String(args.key || "")];
  if (!row) return false;
  // user_image:* est adressé par le hash de son contenu : même clé = même image.
  if (String(args.key || "").startsWith("user_image:")) return true;
  const localUpdatedAt = Number(args.updatedAt || 0);
  const remoteUpdatedAt = Number(row?.updatedAtMs || 0);
  return localUpdatedAt > 0 && remoteUpdatedAt >= localUpdatedAt;
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
    }, REQUEST_TIMEOUT_READ_MS);
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
        ? `Le diagnostic Cloudflare Pages/R2 n\'a pas répondu en moins de ${Math.round(REQUEST_TIMEOUT_READ_MS / 1000)} secondes.`
        : String(error?.message || error || "Diagnostic R2 inaccessible."),
    };
  }
}

export async function createDirectR2Backup(args: {
  snapshotJson: string;
  title?: string;
  summary?: DirectBackupSummary;
  metadata?: Record<string, any>;
  /** Autorise une copie R2 explicitement demandée même si la destination principale reste locale/NAS. */
  allowExplicitCloudCopy?: boolean;
}): Promise<{ ok: boolean; object: CloudObjectIndexItem; previousObject?: CloudObjectIndexItem | null; usage?: DirectR2Usage; cleaned?: number; cleanupPending?: number; plan?: any }> {
  await ensureDirectR2WriteAllowed({ requireCloudDestination: args.allowExplicitCloudCopy !== true });
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
    usage: payload?.usage ? cacheDirectR2Usage(payload.usage) : undefined,
    cleaned: Number(payload?.cleaned || 0),
    cleanupPending: Number(payload?.cleanupPending || 0),
    plan: payload?.plan || undefined,
  };
}

export async function getDirectR2Usage(): Promise<DirectR2Usage> {
  const payload = await requestDirect("/usage", { method: "GET" });
  return cacheDirectR2Usage(payload?.usage || {
    usedBytes: 0, quotaBytes: 0, remainingBytes: 0, percentUsed: 0,
    planId: "free_test_100mb", billingStatus: "locked", billingExempt: false,
    retainedBackups: 0, retentionTotal: 2, writeAllowed: false, premiumRequired: true,
  });
}

export async function createDirectR2StorageCheckout(args: {
  planId: StoragePlanId | string;
  interval: "monthly" | "yearly";
  successUrl?: string;
  cancelUrl?: string;
}): Promise<DirectR2CheckoutResult> {
  return requestDirect("/billing/checkout", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function verifyDirectR2StorageCheckout(sessionId: string): Promise<any> {
  const payload = await requestDirect(`/billing/verify?session_id=${encodeURIComponent(String(sessionId || ""))}`, { method: "GET" });
  if (payload?.usage) payload.usage = cacheDirectR2Usage(payload.usage);
  return payload;
}

export async function getDirectR2BillingStatus(verify = false): Promise<any> {
  return requestDirect(`/billing/status${verify ? "?verify=1" : ""}`, { method: "GET" });
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

export async function downloadDirectR2NasUserMirror(): Promise<DirectR2NasUserMirror | null> {
  try {
    const payload = await requestDirect("/mirror/user", { method: "GET" });
    return payload?.mirror && typeof payload.mirror === "object" ? payload.mirror as DirectR2NasUserMirror : null;
  } catch (error: any) {
    if (/introuvable|nas_user_mirror_missing|HTTP 404/i.test(String(error?.message || error || ""))) return null;
    throw error;
  }
}

export async function getDirectR2MediaManifest(): Promise<{ manifest: DirectR2MediaManifest; audit?: any }> {
  const manifest = await readCachedMediaManifest();
  return { manifest: manifest || { version: 2, media: {} } };
}

/**
 * Copie privée d'une miniature d'avatar directement dans Cloudflare R2.
 * Cette route ne traverse jamais le NAS et reste donc disponible pendant une
 * panne du QNAP tant que la session NAS JWT ou Supabase est encore valide.
 */
export async function uploadDirectR2AvatarFallback(args: {
  profileId: string;
  dataUrl: string;
  avatarUpdatedAt?: number | null;
  avatarAssetId?: string | null;
}): Promise<DirectR2AvatarFallback> {
  await ensureDirectR2WriteAllowed({ requireCloudDestination: true });
  const profileId = String(args?.profileId || "").trim();
  const dataUrl = String(args?.dataUrl || "").trim();
  if (!profileId || !dataUrl) throw new Error("Profil ou avatar R2 manquant.");

  const payload = await requestDirect(`/avatar/${encodeURIComponent(profileId)}`, {
    method: "POST",
    body: JSON.stringify({
      dataUrl,
      avatarUpdatedAt: args.avatarUpdatedAt ?? Date.now(),
      avatarAssetId: args.avatarAssetId ?? null,
    }),
  });
  return payload?.avatar || { profileId, dataUrl };
}

export async function downloadDirectR2AvatarFallback(profileIdInput: string): Promise<DirectR2AvatarFallback | null> {
  const profileId = String(profileIdInput || "").trim();
  if (!profileId) return null;
  try {
    const payload = await requestDirect(`/avatar/${encodeURIComponent(profileId)}`, { method: "GET" });
    const avatar = payload?.avatar;
    if (!avatar || !avatar?.dataUrl) return null;
    return avatar as DirectR2AvatarFallback;
  } catch (error: any) {
    // Un profil absent OU une session cloud indisponible ne doit jamais casser l'UI.
    if (/introuvable|avatar_fallback_missing|HTTP 404|session cloud|aucune session cloud|cloud_session_/i.test(String(error?.message || error || ""))) return null;
    if (Number(error?.status || 0) === 401) return null;
    throw error;
  }
}

export async function deleteDirectR2AvatarFallback(profileIdInput: string): Promise<boolean> {
  const profileId = String(profileIdInput || "").trim();
  if (!profileId) return false;
  await requestDirect(`/avatar/${encodeURIComponent(profileId)}`, { method: "DELETE" });
  return true;
}

/**
 * Copie privée générique d'un média utilisateur dans R2.
 * Sert aux photos de sets, logos, couvertures, etc. sans dépendance au NAS.
 */
export async function uploadDirectR2MediaFallback(args: {
  key: string;
  kind?: string;
  dataUrl: string;
  updatedAt?: number | null;
  sourceUrl?: string | null;
}): Promise<DirectR2MediaFallback> {
  await ensureDirectR2WriteAllowed({ requireCloudDestination: true });
  const key = String(args?.key || "").trim();
  const dataUrl = String(args?.dataUrl || "").trim();
  if (!key || !dataUrl) throw new Error("Clé ou média R2 manquant.");

  // Une seule lecture du manifeste suffit pour des centaines de médias. Si R2
  // possède déjà la même version, zéro POST : les sauvegardes suivantes deviennent
  // quasi instantanées côté médias.
  if (await isDirectR2MediaFresh({ key, updatedAt: args.updatedAt })) {
    return { key, kind: args.kind || "user_image", dataUrl, updatedAtMs: args.updatedAt ?? null, sourceUrl: args.sourceUrl ?? null };
  }

  return enqueueR2MediaUpload(async () => {
    // Un média a pu être écrit par une tâche précédente pendant l'attente FIFO.
    if (await isDirectR2MediaFresh({ key, updatedAt: args.updatedAt })) {
      return { key, kind: args.kind || "user_image", dataUrl, updatedAtMs: args.updatedAt ?? null, sourceUrl: args.sourceUrl ?? null };
    }

    let lastError: any = null;
    for (let attempt = 1; attempt <= MEDIA_UPLOAD_MAX_ATTEMPTS; attempt += 1) {
      try {
        const payload = await requestDirect(`/media/${encodeURIComponent(key)}`, {
          method: "POST",
          body: JSON.stringify({
            key,
            kind: args.kind || "user_image",
            dataUrl,
            updatedAt: args.updatedAt ?? Date.now(),
            sourceUrl: args.sourceUrl ?? null,
          }),
        });
        const media = payload?.media || { key, kind: args.kind || "user_image", dataUrl, updatedAtMs: args.updatedAt ?? Date.now(), sourceUrl: args.sourceUrl ?? null };
        updateCachedMediaManifest(media);
        return media;
      } catch (error: any) {
        lastError = error;
        if (!transientR2Status(error) || attempt >= MEDIA_UPLOAD_MAX_ATTEMPTS) throw error;
        await sleepMs(MEDIA_UPLOAD_RETRY_BASE_MS * Math.pow(2, attempt - 1));
      }
    }
    throw lastError || new Error("Écriture média R2 impossible.");
  });
}

export async function downloadDirectR2MediaFallback(keyInput: string): Promise<DirectR2MediaFallback | null> {
  const key = String(keyInput || "").trim();
  if (!key) return null;
  try {
    const payload = await requestDirect(`/media/${encodeURIComponent(key)}`, { method: "GET" });
    const media = payload?.media;
    if (!media?.dataUrl) return null;
    return media as DirectR2MediaFallback;
  } catch (error: any) {
    if (/introuvable|media_fallback_missing|HTTP 404|session cloud|aucune session cloud|cloud_session_/i.test(String(error?.message || error || ""))) return null;
    if (Number(error?.status || 0) === 401) return null;
    throw error;
  }
}

export async function deleteDirectR2MediaFallback(keyInput: string): Promise<boolean> {
  const key = String(keyInput || "").trim();
  if (!key) return false;
  await requestDirect(`/media/${encodeURIComponent(key)}`, { method: "DELETE" });
  return true;
}

