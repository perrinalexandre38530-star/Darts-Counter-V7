// ============================================================
// src/lib/nasApi.ts
// Fondation NAS API
// - Auth JWT côté backend Node
// - Profil utilisateur
// - Snapshot cloud (push/pull)
// NOTE:
// - conçu pour être TOLÉRANT: accepte plusieurs formes de réponses JSON
// - le backend définitif pourra retourner des champs plus précis sans casser le front
// ============================================================

import type { AuthSession, LoginPayload, SignupPayload, UpdateProfilePayload } from "./onlineApi";
import type { OnlineProfile, UserAuth } from "./onlineTypes";
import { NAS_API_URL } from "./serverConfig";

export function isNasSyncEnabled(): boolean {
  return !!NAS_API_URL;
}

const NAS_TOKEN_KEY = "dc_nas_access_token_v1";
const NAS_REFRESH_KEY = "dc_nas_refresh_token_v1";

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
    throw new Error(
      json?.error ||
        json?.message ||
        text ||
        `Erreur backend NAS (${res.status})`
    );
  }

  return json;
}

function normalizeUser(raw: any, fallbackEmail?: string): UserAuth {
  const id = String(raw?.id || raw?.userId || raw?.user_id || raw?.uid || "");
  const email = raw?.email || fallbackEmail || undefined;
  const nickname =
    String(
      raw?.nickname ||
        raw?.displayName ||
        raw?.display_name ||
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
    displayName: String(raw?.displayName || raw?.display_name || user.nickname || "Player"),
    avatarUrl: raw?.avatarUrl || raw?.avatar_url || undefined,
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
        json?.session?.token ||
        json?.session?.accessToken ||
        ""
    ) || "";

  const refreshToken =
    String(
      json?.refreshToken ||
        json?.refresh_token ||
        json?.session?.refreshToken ||
        json?.session?.refresh_token ||
        ""
    ) || "";

  const user = normalizeUser(json?.user || json?.account || json, fallbackEmail);
  const profile = normalizeProfile(json?.profile || json?.me?.profile || json?.user?.profile || null, user);

  return {
    token,
    refreshToken,
    expiresAt:
      typeof json?.expiresAt === "number"
        ? json.expiresAt
        : json?.expires_at
          ? Date.parse(json.expires_at)
          : null,
    userId: user.id || null,
    user,
    profile,
  };
}

export function saveNasTokens(session: AuthSession | null) {
  writeLs(NAS_TOKEN_KEY, session?.token || null);
  writeLs(NAS_REFRESH_KEY, session?.refreshToken || null);
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
  saveNasTokens(session);
  return session;
}

export async function nasRestoreSession(): Promise<AuthSession | null> {
  const token = authToken();
  if (!token) return null;

  try {
    const json = await apiFetch("/auth/me", { method: "GET" });
    const session = buildSessionFromResponse(
      {
        ...json,
        token,
        refreshToken: readLs(NAS_REFRESH_KEY),
      },
      json?.user?.email
    );
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
  return session.profile;
}

export async function nasUpdateProfile(patch: UpdateProfilePayload): Promise<OnlineProfile> {
  const json = await apiFetch("/profiles/me", {
    method: "PUT",
    body: JSON.stringify(patch),
  });

  const user = normalizeUser(json?.user || json, undefined);
  const profile = normalizeProfile(json?.profile || json, user);
  if (!profile) throw new Error("Réponse profil NAS invalide.");
  return profile;
}

export async function nasPullStoreSnapshot(): Promise<{
  status: "ok" | "not_found" | "error";
  payload?: any;
  updatedAt?: string | null;
  version?: number | null;
  error?: any;
}> {
  try {
    const json = await apiFetch("/sync/pull", { method: "GET" });
    const payload = json?.payload ?? json?.store ?? json?.data ?? null;
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
  pullStoreSnapshot: nasPullStoreSnapshot,
  pushStoreSnapshot: nasPushStoreSnapshot,
};
