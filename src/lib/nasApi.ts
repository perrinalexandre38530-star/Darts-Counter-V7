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

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra || {}),
  };
  const token = authToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function apiFetch(path: string, init?: RequestInit): Promise<any> {
  if (!NAS_API_URL) {
    throw new Error("VITE_NAS_API_URL manquant.");
  }

  const url = `${NAS_API_URL}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders(),
        ...((init?.headers as Record<string, string> | undefined) || {}),
      },
    });
  } catch (e: any) {
    throw new Error(e?.message || "Backend NAS injoignable.");
  }

  const text = await res.text();
  const json = readJson<any>(text, {});

  if (!res.ok) {
    throw new Error(json?.error || json?.message || text || `Erreur backend NAS (${res.status})`);
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
  return {
    id: String(raw?.id || user.id || ""),
    userId: String(raw?.userId || raw?.user_id || user.id || ""),
    displayName: String(raw?.displayName || raw?.display_name || raw?.name || user.nickname || "Player"),
    avatarUrl: raw?.avatarDataUrl || raw?.avatar_data_url || raw?.avatar || raw?.avatarUrl || raw?.avatar_url || undefined,
    country: raw?.country || null,
    countryCode: raw?.countryCode || raw?.country_code || null,
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
  };
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
    userId: user.id || null,
    user,
    profile,
  };
}

export function saveNasTokens(session: AuthSession | null) {
  writeLs(NAS_TOKEN_KEY, session?.token || null);
  writeLs(NAS_REFRESH_KEY, session?.refreshToken || null);
  writeLs(NAS_AUTH_SESSION_KEY, session ? JSON.stringify(session) : null);
  dispatchAuthChanged();
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

export async function nasRestoreSession(): Promise<AuthSession | null> {
  let token = authToken();
  if (!token) {
    const cached = readJson<AuthSession | null>(readLs(NAS_AUTH_SESSION_KEY), null);
    if (cached?.token) {
      writeLs(NAS_TOKEN_KEY, cached.token);
      writeLs(NAS_REFRESH_KEY, cached.refreshToken || null);
      token = cached.token;
    }
  }
  if (!token) return null;

  try {
    const json = await apiFetch("/auth/me", { method: "GET" });
    const probe = buildSessionFromResponse(json, json?.user?.email);
    const session = buildSessionFromResponse(
      {
        ...json,
        token: probe.token || token,
        refreshToken: probe.refreshToken || readLs(NAS_REFRESH_KEY),
      },
      json?.user?.email
    );
    if (!session.token) session.token = token;
    saveNasTokens(session);
    return session;
  } catch {
    saveNasTokens(null);
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
  if (session?.token) saveNasTokens(session);
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
      return { status: "not_found", payload: null, updatedAt: null, version: null };
    }
    return {
      status: "ok",
      payload,
      updatedAt: json?.updatedAt || json?.updated_at || null,
      version: Number(json?.version ?? 1),
    };
  } catch (e) {
    return { status: "error", error: e };
  }
}

export async function nasPushStoreSnapshot(payload: any, version = 8): Promise<void> {
  const session0 = await nasRestoreSession();
  if (!session0?.token) throw new Error("Token NAS manquant. Reconnecte-toi.");

  await apiFetch("/sync/push", {
    method: "POST",
    body: JSON.stringify({ payload, version }),
  });
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