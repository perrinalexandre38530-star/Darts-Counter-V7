// ============================================================
// src/lib/nasApi.ts
// Client NAS final
// - Auth JWT
// - Profil utilisateur
// - Avatar compte
// - Snapshot store (push/pull)
// - Gestion compte
//
// ✅ PATCH FINAL
// - persiste AUSSI une session auth complète compatible onlineApi
// - extraction token beaucoup plus robuste
// - force la restauration de session avant profils/sync
// ============================================================

import type { AuthSession, LoginPayload, SignupPayload, UpdateProfilePayload } from "./onlineApi";
import type { OnlineProfile, UserAuth } from "./onlineTypes";
import { NAS_API_URL } from "./serverConfig";
import { runtimeDiag } from "./runtimeDiag";

export function isNasSyncEnabled(): boolean {
  return !!NAS_API_URL;
}

const NAS_TOKEN_KEY = "dc_nas_access_token_v1";
const NAS_REFRESH_KEY = "dc_nas_refresh_token_v1";
const NAS_AUTH_SESSION_KEY = "dc_online_auth_supabase_v1";

function now() {
  return Date.now();
}

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLs(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {}
}

function readLs(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function dispatchAuthChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("dc-auth-changed"));
  } catch {}
}

function authToken(): string {
  return readLs(NAS_TOKEN_KEY);
}

async function apiFetchWithFallback(paths: string[], init?: RequestInit): Promise<any> {
  let lastError: any = null;
  for (const path of paths) {
    try {
      return await apiFetch(path, init);
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || "");
      if (!/404|not found|introuvable/i.test(msg)) throw err;
    }
  }
  throw lastError || new Error("Endpoint NAS introuvable.");
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra || {}),
  };
  const token = authToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

type NasFetchInit = RequestInit & { timeoutMs?: number };

async function apiFetch(path: string, init?: NasFetchInit): Promise<any> {
  if (!NAS_API_URL) {
    throw new Error("VITE_NAS_API_URL manquant.");
  }

  const url = `${NAS_API_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const timeoutMs = Math.max(0, Number((init as any)?.timeoutMs ?? 0) || 0);
  const ctrl = timeoutMs > 0 ? new AbortController() : null;
  const timer = ctrl
    ? window.setTimeout(() => {
        try {
          ctrl.abort(new DOMException("timeout", "AbortError"));
        } catch {
          ctrl.abort();
        }
      }, timeoutMs)
    : null;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: ctrl?.signal ?? init?.signal,
      headers: {
        ...authHeaders(),
        ...((init?.headers as Record<string, string> | undefined) || {}),
      },
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    const aborted = e?.name === "AbortError" || /abort|timeout/i.test(msg);
    if (aborted && timeoutMs > 0) {
      throw new Error(`Backend NAS trop lent (timeout ${timeoutMs}ms).`);
    }
    throw new Error(e?.message || "Backend NAS injoignable.");
  } finally {
    if (timer) window.clearTimeout(timer);
  }

  const text = await res.text();
  const json = readJson<any>(text, {});

  if (!res.ok) {
    const message = json?.error || json?.message || text || `Erreur backend NAS (${res.status})`;
    if (res.status === 401) {
      runtimeDiag("nas:http401", { path, message });
    }
    const err: any = new Error(message);
    err.status = res.status;
    err.path = path;
    throw err;
  }

  return json;
}

function normalizeUser(raw: any, fallbackEmail?: string): UserAuth {
  const id = String(raw?.id || raw?.userId || raw?.user_id || raw?.uid || raw?.sub || "");
  const email = raw?.email || fallbackEmail || undefined;
  const nickname =
    String(
      raw?.nickname ||
        raw?.displayName ||
        raw?.display_name ||
        raw?.name ||
        (email ? String(email).split("@")[0] : "") ||
        "Player"
    ) || "Player";

  return {
    id,
    email,
    nickname,
    createdAt:
      typeof raw?.createdAt === "number"
        ? raw.createdAt
        : raw?.created_at
          ? Date.parse(raw.created_at)
          : now(),
  };
}

function normalizeProfile(raw: any, user: UserAuth): OnlineProfile | null {
  if (!raw && !user?.id) return null;
  const statsRaw = raw?.stats || raw?.summaryStats || raw?.profileStats || {};

  const displayName = String(
    raw?.displayName ||
      raw?.display_name ||
      raw?.nickname ||
      raw?.name ||
      raw?.username ||
      raw?.surname ||
      user.nickname ||
      "Player"
  );

  const nickname = String(
    raw?.nickname ||
      raw?.displayName ||
      raw?.display_name ||
      raw?.name ||
      raw?.username ||
      raw?.surname ||
      user.nickname ||
      "Player"
  );

  return {
    id: String(raw?.id || user.id || ""),
    userId: String(raw?.userId || raw?.user_id || user.id || ""),
    displayName,
    nickname: nickname as any,
    avatarUrl:
      raw?.avatarDataUrl ||
      raw?.avatar_data_url ||
      raw?.avatar ||
      raw?.avatarUrl ||
      raw?.avatar_url ||
      undefined,
    country: raw?.country || raw?.pays || null,
    countryCode: raw?.countryCode || raw?.country_code || null,

    surname: raw?.surname ?? raw?.nickname ?? raw?.displayName ?? raw?.display_name ?? "",
    firstName: raw?.firstName ?? raw?.first_name ?? raw?.prenom ?? "",
    lastName: raw?.lastName ?? raw?.last_name ?? raw?.nom ?? "",
    birthDate: raw?.birthDate ?? raw?.birth_date ?? raw?.date_de_naissance ?? null,
    city: raw?.city ?? raw?.ville ?? "",
    email: raw?.email ?? user.email ?? "",
    phone: raw?.phone ?? raw?.telephone ?? "",
    preferences: raw?.preferences ?? raw?.prefs ?? {},
    privateInfo: raw?.privateInfo ?? raw?.private_info ?? {},

    bio: raw?.bio || undefined,
    stats: {
      totalMatches: Number(statsRaw?.totalMatches || statsRaw?.total_matches || 0),
      totalLegs: Number(statsRaw?.totalLegs || statsRaw?.total_legs || 0),
      avg3: Number(statsRaw?.avg3 || statsRaw?.avg_3 || 0),
      bestVisit: Number(statsRaw?.bestVisit || statsRaw?.best_visit || 0),
      bestCheckout: Number(statsRaw?.bestCheckout || statsRaw?.best_checkout || 0),
    },
    updatedAt:
      typeof raw?.updatedAt === "number"
        ? raw.updatedAt
        : raw?.updated_at
          ? Date.parse(raw.updated_at)
          : now(),
  } as any;
}

function buildSessionFromResponse(json: any, fallbackEmail?: string): AuthSession {
  const token =
    String(
      json?.token ||
        json?.accessToken ||
        json?.access_token ||
        json?.jwt ||
        json?.access ||
        json?.session?.token ||
        json?.session?.accessToken ||
        json?.session?.access_token ||
        json?.data?.token ||
        json?.data?.accessToken ||
        json?.data?.access_token ||
        json?.data?.session?.token ||
        json?.data?.session?.accessToken ||
        json?.data?.session?.access_token ||
        ""
    ) || "";

  const refreshToken =
    String(
      json?.refreshToken ||
        json?.refresh_token ||
        json?.session?.refreshToken ||
        json?.session?.refresh_token ||
        json?.data?.refreshToken ||
        json?.data?.refresh_token ||
        json?.data?.session?.refreshToken ||
        json?.data?.session?.refresh_token ||
        ""
    ) || "";

  const user = normalizeUser(
    json?.user || json?.account || json?.me?.user || json?.data?.user || json?.data || json,
    fallbackEmail
  );
  const profile = normalizeProfile(
    json?.profile || json?.me?.profile || json?.user?.profile || json?.data?.profile || null,
    user
  );

  const resolvedUser: UserAuth = profile
    ? {
        ...user,
        nickname:
          String(
            (profile as any)?.displayName ||
              (profile as any)?.nickname ||
              user.nickname ||
              (user.email ? String(user.email).split("@")[0] : "Player")
          ) || user.nickname,
      }
    : user;

  return {
    token,
    refreshToken,
    expiresAt:
      typeof json?.expiresAt === "number"
        ? json.expiresAt
        : json?.expires_at
          ? Date.parse(json.expires_at)
          : json?.data?.expires_at
            ? Date.parse(json.data.expires_at)
            : null,
    userId: resolvedUser.id || null,
    user: resolvedUser,
    profile,
  };
}

export function saveNasTokens(session: AuthSession | null, opts?: { silent?: boolean }) {
  const prevRaw = readLs(NAS_AUTH_SESSION_KEY);
  const prev = readJson<AuthSession | null>(prevRaw, null);
  const nextRaw = session ? JSON.stringify(session) : "";

  writeLs(NAS_TOKEN_KEY, session?.token || null);
  writeLs(NAS_REFRESH_KEY, session?.refreshToken || null);
  writeLs(NAS_AUTH_SESSION_KEY, session ? nextRaw : null);

  if (opts?.silent) return;

  const prevToken = String(prev?.token || "");
  const nextToken = String(session?.token || "");
  const prevUserId = String(prev?.user?.id || prev?.userId || "");
  const nextUserId = String(session?.user?.id || session?.userId || "");
  const changed = prevRaw !== nextRaw || prevToken !== nextToken || prevUserId !== nextUserId;
  if (changed) dispatchAuthChanged();
}

export async function nasLogin(payload: LoginPayload): Promise<AuthSession> {
  const json = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      nickname: payload.nickname,
    }),
  });
  const session = buildSessionFromResponse(json, payload.email);
  if (!session.token) {
    console.warn("[nasApi] login response without token", json);
    throw new Error("Réponse login NAS invalide : token absent.");
  }
  saveNasTokens(session);
  return session;
}

export async function nasSignup(payload: SignupPayload): Promise<AuthSession> {
  const json = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      nickname: payload.nickname,
    }),
  });
  const session = buildSessionFromResponse(json, payload.email);
  if (!session.token) {
    console.warn("[nasApi] signup response without token", json);
    throw new Error("Réponse inscription NAS invalide : token absent.");
  }
  saveNasTokens(session);
  return session;
}

export async function nasRestoreSession(opts?: { timeoutMs?: number }): Promise<AuthSession | null> {
  const cached = readJson<AuthSession | null>(readLs(NAS_AUTH_SESSION_KEY), null);

  let token = authToken();
  if (!token && cached?.token) {
    writeLs(NAS_TOKEN_KEY, cached.token);
    writeLs(NAS_REFRESH_KEY, cached.refreshToken || null);
    token = cached.token;
  }
  if (!token) return null;

  try {
    const json = await apiFetch("/auth/me", { method: "GET", timeoutMs: opts?.timeoutMs ?? 2200 });
    const probe = buildSessionFromResponse(json, json?.user?.email);
    const session = buildSessionFromResponse(
      {
        ...json,
        token: probe.token || token,
        refreshToken: probe.refreshToken || readLs(NAS_REFRESH_KEY) || cached?.refreshToken || "",
      },
      json?.user?.email
    );
    if (!session.token) session.token = token;
    saveNasTokens(session, { silent: true });
    return session;
  } catch (e: any) {
    const status = Number(e?.status || 0) || null;
    const message = String(e?.message || e || "restoreSession failed");
    runtimeDiag("nas:restoreSession:error", { status, message, hadCached: !!cached?.token });
    if (status === 401 || /session invalide|token|unauthorized|401/i.test(message)) {
      saveNasTokens(null, { silent: true });
      runtimeDiag("nas:restoreSession:cleared_invalid_session", { message });
      return null;
    }
    console.warn("[nasApi] restoreSession failed", e);
    saveNasTokens(null, { silent: true });
    return null;
  }
}

export async function nasLogout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {}
  saveNasTokens(null);
}

export async function nasGetProfile(): Promise<OnlineProfile | null> {
  const session0 = await nasRestoreSession();
  if (!session0?.token) throw new Error("Token NAS manquant. Reconnecte-toi.");

  const json = await apiFetch("/profiles/me", { method: "GET" }).catch(async () => {
    const fallback = await apiFetch("/auth/me", { method: "GET" });
    return fallback;
  });
  const session = buildSessionFromResponse(
    {
      ...json,
      token: authToken(),
      refreshToken: readLs(NAS_REFRESH_KEY),
    },
    json?.user?.email
  );
  if (session?.token) saveNasTokens(session, { silent: true });
  return session.profile;
}

export async function nasUpdateProfile(patch: UpdateProfilePayload): Promise<OnlineProfile> {
  const session0 = await nasRestoreSession();
  if (!session0?.token) throw new Error("Token NAS manquant. Reconnecte-toi.");

  const json = await apiFetch("/profiles/me", {
    method: "PUT",
    body: JSON.stringify(patch),
  });

  const user = normalizeUser(json?.user || json, undefined);
  const profile = normalizeProfile(json?.profile || json, user);
  if (!profile) throw new Error("Réponse profil NAS invalide.");

  saveNasTokens({
    ...session0,
    profile,
  });

  return profile;
}

export async function nasRequestPasswordReset(email: string): Promise<void> {
  await apiFetch("/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function nasChangePassword(newPassword: string): Promise<void> {
  const session0 = await nasRestoreSession();
  if (!session0?.token) throw new Error("Token NAS manquant. Reconnecte-toi.");

  const pw = String(newPassword || "").trim();
  if (pw.length < 6) throw new Error("Mot de passe trop court (min. 6 caractères).");

  await apiFetchWithFallback([
    "/auth/password",
    "/auth/change-password",
    "/auth/update-password",
  ], {
    method: "PUT",
    body: JSON.stringify({ password: pw, newPassword: pw }),
  });
}

export async function nasUpdateEmail(newEmail: string): Promise<void> {
  const session0 = await nasRestoreSession();
  if (!session0?.token) throw new Error("Token NAS manquant. Reconnecte-toi.");

  await apiFetch("/auth/email", {
    method: "PUT",
    body: JSON.stringify({ email: newEmail }),
  });
}

export async function nasDeleteAccount(): Promise<void> {
  const session0 = await nasRestoreSession();
  if (!session0?.token) throw new Error("Token NAS manquant. Reconnecte-toi.");

  await apiFetch("/auth/account", { method: "DELETE" });
  saveNasTokens(null);
}

export async function nasUploadAvatarImage(opts: { dataUrl: string; folder?: string; updateProfile?: boolean }): Promise<{ publicUrl: string; path: string }> {
  const session0 = await nasRestoreSession();
  if (!session0?.token) throw new Error("Token NAS manquant. Reconnecte-toi.");

  const json = await apiFetch("/profiles/avatar", {
    method: "POST",
    body: JSON.stringify({ dataUrl: opts.dataUrl }),
  });
  return {
    publicUrl: String(json?.publicUrl || json?.avatarUrl || json?.avatar_data_url || ""),
    path: String(json?.path || json?.profile?.id || "avatar-data-url"),
  };
}


const NAS_PUSH_MIN_INTERVAL_MS = 8000;
const NAS_PUSH_MAX_BACKOFF_MS = 120000;
let nasPushInFlight = false;
let nasPushLastAttemptAt = 0;
let nasPushFailureCount = 0;
let nasPushBlockedUntil = 0;
let nasPushLastWarnAt = 0;


function summarizeSnapshotForDiag(payload: any) {
  try {
    const root = payload && typeof payload === "object" ? payload : {};
    const store = root.store && typeof root.store === "object" ? root.store : root;
    const profiles = Array.isArray((store as any)?.profiles) ? (store as any).profiles.length : 0;
    const bots = Array.isArray((store as any)?.bots) ? (store as any).bots.length : 0;
    const dartSets = Array.isArray((store as any)?.dartSets) ? (store as any).dartSets.length : 0;
    const history = Array.isArray((store as any)?.history) ? (store as any).history.length : 0;
    return { profiles, bots, dartSets, history, keys: Object.keys(store || {}).slice(0, 12) };
  } catch {
    return { profiles: 0, bots: 0, dartSets: 0, history: 0, keys: [] as string[] };
  }
}

function logNasPushSkip(kind: "blocked" | "inflight" | "throttled", extra?: Record<string, any>) {
  const now = Date.now();
  if (now - nasPushLastWarnAt < 5000) return;
  nasPushLastWarnAt = now;
  try {
    console.warn(`[nasSync] push skipped (${kind})`, extra || {});
  } catch {}
}

export async function nasPullStoreSnapshot(): Promise<{
  status: "ok" | "not_found" | "error";
  payload?: any;
  updatedAt?: string | null;
  version?: number | null;
  error?: any;
}> {
  try {
    const session0 = await nasRestoreSession();
    if (!session0?.token) throw new Error("Token NAS manquant. Reconnecte-toi.");

    const json = await apiFetch("/sync/pull", { method: "GET" });
    const payload = json?.payload ?? json?.storeSnapshot ?? json?.store ?? json?.data ?? null;
    if (payload == null) {
      try { console.log("[nasSync] pull not_found", { updatedAt: json?.updatedAt || json?.updated_at || null, version: json?.version ?? null }); } catch {}
      return { status: "not_found", payload: null, updatedAt: null, version: null };
    }
    const result = {
      status: "ok" as const,
      payload,
      updatedAt: json?.updatedAt || json?.updated_at || null,
      version: Number(json?.version ?? 1),
    };
    try { console.log("[nasSync] pull success", { updatedAt: result.updatedAt, version: result.version, summary: summarizeSnapshotForDiag(payload) }); } catch {}
    return result;
  } catch (e) {
    try { console.warn("[nasSync] pull failed", e); } catch {}
    runtimeDiag("nas:pull:error", { message: String((e as any)?.message || e), status: Number((e as any)?.status || 0) || null });
    return { status: "error", error: e };
  }
}

export async function nasPushStoreSnapshot(payload: any, version = 8): Promise<{ ok: boolean; version: number; updatedAt?: string | null; verify?: { status: string; updatedAt?: string | null; version?: number | null; summary?: any } }> {
  const now = Date.now();

  if (nasPushBlockedUntil && now < nasPushBlockedUntil) {
    logNasPushSkip("blocked", { waitMs: nasPushBlockedUntil - now, failures: nasPushFailureCount });
    return;
  }

  if (nasPushInFlight) {
    logNasPushSkip("inflight");
    return;
  }

  const sinceLastAttempt = now - nasPushLastAttemptAt;
  if (nasPushLastAttemptAt && sinceLastAttempt < NAS_PUSH_MIN_INTERVAL_MS) {
    logNasPushSkip("throttled", { waitMs: NAS_PUSH_MIN_INTERVAL_MS - sinceLastAttempt });
    return;
  }

  nasPushInFlight = true;
  nasPushLastAttemptAt = now;
  try {
    const session0 = await nasRestoreSession();
    if (!session0?.token) throw new Error("Token NAS manquant. Reconnecte-toi.");

    const pushRes = await apiFetch("/sync/push", {
      method: "POST",
      body: JSON.stringify({ payload, version }),
    });

    nasPushFailureCount = 0;
    nasPushBlockedUntil = 0;

    let verify: any = null;
    try {
      const pulled = await apiFetch("/sync/pull", { method: "GET" });
      const pulledPayload = pulled?.payload ?? pulled?.storeSnapshot ?? pulled?.store ?? pulled?.data ?? null;
      verify = {
        status: pulledPayload == null ? "not_found" : "ok",
        updatedAt: pulled?.updatedAt || pulled?.updated_at || null,
        version: Number(pulled?.version ?? version),
        summary: summarizeSnapshotForDiag(pulledPayload),
      };
    } catch (verifyErr) {
      verify = { status: "error", error: String((verifyErr as any)?.message || verifyErr) };
    }

    try {
      console.log("[nasSync] push success", {
        version,
        updatedAt: pushRes?.updatedAt || pushRes?.updated_at || null,
        summary: summarizeSnapshotForDiag(payload),
        verify,
      });
    } catch {}
    return {
      ok: true,
      version,
      updatedAt: pushRes?.updatedAt || pushRes?.updated_at || null,
      verify,
    };
  } catch (e) {
    nasPushFailureCount += 1;
    const backoffMs = Math.min(NAS_PUSH_MAX_BACKOFF_MS, Math.max(NAS_PUSH_MIN_INTERVAL_MS, 5000 * (2 ** Math.max(0, nasPushFailureCount - 1))));
    nasPushBlockedUntil = Date.now() + backoffMs;
    console.warn("[nasSync] /sync/push failed -> backoff", { failures: nasPushFailureCount, backoffMs, error: e });
    throw e;
  } finally {
    nasPushInFlight = false;
  }
}

export const nasApi = {
  isEnabled: isNasSyncEnabled,
  login: nasLogin,
  signup: nasSignup,
  restoreSession: nasRestoreSession,
  logout: nasLogout,
  getProfile: nasGetProfile,
  updateProfile: nasUpdateProfile,
  requestPasswordReset: nasRequestPasswordReset,
  changePassword: nasChangePassword,
  updateEmail: nasUpdateEmail,
  deleteAccount: nasDeleteAccount,
  uploadAvatarImage: nasUploadAvatarImage,
  pullStoreSnapshot: nasPullStoreSnapshot,
  pushStoreSnapshot: nasPushStoreSnapshot,
};

export function normalizeNasProfile(raw:any){
  if(!raw) return raw;
  const avatarDataUrl = raw.avatarDataUrl || raw.avatar_data_url || raw.avatar || raw.avatarUrl || raw.avatar_url || null;
  const name = raw.name || raw.displayName || raw.display_name || raw.nickname || raw.username || null;
  return {
    ...raw,
    name,
    displayName: name,
    avatarDataUrl,
  };
}