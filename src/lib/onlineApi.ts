let __authReady = false;
let __authBootstrapPromise: Promise<void> | null = null;
// ============================================================
// src/lib/onlineApi.ts
// API Mode Online (V7 STABLE -> A+B SPECTATOR READY)
// - Auth / Profil → Supabase (table: profiles)
// - Données lourdes / sauvegardes → Cloudflare R2 via le backend dédié
// - Salons X01 (lobbies) → Supabase (table: online_lobbies)
// - Matchs online live (state_json) → Supabase (table: online_matches)
//
// ✅ IMPORTANT : PAS de création auto d'utilisateur anonyme.
// ✅ Compat UI: expose ensureAutoSession() (restore only).
// ✅ A: listActiveLobbies()
// ✅ B: startMatch / updateMatchState / endMatch + fetchMatchByCode
//
// ✅ PATCH NAS AUTH + RESTORE:
// - force la restauration de session NAS avant pull/push/getProfile
// - journalise clairement les cas "token manquant"
// - garde TOUTE la logique existante
// ============================================================

import { supabase, __SUPABASE_ENV__ } from "./supabaseClient";
import { isNasDataSyncEnabled, isNasProviderEnabled } from "./serverConfig";
import {
  ensureSupabaseAuthBackup,
  getLiveSupabaseSession,
  isSupabaseFailoverSession,
  rememberCanonicalUserMapping,
  resolveCanonicalUserId,
} from "./supabaseAuthFailover";
import {
  nasDeleteAccount,
  nasGetProfile,
  nasLogin,
  nasLogout,
  nasPullStoreSnapshot,
  nasPushStoreSnapshot,
  nasRequestPasswordReset,
  nasRestoreSession,
  nasSignup,
  nasUpdateEmail,
  nasUpdateProfile,
  nasUploadAvatarImage,
  nasUploadMediaAsset,
  saveNasTokens,
  nasBulkResolveMediaAssets,
  nasMediaHealth,
} from "./nasApi";
import { EventBuffer } from "./sync/EventBuffer";
import { importHistoryFromCloud } from "./sync/CloudHistoryImport";
import { apiGet, apiPost, buildApiUrl, getApiUrl, readNasAccessToken } from "./apiClient";
import type { UserAuth, OnlineProfile, OnlineMatch } from "./onlineTypes";

export const CLOUD_STORE_KEY = "main";

// ============================================================
// ✅ PGRST204 column-missing fallback (schema cache / tables legacy)
// ============================================================
function extractMissingColumn(err: any): string | null {
  try {
    const msg = String(err?.message ?? "");
    const m = msg.match(/Could not find the '([^']+)' column/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

async function writeWithColumnFallback<T>(
  exec: (obj: Record<string, any>) => Promise<{ data: T | null; error: any }>,
  payload: Record<string, any>,
  opts?: { maxStrips?: number; debugLabel?: string }
): Promise<{ data: T | null; error: any; stripped: string[] }> {
  const maxStrips = opts?.maxStrips ?? 8;
  const debugLabel = opts?.debugLabel ?? "write";
  const originalKeys = Object.keys(payload || {});
  let obj: Record<string, any> = { ...(payload || {}) };

  for (let i = 0; i <= maxStrips; i++) {
    const { data, error } = await exec(obj);
    if (!error) {
      const stripped = originalKeys.filter((k) => !(k in obj));
      if (stripped.length) {
        console.warn(`[onlineApi] ${debugLabel}: stripped missing cols =`, stripped);
      }
      return { data, error: null, stripped };
    }

    const code = String((error as any)?.code ?? "");
    if (code !== "PGRST204") return { data: null, error, stripped: [] };

    const col = extractMissingColumn(error);
    if (!col) return { data: null, error, stripped: [] };

    if (col in obj) {
      delete obj[col];
      continue;
    }

    return { data: null, error, stripped: [] };
  }

  return {
    data: null,
    error: { message: `Too many missing columns while writing (${debugLabel}).` },
    stripped: [],
  };
}

// --------------------------------------------
// Types publics
// --------------------------------------------
export type AuthSession = {
  token: string;
  refreshToken: string;
  expiresAt: number | null;
  userId: string | null;
  user: UserAuth;
  profile: OnlineProfile | null;
  authProvider?: "nas" | "supabase" | "supabase_failover";
  degradedMode?: boolean;
  supabaseUserId?: string | null;
};

export type SignupPayload = {
  email?: string;
  nickname: string;
  password?: string;
  invitationCode?: string;
};

export type LoginPayload = {
  email?: string;
  nickname?: string;
  password?: string;
  invitationCode?: string;
};

export type UpdateProfilePayload = {
  displayName?: string;
  avatarUrl?: string;
  country?: string;
  surname?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  city?: string;
  email?: string;
  phone?: string;
  nickname?: string;
  preferences?: {
    appLang?: string;
    appTheme?: string;
    favX01?: number;
    favDoubleOut?: boolean;
    ttsVoice?: string;
    sfxVolume?: number;
  };
  privateInfo?: Record<string, any>;
};

export type UploadMatchPayload = Omit<
  OnlineMatch,
  "id" | "userId" | "startedAt" | "finishedAt" | "isTraining"
> & {
  startedAt?: number;
  finishedAt?: number;
  isTraining?: boolean;
};


export type UploadMediaAssetPayload = {
  dataUrl?: string;
  base64?: string;
  mimeType?: string;
  kind: string;
  ownerId?: string | null;
  variant?: string | null;
};

export type ResolvedMediaAsset = {
  id: string;
  assetId?: string;
  kind?: string | null;
  ownerId?: string | null;
  variant?: string | null;
  mimeType?: string | null;
  byteSize?: number | null;
  sha256?: string | null;
  path?: string | null;
  publicUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

// --------------------------------------------
// Lobbies
// --------------------------------------------
export type OnlineLobbySettings = {
  start: number;
  doubleOut: boolean;
  [k: string]: any;
};

export type OnlineLobby = {
  id: string;
  code: string;
  mode: string;
  maxPlayers: number;
  hostUserId: string;
  hostNickname: string;
  settings: OnlineLobbySettings;
  status: string;
  createdAt: string;
  updatedAt?: string;
  players?: any[];
  playersCount?: number;
  isFull?: boolean;
};

// --------------------------------------------
// Match live (B)
// --------------------------------------------
export type OnlineMatchStatus = "started" | "ended";
export type OnlineMatchRow = {
  id: string;
  lobby_code: string | null;
  status: OnlineMatchStatus | string;
  state_json: any;
  updated_at?: string;
  created_at?: string;
  finished_at?: string | null;
  owner_user?: string | null;
};

// --------------------------------------------
// Config
// --------------------------------------------
const USE_MOCK = false;
function useNasOnlineBackend(): boolean {
  return isNasProviderEnabled() || isNasDataSyncEnabled();
}

const LS_AUTH_KEY = "dc_online_auth_supabase_v1";
const NAS_TOKEN_KEY = "dc_nas_access_token_v1";
const NAS_REFRESH_KEY = "dc_nas_refresh_token_v1";
const AUTH_LOCAL_KEYS_TO_PURGE = [
  LS_AUTH_KEY,
  NAS_TOKEN_KEY,
  NAS_REFRESH_KEY,
  "auth_token",
  "auth_session",
  "current_user",
  "dc_session",
  "dc_user",
  "dc_user_id",
  "dc_nas_profile_onboarding_uid",
  "supabase.auth.token",
];

function purgeAuthLocalState() {
  if (typeof window === "undefined") return;

  try {
    for (const key of AUTH_LOCAL_KEYS_TO_PURGE) {
      window.localStorage.removeItem(key);
    }

    // Supabase garde parfois ses JWT dans des clés dynamiques du type sb-xxx-auth-token.
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i) || "";
      if (/^(sb-|supabase\.)/i.test(key) || /auth.*token|token.*auth|refresh.*token/i.test(key)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {}

  try { window.sessionStorage.clear(); } catch {}

  try {
    window.dispatchEvent(new CustomEvent("dc-auth-changed", { detail: { status: "signed_out" } }));
  } catch {}
}

// ============================================================
// ✅ PROFILES TABLE RESOLUTION (compat)
// ============================================================
const PROFILE_TABLE_PRIMARY = "profiles";
const PROFILE_TABLE_FALLBACK = "profiles_online";

let __profilesTableCached: string | null = null;
let __profilesTablePromise: Promise<string> | null = null;

async function resolveProfilesTable(): Promise<string> {
  if (__profilesTableCached) return __profilesTableCached;
  if (__profilesTablePromise) return __profilesTablePromise;

  __profilesTablePromise = (async () => {
    try {
      const { error } = await supabase.from(PROFILE_TABLE_PRIMARY).select("id").limit(1);
      if (!error) {
        __profilesTableCached = PROFILE_TABLE_PRIMARY;
        return __profilesTableCached;
      }

      const code = (error as any)?.code;
      if (code === "PGRST205") {
        const { error: err2 } = await supabase.from(PROFILE_TABLE_FALLBACK).select("id").limit(1);
        if (!err2) {
          __profilesTableCached = PROFILE_TABLE_FALLBACK;
          return __profilesTableCached;
        }
      }

      __profilesTableCached = PROFILE_TABLE_PRIMARY;
      return __profilesTableCached;
    } catch {
      __profilesTableCached = PROFILE_TABLE_PRIMARY;
      return __profilesTableCached;
    } finally {
      __profilesTablePromise = null;
    }
  })();

  return __profilesTablePromise;
}

function now() {
  return Date.now();
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadAuthFromLS(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LS_AUTH_KEY);
  return safeParse<AuthSession | null>(raw, null);
}

function saveAuthToLS(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) window.localStorage.removeItem(LS_AUTH_KEY);
  else window.localStorage.setItem(LS_AUTH_KEY, JSON.stringify(session));

  try {
    window.dispatchEvent(new CustomEvent("dc-auth-changed"));
  } catch {}
}

function shouldUseNasForCurrentSession(): boolean {
  return useNasOnlineBackend() && !isSupabaseFailoverSession(loadAuthFromLS());
}

function safeUpper(code: string) {
  return String(code || "").trim().toUpperCase();
}

// ✅ Redirects stables (Cloudflare Pages + HashRouter)
function getSiteUrl(): string {
  const fromEnv =
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_SITE_URL) ||
    "";

  const SITE_URL = String(fromEnv || "https://darts-counter-v7.pages.dev").trim();
  return SITE_URL.replace(/\/+$/, "");
}

function getEmailConfirmRedirect(): string {
  return `${getSiteUrl()}/#/auth/callback`;
}

function getResetPasswordRedirect(): string {
  return `${getSiteUrl()}/#/auth/reset`;
}

// ============================================================
// Image helpers (dataUrl -> Blob)
// ============================================================
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = String(dataUrl || "").split(",");
  if (parts.length < 2) throw new Error("dataUrl invalide (pas de base64).");

  const meta = parts[0] || "";
  const b64 = parts[1] || "";
  const mime = (meta.match(/data:(.*?);base64/i) || [])[1] || "image/png";

  const bin = atob(b64);
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);

  return new Blob([arr], { type: mime });
}

function extFromMime(mime: string) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  return "png";
}

// ============================================================
// DB mapping
// ============================================================
type SupabaseProfileRow = {
  id: string;
  nickname?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  country?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  surname?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;

  bio?: string | null;
  stats?: any | null;
};

function mapProfile(row: SupabaseProfileRow): OnlineProfile {
  return {
    id: String(row.id),
    userId: String(row.id),
    displayName: (row.display_name ?? row.nickname ?? "") as any,
    avatarUrl: (row.avatar_url ?? undefined) as any,
    country: (row.country ?? undefined) as any,

    surname: row.surname ?? "",
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    birthDate: (row.birth_date ?? null) as any,
    city: row.city ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    preferences: row.preferences ?? {},
    privateInfo: row.private_info ?? {},

    bio: row.bio ?? "",
    stats:
      row.stats ?? {
        totalMatches: 0,
        totalLegs: 0,
        avg3: 0,
        bestVisit: 0,
        bestCheckout: 0,
      },
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : now(),
  } as any;
}

type SupabaseLobbyRow = {
  id: string;
  code: string;
  mode: string;
  max_players: number;
  host_user_id: string;
  host_nickname: string;
  settings: any;
  status: string;
  created_at: string;
};

function mapLobbyRow(row: SupabaseLobbyRow): OnlineLobby {
  return {
    id: String(row.id),
    code: String(row.code).toUpperCase(),
    mode: row.mode || "x01",
    maxPlayers: Number(row.max_players ?? 2),
    hostUserId: String(row.host_user_id),
    hostNickname: row.host_nickname || "Hôte",
    settings: (row.settings as OnlineLobbySettings) || {
      start: 501,
      doubleOut: true,
    },
    status: row.status || "waiting",
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// ============================================================
// ✅ NAS session guard
// - anti-boucle: cache dernière session valide
// - anti-rafale: mutualise les restores concurrents
// - tolère une micro-fenêtre où /auth/me n'est pas encore stabilisé
// ============================================================
let __nasEnsureInFlight: Promise<AuthSession> | null = null;
let __nasLastGoodSession: AuthSession | null = null;
let __nasLastRestoreAt = 0;
const NAS_RESTORE_MIN_INTERVAL_MS = 60_000;

let __nasWarnAt = 0;
function warnNasOnce(label: string, extra?: any) {
  const nowTs = Date.now();
  if (nowTs - __nasWarnAt < 15000) return;
  __nasWarnAt = nowTs;
  if (extra !== undefined) console.warn(label, extra);
  else console.warn(label);
}

function isValidNasSession(session: AuthSession | null | undefined): session is AuthSession {
  return !!session
    && !isSupabaseFailoverSession(session)
    && !!String(session?.token || "").trim()
    && !!String(session?.user?.id || session?.userId || "").trim();
}

function refreshNasSessionInBackground(reason: string) {
  if (__nasEnsureInFlight) return;

  __nasEnsureInFlight = (async () => {
    try {
      const refreshed = await nasRestoreSession({ timeoutMs: 1800 });
      if (isValidNasSession(refreshed)) {
        __nasLastGoodSession = refreshed;
        saveAuthToLS(refreshed);
        return refreshed;
      }
      return null;
    } catch (e) {
      warnNasOnce(`[onlineApi] NAS background restore skipped (${reason})`, e);
      return null;
    } finally {
      __nasEnsureInFlight = null;
    }
  })() as Promise<any>;
}

async function ensureNasSession(): Promise<AuthSession> {
  const cached = loadAuthFromLS();
  if (isValidNasSession(cached)) {
    __nasLastGoodSession = cached;
    const nowTs = Date.now();

    if (nowTs - __nasLastRestoreAt >= NAS_RESTORE_MIN_INTERVAL_MS) {
      __nasLastRestoreAt = nowTs;
      refreshNasSessionInBackground("cached-session");
    }

    return cached;
  }

  if (__nasEnsureInFlight) return __nasEnsureInFlight;

  const nowTs = Date.now();
  if (nowTs - __nasLastRestoreAt < NAS_RESTORE_MIN_INTERVAL_MS && isValidNasSession(__nasLastGoodSession)) {
    return __nasLastGoodSession!;
  }

  __nasEnsureInFlight = (async () => {
    __nasLastRestoreAt = nowTs;
    const session = await nasRestoreSession({ timeoutMs: 1800 });
    const token = String(session?.token || "").trim();
    const userId = String(session?.user?.id || session?.userId || "").trim();

    if (!token || !userId) {
      const cachedAuth = loadAuthFromLS();
      if (isValidNasSession(cachedAuth)) {
        __nasLastGoodSession = cachedAuth;
        warnNasOnce("[onlineApi] NAS restore incomplete -> keep cached session", {
          hasToken: !!token,
          hasUserId: !!userId,
          cachedUserId: cachedAuth?.user?.id || cachedAuth?.userId || null,
        });
        return cachedAuth;
      }
      if (isValidNasSession(__nasLastGoodSession)) {
        warnNasOnce("[onlineApi] NAS restore incomplete -> keep last good session", {
          hasToken: !!token,
          hasUserId: !!userId,
          cachedUserId: __nasLastGoodSession?.user?.id || __nasLastGoodSession?.userId || null,
        });
        return __nasLastGoodSession!;
      }
      throw new Error("Token NAS manquant. Reconnecte-toi.");
    }

    __nasLastGoodSession = session;
    saveAuthToLS(session);
    markAuthReady(!!session?.token);
      return session;
  })();

  try {
    return await __nasEnsureInFlight;
  } finally {
    __nasEnsureInFlight = null;
  }
}

// ============================================================
// Auth helpers
// ============================================================
async function ensureAuthedUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = data?.session?.user;
  const session = data?.session;

  if (!user || !session) throw new Error("Non authentifié (reconnecte-toi).");
  return { user, session };
}

async function getOrCreateProfile(userId: string, fallbackNickname: string): Promise<OnlineProfile | null> {
  const PROFILES_TABLE = await resolveProfilesTable();

  const { data: profileRow, error: selErr } = await supabase
    .from(PROFILES_TABLE)
    .select("*")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (selErr) {
    console.warn("[onlineApi] profiles select error", selErr);
    return null;
  }

  if (profileRow) return mapProfile(profileRow as any);

  const baseNick = String(fallbackNickname || "")
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/@.*$/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 24) || "Player";

  const isUniqueViolation = (err: any) => {
    const code = err?.code ?? err?.details ?? err?.message;
    return String(code || "").includes("23505") || String(code || "").toLowerCase().includes("duplicate");
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const nick = attempt === 0 ? baseNick : `${baseNick}-${Math.floor(Math.random() * 900 + 100)}`;
    const payload = {
      id: userId,
      user_id: userId,
      nickname: nick,
      display_name: nick,
      country: null,
      avatar_url: null,
      updated_at: new Date().toISOString(),
    };

    const res = await writeWithColumnFallback<any>(
      async (obj) => {
        const { data, error } = await supabase
          .from(PROFILES_TABLE)
          .upsert(obj as any, { onConflict: "id" })
          .select()
          .single();
        return { data, error };
      },
      payload,
      { debugLabel: `profiles upsert (${PROFILES_TABLE})` }
    );

    if (!res.error) return mapProfile(res.data as any);

    if (isUniqueViolation(res.error)) {
      console.warn("[onlineApi] profiles upsert nickname collision — retry", { nick });
      continue;
    }

    console.warn("[onlineApi] profiles upsert error", res.error);
    return null;
  }

  console.warn("[onlineApi] profiles upsert error: too many nickname collisions");
  return null;
}

async function bridgeSupabaseSessionToNas(session: any, userAuth: UserAuth, profile: OnlineProfile | null): Promise<AuthSession | null> {
  // En mode public/hybride, Supabase authentifie l’utilisateur, mais le backend NAS
  // reste l’API de contrôle des quotas et des objets R2. On échange donc le token
  // Supabase contre une session NAS interne, sans stocker les données lourdes dans Supabase.
  if (!isNasDataSyncEnabled()) return null;
  const accessToken = String(session?.access_token || "").trim();
  if (!accessToken) return null;

  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? window.setTimeout(() => ctrl.abort(), 5000) : null;
  try {
    const res = await fetch(`${getApiUrl()}/auth/supabase/bridge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        nickname: userAuth.nickname,
      }),
      signal: ctrl?.signal,
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!res.ok) {
      throw new Error(json?.message || json?.error || text || `Bridge Supabase/NAS HTTP ${res.status}`);
    }
    const token = String(json?.token || json?.accessToken || "").trim();
    if (!token) throw new Error("Bridge Supabase/NAS invalide : token NAS absent.");
    const bridgedUser = json?.user || {};
    const bridgedProfile = json?.profile || profile || null;
    const bridged: AuthSession = {
      token,
      refreshToken: String(json?.refreshToken || session?.refresh_token || ""),
      expiresAt: json?.expiresAt ? Date.parse(json.expiresAt) : (Number(session?.expires_at || 0) || null),
      userId: String(bridgedUser?.id || json?.userId || userAuth.id),
      user: {
        id: String(bridgedUser?.id || json?.userId || userAuth.id),
        email: bridgedUser?.email || userAuth.email,
        nickname: bridgedUser?.nickname || userAuth.nickname,
        createdAt: Number(bridgedUser?.createdAt || userAuth.createdAt || now()),
      },
      profile: bridgedProfile,
    };
    saveNasTokens(bridged);
    return bridged;
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

function buildSessionFromNasBridgeResponse(json: any, fallbackEmail?: string): AuthSession {
  const user = json?.user || {};
  const profile = json?.profile || null;
  const token = String(json?.token || json?.accessToken || json?.access_token || "").trim();
  const refreshToken = String(json?.refreshToken || json?.refresh_token || "").trim();
  const rawExpiresAt = json?.expiresAt ?? json?.expires_at ?? null;
  const expiresAt = typeof rawExpiresAt === "number"
    ? (rawExpiresAt > 0 && rawExpiresAt < 1_000_000_000_000 ? rawExpiresAt * 1000 : rawExpiresAt)
    : rawExpiresAt
      ? Date.parse(String(rawExpiresAt))
      : null;
  const provider = String(json?.authProvider || json?.auth_provider || "nas");
  const degradedMode = json?.degradedMode === true || provider === "supabase_failover";
  const userId = String(user?.id || json?.userId || json?.canonicalUserId || json?.supabaseUserId || "").trim();
  const session: AuthSession = {
    token,
    refreshToken,
    expiresAt: Number.isFinite(Number(expiresAt)) ? Number(expiresAt) : null,
    userId: userId || null,
    user: {
      id: userId,
      email: user?.email || fallbackEmail || undefined,
      nickname: String(user?.nickname || profile?.displayName || profile?.nickname || (fallbackEmail ? String(fallbackEmail).split("@")[0] : "Player")),
      createdAt: Number(user?.createdAt || (user?.created_at ? Date.parse(user.created_at) : Date.now())),
    },
    profile,
    authProvider: degradedMode ? "supabase_failover" : provider === "supabase" ? "supabase" : "nas",
    degradedMode,
    supabaseUserId: String(json?.supabaseUserId || json?.bridge?.supabaseUserId || "").trim() || null,
  };
  if (!session.token || !session.user?.id) {
    throw new Error("Réponse de connexion invalide : session absente.");
  }

  if (degradedMode) {
    // Le token est un JWT Supabase : ne jamais le ranger dans les clés NAS.
    try {
      localStorage.removeItem(NAS_TOKEN_KEY);
      localStorage.removeItem(NAS_REFRESH_KEY);
    } catch {}
    rememberCanonicalUserMapping({
      email: session.user.email,
      canonicalUserId: session.user.id,
      supabaseUserId: session.supabaseUserId,
    });
  } else {
    saveNasTokens(session);
  }

  saveAuthToLS(session);
  markAuthReady(true);
  return session;
}

async function publicSupabaseViaBackend(kind: "login" | "register", payload: LoginPayload | SignupPayload): Promise<AuthSession> {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? window.setTimeout(() => ctrl.abort(), 10000) : null;
  try {
    let res: Response;
    try {
      res = await fetch(`${getApiUrl()}/auth/supabase/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          nickname: (payload as any).nickname || (payload.email ? String(payload.email).split("@")[0] : "Player"),
        }),
        signal: ctrl?.signal,
      });
    } catch (networkError: any) {
      const msg = String(networkError?.message || networkError || "");
      throw new Error(`Impossible de joindre le backend NAS/R2 pour ${kind === "register" ? "créer" : "connecter"} le compte public. URL: ${getApiUrl()}. Détail: ${msg || "erreur réseau"}`);
    }
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      throw new Error(json?.message || json?.error || text || `Bridge public Supabase HTTP ${res.status}`);
    }
    return buildSessionFromNasBridgeResponse(json, payload.email);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

async function tryNasLoginWithoutInvitation(payload: LoginPayload): Promise<AuthSession | null> {
  try {
    const session = await nasLogin({ email: payload.email, password: payload.password, nickname: payload.nickname });
    if (session?.token) {
      session.authProvider = "nas";
      session.degradedMode = false;
      saveAuthToLS(session);
      markAuthReady(true);

      const canonicalUserId = String(session.user?.id || session.userId || "").trim();
      rememberCanonicalUserMapping({ email: payload.email, canonicalUserId });
      // Ne bloque jamais la connexion NAS : la copie Supabase est créée/vérifiée en arrière-plan.
      if (__SUPABASE_ENV__.hasEnv && canonicalUserId && payload.email && payload.password) {
        void ensureSupabaseAuthBackup({
          email: payload.email,
          password: payload.password,
          nickname: session.user?.nickname || payload.nickname,
          canonicalUserId,
        }).catch((error) => console.warn("[onlineApi] Supabase auth backup failed", error));
      }
      return session;
    }
  } catch (error: any) {
    const msg = String(error?.message || error || "");
    const status = Number(error?.status || 0);
    // 401 = normal pour un compte public Supabase dont le mot de passe NAS interne
    // est aléatoire. En revanche, un 5xx signifie que la connexion NAS est cassée :
    // on le remonte pour ne plus afficher à tort “Invalid login credentials”.
    if (status >= 500 || /Internal Server Error|Erreur login|failed \(500\)|Backend NAS trop lent/i.test(msg)) {
      throw error;
    }
    console.warn("[onlineApi] fallback NAS login skipped", error);
  }
  return null;
}

async function buildAuthSessionFromSupabase(opts?: { allowNasFailure?: boolean }): Promise<AuthSession | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.warn("[onlineApi] getSession error", sessionError);
    return null;
  }

  const session = sessionData.session;
  const user = session?.user;
  if (!user) return null;

  const meta = (user.user_metadata || {}) as any;
  const nickname = meta?.nickname || user.email || "Player";
  const supabaseUserId = String(user.id || "");

  const supabaseUserAuth: UserAuth = {
    id: supabaseUserId,
    email: user.email ?? undefined,
    nickname,
    createdAt: user.created_at ? Date.parse(user.created_at) : now(),
  };

  const profile = await getOrCreateProfile(supabaseUserId, nickname);

  try {
    const bridged = await bridgeSupabaseSessionToNas(session, supabaseUserAuth, profile);
    if (bridged?.token) {
      bridged.authProvider = "nas";
      bridged.degradedMode = false;
      bridged.supabaseUserId = supabaseUserId;
      rememberCanonicalUserMapping({
        email: user.email,
        canonicalUserId: bridged.user?.id || bridged.userId,
        supabaseUserId,
      });
      saveAuthToLS(bridged);
      return bridged;
    }
  } catch (bridgeError) {
    console.warn("[onlineApi] Supabase -> NAS/R2 bridge failed", bridgeError);
    if (isNasDataSyncEnabled() && !opts?.allowNasFailure) {
      throw bridgeError instanceof Error ? bridgeError : new Error(String(bridgeError || "Bridge Supabase/NAS impossible."));
    }
  }

  const canonicalUserId = resolveCanonicalUserId(user) || supabaseUserId;
  rememberCanonicalUserMapping({ email: user.email, canonicalUserId, supabaseUserId });

  const authSession: AuthSession = {
    token: session?.access_token ?? "",
    refreshToken: (session as any)?.refresh_token ?? "",
    expiresAt: (session as any)?.expires_at ?? null,
    userId: canonicalUserId,
    user: {
      ...supabaseUserAuth,
      id: canonicalUserId,
    },
    profile,
    authProvider: isNasDataSyncEnabled() ? "supabase_failover" : "supabase",
    degradedMode: isNasDataSyncEnabled(),
    supabaseUserId,
  };

  // En secours, ne jamais recopier le JWT Supabase dans la clé JWT NAS.
  if (authSession.degradedMode) {
    try {
      localStorage.removeItem(NAS_TOKEN_KEY);
      localStorage.removeItem(NAS_REFRESH_KEY);
    } catch {}
  }

  saveAuthToLS(authSession);
  markAuthReady(!!authSession?.token);
  return authSession;
}

// ============================================================
// Compte utilisateur unique
// ============================================================
async function ensureAutoSession(): Promise<AuthSession | null> {
  if (isNasProviderEnabled()) {
    try {
      return await ensureNasSession();
    } catch {
      return null;
    }
  }

  const existing = await buildAuthSessionFromSupabase();
  return existing?.user?.id ? existing : null;
}

async function ensureAnonymousSession(): Promise<AuthSession | null> {
  return await ensureAutoSession();
}

// ============================================================
// Error mapping (login)
// ============================================================
function normalizeAuthErrorMessage(msg: string) {
  const m = String(msg || "").toLowerCase();

  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
    return "Email non confirmé. Clique sur le lien reçu par email, puis réessaie (ou renvoie l’email de confirmation).";
  }
  if (m.includes("invalid login credentials")) {
    return "Identifiants invalides (email ou mot de passe).";
  }
  if (m.includes("user not found")) {
    return "Compte introuvable (vérifie l’email).";
  }

  return msg || "Erreur de connexion.";
}

// ============================================================
// Public AUTH
// ============================================================
async function signupPublic(payload: SignupPayload): Promise<AuthSession> {
  const email = payload.email?.trim();
  const password = payload.password?.trim();
  const nickname = payload.nickname?.trim() || email || "Player";

  if (!email || !password) {
    throw new Error("Pour créer un compte public, email et mot de passe sont requis.");
  }

  // Mode public stabilisé : le navigateur ne contacte plus Supabase directement pour créer
  // la session principale. Le backend NAS/R2 crée/authentifie le compte Supabase côté serveur,
  // puis renvoie une session NAS interne persistante. Cela évite les erreurs mobiles
  // "Failed to fetch" vers *.supabase.co et les conflits de cache d'ancien projet Supabase.
  try {
    return await publicSupabaseViaBackend("register", { email, password, nickname });
  } catch (backendError: any) {
    const msg = String(backendError?.message || backendError || "");
    if (/already registered|user already registered|already exists|existe déjà/i.test(msg)) {
      throw new Error("Un compte public existe déjà avec cet email. Utilise “J’ai déjà un compte”, ou supprime complètement le compte depuis Réglages > Compte avant de le recréer.");
    }
    throw backendError instanceof Error ? backendError : new Error(msg || "Création du compte public impossible.");
  }
}

async function loginPublic(payload: LoginPayload): Promise<AuthSession> {
  const email = payload.email?.trim();
  const password = payload.password?.trim();

  if (!email || !password) {
    throw new Error("Email et mot de passe requis pour se connecter.");
  }

  let nasError: any = null;
  let directError: any = null;
  let publicError: any = null;

  // 1) NAS prioritaire pour les comptes privés/fondateur, avec timeout court.
  try {
    const nasSession = await tryNasLoginWithoutInvitation({ email, password, nickname: payload.nickname });
    if (nasSession) return nasSession;
  } catch (error: any) {
    nasError = error;
    console.warn("[onlineApi] NAS-first login failed -> trying Supabase failover", error);
  }

  // 2) Secours direct Supabase AVANT le backend NAS : c'est ce qui garantit
  // que le compte admin reste connectable lorsque le NAS ou son tunnel est coupé.
  if (__SUPABASE_ENV__.hasEnv) {
    try {
      const signInResult: any = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("Supabase ne répond pas (timeout 9000ms).")), 9000)),
      ]);
      const { error } = signInResult || {};
      if (error) throw new Error(normalizeAuthErrorMessage(error.message));
      const session = await buildAuthSessionFromSupabase({ allowNasFailure: true });
      if (!session) throw new Error("Impossible de récupérer la session Supabase après la connexion.");
      markAuthReady(true);
      return session;
    } catch (error: any) {
      directError = error;
      console.warn("[onlineApi] direct Supabase login failed -> trying server bridge", error);
    }
  }

  // 3) Compatibilité anciens comptes publics : bridge serveur si l'accès direct
  // Supabase est filtré par le navigateur/réseau mais que le backend reste joignable.
  try {
    return await publicSupabaseViaBackend("login", { email, password, nickname: payload.nickname });
  } catch (error: any) {
    publicError = error;
    console.warn("[onlineApi] public backend login failed", error);
  }

  const nasMsg = String(nasError?.message || "");
  const directMsg = String(directError?.message || "");
  const publicMsg = String(publicError?.message || "");

  if (directError && !/Invalid login credentials|Identifiants invalides/i.test(directMsg)) {
    throw directError instanceof Error ? directError : new Error(directMsg);
  }
  if (publicError && !/Invalid login credentials|Identifiants invalides/i.test(publicMsg)) {
    throw publicError instanceof Error ? publicError : new Error(publicMsg);
  }
  if (nasError && !/Compte introuvable|Mot de passe invalide|401|Invalid login credentials|Backend NAS|timeout|injoignable/i.test(nasMsg)) {
    throw nasError instanceof Error ? nasError : new Error(nasMsg);
  }
  throw new Error("Identifiants invalides ou compte introuvable. Vérifie l’email et le mot de passe.");
}

async function ensureNasAccountFailoverCopy(session: AuthSession, payload: LoginPayload | SignupPayload): Promise<void> {
  const email = String(payload.email || session.user?.email || "").trim();
  const password = String(payload.password || "").trim();
  const canonicalUserId = String(session.user?.id || session.userId || "").trim();
  if (!__SUPABASE_ENV__.hasEnv || !email || !password || !canonicalUserId) return;
  rememberCanonicalUserMapping({ email, canonicalUserId });
  await ensureSupabaseAuthBackup({
    email,
    password,
    nickname: session.user?.nickname || payload.nickname,
    canonicalUserId,
  });
}

async function signupWithInvitation(payload: SignupPayload): Promise<AuthSession> {
  const invitationCode = String(payload.invitationCode || "").trim();
  if (!invitationCode) throw new Error("Code d’invitation requis pour cet accès privé.");
  try { await supabase.auth.signOut(); } catch {}
  const s = await nasSignup({ ...payload, invitationCode });
  s.authProvider = "nas";
  s.degradedMode = false;
  saveAuthToLS(s);
  void ensureNasAccountFailoverCopy(s, payload).catch((error) => console.warn("[onlineApi] Supabase auth backup failed", error));
  return s;
}

async function loginWithInvitation(payload: LoginPayload): Promise<AuthSession> {
  const invitationCode = String(payload.invitationCode || "").trim();
  if (!invitationCode) throw new Error("Code d’invitation requis pour cet accès privé.");
  try { await supabase.auth.signOut(); } catch {}
  const s = await nasLogin({ ...payload, invitationCode });
  s.authProvider = "nas";
  s.degradedMode = false;
  saveAuthToLS(s);
  void ensureNasAccountFailoverCopy(s, payload).catch((error) => console.warn("[onlineApi] Supabase auth backup failed", error));
  return s;
}

async function signup(payload: SignupPayload): Promise<AuthSession> {
  // Compatibilité : les anciens appels restent branchés sur le provider historique.
  // Les écrans V7 utilisent désormais explicitement signupPublic ou signupWithInvitation.
  if (isNasProviderEnabled()) return signupWithInvitation(payload);
  return signupPublic(payload);
}

async function login(payload: LoginPayload): Promise<AuthSession> {
  // Compatibilité : les anciens appels restent branchés sur le provider historique.
  // Les écrans V7 utilisent désormais explicitement loginPublic ou loginWithInvitation.
  if (isNasProviderEnabled()) return loginWithInvitation(payload);
  return loginPublic(payload);
}

// ============================================================
// HASH-ROUTER AUTH (/#/auth/...)
// ============================================================
async function maybeConsumeAuthRedirectFromHash(): Promise<void> {
  if (typeof window === "undefined") return;

  const rawHash = String(window.location.hash || "");
  if (!rawHash) return;

  const qIndex = rawHash.indexOf("?");
  if (qIndex >= 0) {
    const query = rawHash.slice(qIndex + 1);
    const sp = new URLSearchParams(query);
    const code = sp.get("code");
    if (code) {
      try {
        await supabase.auth.exchangeCodeForSession(code);
      } catch (e) {
        console.warn("[onlineApi] exchangeCodeForSession failed", e);
      }
      return;
    }
  }

  const lastHash = rawHash.lastIndexOf("#");
  if (lastHash >= 0) {
    const frag = rawHash.slice(lastHash + 1);
    if (frag.includes("access_token=") || frag.includes("refresh_token=")) {
      const sp = new URLSearchParams(frag);
      const access_token = sp.get("access_token") || "";
      const refresh_token = sp.get("refresh_token") || "";
      if (access_token && refresh_token) {
        try {
          await supabase.auth.setSession({ access_token, refresh_token });
        } catch (e) {
          console.warn("[onlineApi] setSession failed", e);
        }
      }
    }
  }
}


function markAuthReady(v: boolean) {
  __authReady = !!v;
}

export function isOnlineAuthReady(): boolean {
  return __authReady;
}

async function waitOnlineAuthReady(timeoutMs = 4000): Promise<boolean> {
  const start = Date.now();
  while (!__authReady) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
  return true;
}
async function restoreSession(): Promise<AuthSession | null> {
  // Mode hybride : une session NAS/R2 issue du bridge Supabase ou d’un compte invité
  // est une vraie session connectée. On ne l’efface plus au démarrage sous prétexte
  // que Supabase n’a pas de session navigateur active.
  const cachedNas = loadAuthFromLS();
  if (isValidNasSession(cachedNas)) {
    __nasLastGoodSession = cachedNas;
    saveNasTokens(cachedNas, { silent: true });
    markAuthReady(true);
    return cachedNas;
  }

  if (isSupabaseFailoverSession(cachedNas)) {
    const liveSupabase = await getLiveSupabaseSession();
    if (liveSupabase?.user) {
      markAuthReady(true);
      return cachedNas;
    }
  }

  if (isNasProviderEnabled()) {
    return null;
  }

  try {
    await maybeConsumeAuthRedirectFromHash();

    const live = await buildAuthSessionFromSupabase({ allowNasFailure: true });
    if (live) {
      try {
        importHistoryFromCloud({ maxPages: 2, pageSize: 150 }).catch(() => {});
      } catch {}
      return live;
    }

    const cached = loadAuthFromLS();
    if (cached?.token && cached.refreshToken) {
      try {
        await supabase.auth.setSession({
          access_token: cached.token,
          refresh_token: cached.refreshToken,
        });
        const retry = await buildAuthSessionFromSupabase({ allowNasFailure: true });
        if (retry) {
          try {
            importHistoryFromCloud({ maxPages: 2, pageSize: 150 }).catch(() => {});
          } catch {}
          return retry;
        }
      } catch (e) {
        console.warn("[onlineApi] rehydrate setSession failed", e);
      }
    }

    return null;
  } catch (e) {
    markAuthReady(false);
    console.warn("[onlineApi] restoreSession error", e);
    try {
      saveAuthToLS(null);
    } catch {}
    return null;
  }
}

async function logout(): Promise<void> {
  try {
    if (isNasProviderEnabled()) {
      await nasLogout();
    } else {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn("[onlineApi] logout error", error);
    }
  } finally {
    __nasLastGoodSession = null;
    __nasLastRestoreAt = 0;
    __nasEnsureInFlight = null;
    saveAuthToLS(null);
    purgeAuthLocalState();
  }
}

async function getCurrentSession(): Promise<AuthSession | null> {
  const cached = loadAuthFromLS();
  if (isSupabaseFailoverSession(cached)) {
    const liveSupabase = await getLiveSupabaseSession();
    if (liveSupabase?.user) return cached;
  }

  if (useNasOnlineBackend()) {
    try {
      return await ensureNasSession();
    } catch {
      // En mode hybride, on garde un dernier secours Supabase pour les anciens comptes non bridgés.
      if (!isNasProviderEnabled()) return await restoreSession();
      return null;
    }
  }
  return await restoreSession();
}

async function getProfile(): Promise<OnlineProfile | null> {
  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    return await nasGetProfile();
  }

  const s = await restoreSession();
  return s?.profile ?? null;
}

async function resendSignupConfirmation(email: string): Promise<void> {
  const e = email.trim();
  if (!e) throw new Error("Email requis.");

  if (isNasProviderEnabled()) {
    return;
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: e,
    options: { emailRedirectTo: getEmailConfirmRedirect() },
  } as any);

  if (error) throw new Error(error.message);
}

// ============================================================
// Gestion compte
// ============================================================
async function requestPasswordReset(email: string): Promise<void> {
  if (isNasProviderEnabled()) {
    await nasRequestPasswordReset(email);
    return;
  }
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Adresse mail requise pour réinitialiser le mot de passe.");

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: getResetPasswordRedirect(),
  });
  if (error) throw new Error(error.message);
}

async function changePassword(newPassword: string): Promise<void> {
  if (isNasProviderEnabled()) {
    await ensureNasSession();
    await nasChangePassword(newPassword);
    return;
  }
  const pw = newPassword.trim();
  if (!pw || pw.length < 6) throw new Error("Mot de passe trop court (min. 6 caractères).");
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) throw new Error(error.message);
}

async function updateEmail(newEmail: string): Promise<void> {
  if (isNasProviderEnabled()) {
    await ensureNasSession();
    await nasUpdateEmail(newEmail);
    return;
  }
  const trimmed = newEmail.trim();
  if (!trimmed) throw new Error("Nouvelle adresse mail invalide.");

  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) throw new Error(error.message);
}


async function deletePublicSupabaseAccountThroughNas(): Promise<boolean> {
  if (!isNasDataSyncEnabled()) return false;
  let accessToken = "";
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = String(data?.session?.access_token || "").trim();
  } catch {}
  if (!accessToken) return false;

  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? window.setTimeout(() => ctrl.abort(), 15000) : null;
  try {
    const res = await fetch(`${getApiUrl()}/auth/supabase/account`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
      signal: ctrl?.signal,
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) throw new Error(json?.error || json?.message || text || `Suppression Supabase/NAS HTTP ${res.status}`);
    try { await supabase.auth.signOut(); } catch {}
    return true;
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

async function deleteAccount(): Promise<void> {
  try {
    // Compte public : Supabase Auth + NAS/R2 bridge doivent être supprimés ensemble.
    // Sinon l’email reste bloqué dans Supabase ou dans la table users NAS.
    const publicDeleted = await deletePublicSupabaseAccountThroughNas().catch((error) => {
      console.warn("[onlineApi] public Supabase/NAS delete failed", error);
      return false;
    });
    if (publicDeleted) return;

    if (isNasProviderEnabled()) {
      await ensureNasSession();
      await nasDeleteAccount();
      return;
    }

    await ensureAuthedUser();
    const { data, error } = await supabase.functions.invoke("delete-account");
    if (error) throw new Error(error.message || "Suppression impossible (Edge Function).");
    if ((data as any)?.error) throw new Error((data as any).error);
    await supabase.auth.signOut();
  } finally {
    __nasLastGoodSession = null;
    __nasLastRestoreAt = 0;
    __nasEnsureInFlight = null;
    saveAuthToLS(null);
    purgeAuthLocalState();
  }
}

// ============================================================
// Profil
// ============================================================
async function updateProfile(patch: UpdateProfilePayload): Promise<OnlineProfile> {
  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    return await nasUpdateProfile(patch);
  }

  const { user } = await ensureAuthedUser();
  const userId = user.id;

  const PROFILES_TABLE = await resolveProfilesTable();

  const dbPatch: any = { updated_at: new Date().toISOString() };

  if (patch.nickname !== undefined) dbPatch.nickname = patch.nickname;
  if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName;
  if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
  if (patch.country !== undefined) dbPatch.country = patch.country;

  if (patch.surname !== undefined) dbPatch.surname = patch.surname;
  if (patch.firstName !== undefined) dbPatch.first_name = patch.firstName;
  if (patch.lastName !== undefined) dbPatch.last_name = patch.lastName;
  if (patch.birthDate !== undefined) dbPatch.birth_date = patch.birthDate;
  if (patch.city !== undefined) dbPatch.city = patch.city;
  if (patch.email !== undefined) dbPatch.email = patch.email;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (patch.preferences !== undefined) dbPatch.preferences = patch.preferences;
  if (patch.privateInfo !== undefined) dbPatch.private_info = patch.privateInfo;

  const upsertPayload: any = { id: userId, user_id: userId, ...dbPatch };

  const res = await writeWithColumnFallback<any>(
    async (obj) => {
      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .upsert(obj as any, { onConflict: "id" })
        .select()
        .single();
      return { data, error };
    },
    upsertPayload,
    { debugLabel: `profiles upsert (${PROFILES_TABLE})` }
  );

  if (res.error) throw new Error(res.error.message || "Erreur updateProfile.");

  const profile = mapProfile(res.data as any);

  const current = loadAuthFromLS();
  if (current?.user?.id === userId || current?.supabaseUserId === userId) {
    saveAuthToLS({ ...current, profile });
  }

  return profile;
}

// ============================================================
// Avatar Storage
// ============================================================
async function uploadAvatarImage(opts: {
  dataUrl: string;
  folder?: string;
  updateProfile?: boolean;
}): Promise<{ publicUrl: string; path: string }> {
  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    return await nasUploadAvatarImage(opts);
  }
  const { dataUrl } = opts;
  const { user } = await ensureAuthedUser();

  const folder = (opts.folder && String(opts.folder).trim()) || user.id;

  const blob = dataUrlToBlob(dataUrl);
  const mime = (blob as any).type || "image/png";
  const ext = extFromMime(mime);

  const path = `${folder}/avatar-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
    upsert: true,
    contentType: mime,
    cacheControl: "3600",
  });

  if (upErr) throw new Error(upErr.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) throw new Error("Impossible de récupérer l’URL publique de l’avatar.");

  if (opts.updateProfile !== false) {
    await updateProfile({ avatarUrl: publicUrl });
  }

  return { publicUrl, path };
}

// ============================================================
// Snapshot de compte — NAS uniquement
// Supabase reste strictement limité à l’authentification et au profil léger.
// Les données lourdes sont routées vers Cloudflare R2 par cloudStorageApi /
// matchAutoBackup, ou vers un fichier/local/NAS selon la destination choisie.
// ============================================================
type StoreSnapshotPullResult = {
  status: "ok" | "not_found" | "error";
  payload?: any;
  updatedAt?: string | null;
  version?: number | null;
  error?: any;
  provider?: "nas";
  degradedMode?: boolean;
  skipped?: boolean;
  reason?: string;
};

async function pullStoreSnapshot(): Promise<StoreSnapshotPullResult> {
  const cached = loadAuthFromLS();
  const failoverSession = isSupabaseFailoverSession(cached);

  // En session Supabase de secours, aucune partie ni sauvegarde n’est lue
  // depuis Supabase. L’app continue avec sa copie locale et, si configuré,
  // les sauvegardes R2/fichier restent gérées par leurs modules dédiés.
  if (failoverSession) {
    return {
      status: "not_found",
      payload: null,
      updatedAt: null,
      version: null,
      provider: "nas",
      degradedMode: true,
      skipped: true,
      reason: "supabase_auth_only",
    };
  }

  if (!isNasDataSyncEnabled()) {
    return {
      status: "not_found",
      payload: null,
      updatedAt: null,
      version: null,
      provider: "nas",
      skipped: true,
      reason: "nas_sync_disabled",
    };
  }

  try {
    await ensureNasSession();
    const result = await nasPullStoreSnapshot();
    return { ...(result as any), provider: "nas", degradedMode: false };
  } catch (error) {
    return { status: "error", error, provider: "nas", degradedMode: false };
  }
}

async function pushStoreSnapshot(payload: any, version = 8, opts?: { force?: boolean; reason?: string }): Promise<any> {
  const cached = loadAuthFromLS();
  const failoverSession = isSupabaseFailoverSession(cached);

  // Garde-fou absolu : jamais de snapshot, partie, historique ou sauvegarde
  // dans Supabase, même lorsque le NAS est en panne.
  if (failoverSession || !isNasDataSyncEnabled()) {
    return {
      ok: false,
      skipped: true,
      provider: "nas",
      degradedMode: failoverSession,
      reason: failoverSession ? "supabase_auth_only" : "nas_sync_disabled",
    };
  }

  await ensureNasSession();
  const result = await nasPushStoreSnapshot(payload, version, opts);
  return { ...(result && typeof result === "object" ? result : {}), ok: true, provider: "nas" };
}

// ============================================================
// ONLINE SERVER PING (safe)
// ============================================================
export type PingResult = { ok: true; authRequired?: boolean; provider?: "nas" | "supabase"; dbReady?: boolean };

async function ping(): Promise<PingResult> {
  // En mode NAS ou hybride, les associations profils, snapshots et stats liées
  // passent par le backend NAS. Le statut affiché dans ONLINE doit donc tester
  // /health du NAS, pas seulement Supabase. Sinon l’écran peut dire "hors ligne"
  // alors que l’API utilisée par les associations est un autre serveur.
  if (isNasProviderEnabled() || isNasDataSyncEnabled()) {
    const health = await apiGet("/health");
    if (health?.ok === false) {
      throw new Error(health?.error || "Backend NAS joignable mais base de données indisponible.");
    }
    return { ok: true, provider: "nas", dbReady: health?.dbReady !== false };
  }

  const { error } = await supabase.from("online_lobbies").select("id").limit(1);

  if (error) {
    const msg = String((error as any).message || error).toLowerCase();
    if (msg.includes("permission")) return { ok: true, authRequired: true, provider: "supabase" };
    throw error;
  }

  return { ok: true, provider: "supabase" };
}

// ============================================================
// Lobbies (online_lobbies)
// ============================================================
function generateLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function createLobby(args: { mode: string; maxPlayers: number; settings: OnlineLobbySettings }): Promise<OnlineLobby> {
  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    const res = await apiPost("/online/lobbies/create-safe", {
      mode: args.mode,
      maxPlayers: args.maxPlayers,
      settings: args.settings,
    });
    return (res?.lobby || res) as OnlineLobby;
  }

  const { user } = await ensureAuthedUser();

  const meta = (user.user_metadata || {}) as any;
  const nickname = meta.nickname || meta.displayName || user.email || "Hôte";

  let lastError: any = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateLobbyCode();

    const { data, error } = await supabase
      .from("online_lobbies")
      .insert({
        code,
        mode: args.mode,
        max_players: args.maxPlayers,
        host_user_id: user.id,
        host_nickname: nickname,
        settings: args.settings,
        status: "waiting",
      })
      .select("*")
      .single();

    if (!error && data) return mapLobbyRow(data as any);

    lastError = error;
    if (error && (error as any).code === "23505") continue;
    break;
  }

  throw new Error(lastError?.message || "Impossible de créer un salon online pour le moment.");
}

async function joinLobby(args: { code: string; [k: string]: any }): Promise<OnlineLobby> {
  const codeUpper = safeUpper(args.code);

  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    const res = await apiPost(`/online/lobbies/${encodeURIComponent(codeUpper)}/join-safe`, {
      code: codeUpper,
      nickname: args.nickname,
      role: args.role || "player",
    });
    return (res?.lobby || res) as OnlineLobby;
  }

  const { data, error } = await supabase
    .from("online_lobbies")
    .select("*")
    .eq("code", codeUpper)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "Impossible de rejoindre ce salon pour le moment.");
  if (!data) throw new Error("Aucun salon trouvé avec ce code.");
  return mapLobbyRow(data as any);
}

async function setLobbyReady(args: { code: string; ready: boolean; nickname?: string; role?: string }): Promise<OnlineLobby> {
  const codeUpper = safeUpper(args.code);
  if (!codeUpper) throw new Error("Code salon manquant.");

  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    const res = await apiPost(`/online/lobbies/${encodeURIComponent(codeUpper)}/ready-safe`, {
      ready: !!args.ready,
      nickname: args.nickname,
      role: args.role || "player",
    });
    return (res?.lobby || res) as OnlineLobby;
  }

  const { user } = await ensureAuthedUser();
  const status = args.ready ? "ready" : "online";

  const { data: lobby, error: lobbyError } = await supabase
    .from("online_lobbies")
    .select("*")
    .eq("code", codeUpper)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lobbyError) throw new Error(lobbyError.message || "Impossible de lire le salon.");
  if (!lobby) throw new Error("Salon introuvable.");

  await supabase
    .from("online_lobby_players")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("lobby_code", codeUpper)
    .eq("user_id", user.id);

  return mapLobbyRow(lobby as any);
}

async function getLobby(code: string): Promise<OnlineLobby> {
  const codeUpper = safeUpper(code);
  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    const res = await apiGet(`/online/lobbies/${encodeURIComponent(codeUpper)}`);
    return (res?.lobby || res) as OnlineLobby;
  }

  const { data, error } = await supabase
    .from("online_lobbies")
    .select("*")
    .eq("code", codeUpper)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "Impossible de lire ce salon.");
  if (!data) throw new Error("Salon introuvable.");
  return mapLobbyRow(data as any);
}

// ✅ A) Lobbies actifs pour page “ONLINE / Spectateur”
async function listActiveLobbies(limit = 50): Promise<OnlineLobby[]> {
  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    const res = await apiGet(`/online/lobbies?limit=${encodeURIComponent(String(limit))}`);
    return Array.isArray(res?.lobbies) ? res.lobbies : [];
  }

  const { data, error } = await supabase
    .from("online_lobbies")
    .select("*")
    .in("status", ["waiting", "started"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => mapLobbyRow(r));
}

// ============================================================
// B) Match live state (online_matches)
// ============================================================
async function startMatch(args: { lobbyCode: string; initialState?: any }): Promise<OnlineMatchRow> {
  const code = safeUpper(args.lobbyCode);

  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    const res = await apiPost("/online/matches/start-safe", {
      lobbyCode: code,
      initialState: args.initialState ?? {},
    });
    return (res?.match || res) as OnlineMatchRow;
  }

  const { user } = await ensureAuthedUser();

  const row = {
    lobby_code: code,
    status: "started",
    state_json: args.initialState ?? {},
    owner_user: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("online_matches")
    .upsert(row as any, { onConflict: "lobby_code" })
    .select("*")
    .single();

  if (!error && data) return data as any;

  const { data: upd, error: updErr } = await supabase
    .from("online_matches")
    .update({ status: "started", state_json: row.state_json })
    .eq("lobby_code", code)
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (updErr) throw new Error(updErr.message || error?.message || "Impossible de démarrer le match.");
  if (!upd) throw new Error("Impossible de démarrer le match (row introuvable).");
  return upd as any;
}

async function updateMatchState(args: { lobbyCode: string; state: any; status?: OnlineMatchStatus }): Promise<void> {
  const code = safeUpper(args.lobbyCode);

  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    await apiPost("/online/matches/state-safe", {
      lobbyCode: code,
      state: args.state ?? {},
      status: args.status,
    });
    return;
  }

  const patch: any = {
    state_json: args.state ?? {},
    updated_at: new Date().toISOString(),
  };
  if (args.status) patch.status = args.status;

  const { error } = await supabase.from("online_matches").update(patch).eq("lobby_code", code);
  if (error) throw new Error(error.message || "Impossible de mettre à jour le match.");
}

async function endMatch(args: { lobbyCode: string; finalState?: any }): Promise<void> {
  const code = safeUpper(args.lobbyCode);

  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    await apiPost("/online/matches/end-safe", {
      lobbyCode: code,
      finalState: args.finalState ?? {},
    });
    return;
  }

  const patch: any = {
    status: "ended",
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (args.finalState !== undefined) patch.state_json = args.finalState;

  const { error } = await supabase.from("online_matches").update(patch).eq("lobby_code", code);
  if (error) throw new Error(error.message || "Impossible de terminer le match.");
}

async function fetchMatchByCode(lobbyCode: string): Promise<OnlineMatchRow | null> {
  const code = safeUpper(lobbyCode);
  if (!code) return null;

  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    const res = await apiGet(`/online/matches/by-code-safe/${encodeURIComponent(code)}`);
    return (res?.match || null) as OnlineMatchRow | null;
  }

  const { data, error } = await supabase
    .from("online_matches")
    .select("*")
    .eq("lobby_code", code)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return ((data || [])[0] as any) || null;
}

type OnlineStreamHandlers = {
  onMatch?: (match: OnlineMatchRow, event?: MessageEvent) => void;
  onLobby?: (lobby: any, event?: MessageEvent) => void;
  onMessage?: (message: any, event?: MessageEvent) => void;
  onEvent?: (payload: any, event?: MessageEvent) => void;
  onOpen?: () => void;
  onError?: (error: any) => void;
};

function subscribeOnlineStream(lobbyCode: string, handlers: OnlineStreamHandlers = {}) {
  const code = safeUpper(lobbyCode);
  if (!code || !useNasOnlineBackend() || typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => {};
  }

  const token = readNasAccessToken();
  const url = buildApiUrl(`/online/stream/${encodeURIComponent(code)}`, token ? { token } : undefined);
  let closed = false;
  const es = new EventSource(url);

  const parse = (event: MessageEvent) => {
    try {
      return event?.data ? JSON.parse(String(event.data)) : null;
    } catch {
      return null;
    }
  };

  const handlePayload = (event: MessageEvent) => {
    const payload = parse(event);
    if (!payload) return;
    handlers.onEvent?.(payload, event);
    const match = payload?.match || payload?.data?.match || null;
    if (match) handlers.onMatch?.(match as OnlineMatchRow, event);
    const lobby = payload?.lobby || payload?.data?.lobby || null;
    if (lobby) handlers.onLobby?.(lobby, event);
    const message = payload?.message || payload?.data?.message || null;
    if (message) handlers.onMessage?.(message, event);
  };

  es.onopen = () => handlers.onOpen?.();
  es.onerror = (error) => {
    if (!closed) handlers.onError?.(error);
  };

  [
    "connected",
    "match:snapshot",
    "match:start",
    "match:update",
    "match:end",
    "lobby:snapshot",
    "lobby:create",
    "lobby:join",
    "lobby:ready",
    "lobby:update",
    "lobby:message",
    "ping",
  ].forEach((name) => es.addEventListener(name, handlePayload as EventListener));
  es.onmessage = handlePayload;

  return () => {
    closed = true;
    try { es.close(); } catch {}
  };
}

// ============================================================
// Matchs “historique” (compat OnlineMatch de ton app)
// ============================================================
function mapOnlineMatchFromRow(row: OnlineMatchRow): OnlineMatch {
  const startedAt = row.created_at ? Date.parse(row.created_at) : now();
  const finishedAt = row.finished_at
    ? Date.parse(row.finished_at)
    : row.status === "ended"
      ? (row.updated_at ? Date.parse(row.updated_at) : startedAt)
      : (row.updated_at ? Date.parse(row.updated_at) : now());

  // On conserve les identifiants racines NAS dans l'objet mappé :
  // ils servent au nettoyage Online pour masquer/supprimer durablement un match
  // même après un refresh qui recharge /online/matches.
  return {
    id: String(row.id),
    matchId: String(row.id),
    onlineMatchId: String(row.id),
    lobbyCode: row.lobby_code || null,
    status: row.status,
    userId: String(row.owner_user || "unknown"),
    mode: String((row as any)?.mode || (row as any)?.state_json?.mode || (row as any)?.state_json?.onlineMode || "x01") as any,
    payload: {
      id: String(row.id),
      matchId: String(row.id),
      onlineMatchId: String(row.id),
      lobbyCode: row.lobby_code,
      status: row.status,
      createdAt: startedAt,
      updatedAt: row.updated_at ? Date.parse(row.updated_at) : finishedAt,
      finishedAt,
      state: row.state_json,
      rawOnlineMatchRow: row,
    },
    isTraining: false,
    startedAt,
    createdAt: startedAt,
    finishedAt,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : finishedAt,
    rawOnlineMatchRow: row,
  } as any;
}

async function uploadMatch(payload: UploadMatchPayload): Promise<OnlineMatch> {
  const lobbyCode = safeUpper((payload as any)?.payload?.lobbyCode || (payload as any)?.payload?.code || "");
  if (!lobbyCode) {
    return {
      id: `no_code_${now()}`,
      userId: "unknown",
      mode: payload.mode,
      payload: payload.payload,
      isTraining: !!payload.isTraining,
      startedAt: payload.startedAt ?? now(),
      finishedAt: payload.finishedAt ?? now(),
    } as any;
  }

  await endMatch({ lobbyCode, finalState: payload.payload });
  const row = await fetchMatchByCode(lobbyCode);
  if (!row) throw new Error("Match introuvable après upload.");
  return mapOnlineMatchFromRow(row);
}

async function listMatches(limit = 50): Promise<OnlineMatch[]> {
  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    const res = await apiGet(`/online/matches?limit=${encodeURIComponent(String(limit))}`);
    const rows = Array.isArray(res?.matches) ? res.matches : [];
    return rows.map((r: any) => mapOnlineMatchFromRow(r as any));
  }

  const { data, error } = await supabase
    .from("online_matches")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => mapOnlineMatchFromRow(r as any));
}


async function uploadMediaAsset(payload: UploadMediaAssetPayload): Promise<ResolvedMediaAsset> {
  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    return await nasUploadMediaAsset(payload as any);
  }
  throw new Error("uploadMediaAsset n'est supporté que via le backend NAS dans cette version.");
}

async function bulkResolveMediaAssets(ids: string[]): Promise<ResolvedMediaAsset[]> {
  const cleanIds = (Array.isArray(ids) ? ids : []).map((v) => String(v || "").trim()).filter(Boolean);
  if (!cleanIds.length) return [];

  if (shouldUseNasForCurrentSession()) {
    await ensureNasSession();
    return await nasBulkResolveMediaAssets(cleanIds);
  }
  return [];
}

async function mediaHealth(): Promise<any> {
  if (shouldUseNasForCurrentSession()) {
    return await nasMediaHealth();
  }
  return { ok: false, provider: "supabase" };
}


// ============================================================
// Export
// ============================================================
export const onlineApi = {
  signup,
  login,
  signupPublic,
  loginPublic,
  signupWithInvitation,
  loginWithInvitation,
  restoreSession,
  ensureAnonymousSession,
  ensureAutoSession,
  logout,
  getCurrentSession,

  resendSignupConfirmation,

  getProfile,

  requestPasswordReset,
  changePassword,
  updateEmail,
  deleteAccount,

  updateProfile,
  uploadAvatarImage,
  uploadMediaAsset,
  bulkResolveMediaAssets,
  mediaHealth,

  pullStoreSnapshot,
  pushStoreSnapshot,

  ping,

  createLobby,
  joinLobby,
  setLobbyReady,
  getLobby,
  listActiveLobbies,

  startMatch,
  updateMatchState,
  endMatch,
  fetchMatchByCode,
  subscribeOnlineStream,

  uploadMatch,
  listMatches,

  USE_MOCK,

  loadAuthFromLS,
}
async function ensureOnlineAuth(): Promise<any> {
  const cached = loadAuthFromLS?.();
  if (cached?.token) { markAuthReady(true); return cached; }
  if (!__authBootstrapPromise) {
    __authBootstrapPromise = restoreSession().then(()=>{}).finally(()=>{ __authBootstrapPromise=null;});
  }
  await __authBootstrapPromise;
  const ok = await waitOnlineAuthReady();
  if (!ok) return null;
  return loadAuthFromLS?.();
}
;