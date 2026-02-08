// ============================================================
// src/lib/onlineApi.ts
// API Mode Online (V7 STABLE -> A+B SPECTATOR READY)
// - Auth / Profil → Supabase (table: profiles)
// - Snapshot cloud du store → Supabase (table: user_store)
// - Salons X01 (lobbies) → Supabase (table: online_lobbies)
// - Matchs online live (state_json) → Supabase (table: online_matches)
//
// ✅ IMPORTANT : PAS de création auto d'utilisateur anonyme.
// ✅ Compat UI: expose ensureAutoSession() (restore only).
// ✅ A: listActiveLobbies()
// ✅ B: startMatch / updateMatchState / endMatch + fetchMatchByCode
// ============================================================

import { supabase } from "./supabaseClient";
import { EventBuffer } from "./sync/EventBuffer";
import { importHistoryFromCloud } from "./sync/CloudHistoryImport";
import type { UserAuth, OnlineProfile, OnlineMatch } from "./onlineTypes";

// ============================================================
// ✅ PGRST204 column-missing fallback (schema cache / tables legacy)
// - Si une table existe mais n'a pas une colonne (ex: profiles_online sans nickname),
//   Supabase renvoie PGRST204.
// - On retire automatiquement la colonne manquante du payload et on retente.
// ============================================================
function extractMissingColumn(err: any): string | null {
  try {
    const msg = String(err?.message ?? "");
    // Ex: "Could not find the 'nickname' column of 'profiles_online' in the schema cache"
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
  token: string; // peut être "" si signup en attente de confirmation email
  user: UserAuth;
  profile: OnlineProfile | null;
};

export type SignupPayload = {
  email?: string;
  nickname: string;
  password?: string;
};

export type LoginPayload = {
  email?: string;
  nickname?: string;
  password?: string;
};

export type UpdateProfilePayload = {
  displayName?: string;
  avatarUrl?: string;
  country?: string;

  surname?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string; // "YYYY-MM-DD"
  city?: string;
  email?: string;
  phone?: string;

  nickname?: string;
};

export type UploadMatchPayload = Omit<
  OnlineMatch,
  "id" | "userId" | "startedAt" | "finishedAt" | "isTraining"
> & {
  startedAt?: number;
  finishedAt?: number;
  isTraining?: boolean;
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
const LS_AUTH_KEY = "dc_online_auth_supabase_v1";

// ============================================================
// ✅ PROFILES TABLE RESOLUTION (compat)
// - Certains projets Supabase historiques utilisent "profiles_online".
// - Ce client privilégie "profiles" mais bascule automatiquement si absent.
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
      // Probe PRIMARY
      const { error } = await supabase.from(PROFILE_TABLE_PRIMARY).select("id").limit(1);
      if (!error) {
        __profilesTableCached = PROFILE_TABLE_PRIMARY;
        return __profilesTableCached;
      }

      // PGRST205 = table/view missing in schema cache
      const code = (error as any)?.code;
      if (code === "PGRST205") {
        const { error: err2 } = await supabase.from(PROFILE_TABLE_FALLBACK).select("id").limit(1);
        if (!err2) {
          __profilesTableCached = PROFILE_TABLE_FALLBACK;
          return __profilesTableCached;
        }
      }

      // Fallback pessimiste
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
  nickname?: string | null; // ✅ optionnel (table legacy peut ne pas avoir la colonne)
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
// Auth helpers
// ============================================================
async function ensureAuthedUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = data?.session?.user;
  const session = data?.session;

  // IMPORTANT: pas de session => on throw (pas d'auto-anon).
  if (!user || !session) throw new Error("Non authentifié (reconnecte-toi).");
  return { user, session };
}

async function getOrCreateProfile(userId: string, fallbackNickname: string): Promise<OnlineProfile | null> {
  const PROFILES_TABLE = await resolveProfilesTable();

  // SELECT
  const { data: profileRow, error: selErr } = await supabase
    .from(PROFILES_TABLE)
    .select("*")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (selErr) {
    console.warn("[onlineApi] profiles select error", selErr);
    // Ne casse pas l'UI si table manquante/RLS: on renvoie null
    return null;
  }

  if (profileRow) return mapProfile(profileRow as any);

  // CREATE (upsert safe + column fallback)
  const payload = {
    id: userId,
    user_id: userId, // ✅ required by Supabase schema (NOT NULL)
    nickname: fallbackNickname,
    display_name: fallbackNickname,
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

  if (res.error) {
    console.warn("[onlineApi] profiles upsert error", res.error);
    return null;
  }

  return mapProfile(res.data as any);
}

async function buildAuthSessionFromSupabase(): Promise<AuthSession | null> {
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

  const userAuth: UserAuth = {
    id: user.id,
    email: user.email ?? undefined,
    nickname,
    createdAt: user.created_at ? Date.parse(user.created_at) : now(),
  };

  const profile = await getOrCreateProfile(user.id, nickname);

  const authSession: AuthSession = {
    token: session?.access_token ?? "",
    user: userAuth,
    profile,
  };

  saveAuthToLS(authSession);
  return authSession;
}

// ============================================================
// ✅ COMPTE UTILISATEUR UNIQUE
// - On NE crée PAS de session anonyme.
// - Si aucune session: on reste signed_out.
//
// NOTE: certaines pages historiques appellent encore ensureAutoSession().
// On le garde en alias vers buildAuthSessionFromSupabase().
// ============================================================
async function ensureAutoSession(): Promise<AuthSession | null> {
  const existing = await buildAuthSessionFromSupabase();
  return existing?.user?.id ? existing : null;
}

// ============================================================
// ✅ BACKCOMPAT — ensureAnonymousSession()
// Certaines anciennes pages utilisaient une "session anonyme".
// Dans l’architecture "compte utilisateur unique", on ne crée
// plus de session anonyme côté Supabase : on renvoie simplement
// la session existante si l’utilisateur est connecté.
// ============================================================
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
async function signup(payload: SignupPayload): Promise<AuthSession> {
  const email = payload.email?.trim();
  const password = payload.password?.trim();
  const nickname = payload.nickname?.trim() || email || "Player";

  if (!email || !password) {
    throw new Error("Pour créer un compte online, email et mot de passe sont requis.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
      emailRedirectTo: getEmailConfirmRedirect(),
    },
  });

  if (error) throw new Error(error.message);

  // Si email confirmation ON : session null au début
  if (!data?.session) {
    const pending: AuthSession = {
      token: "",
      user: {
        id: data?.user?.id || "pending",
        email,
        nickname,
        createdAt: now(),
      },
      profile: null,
    };
    saveAuthToLS(pending);
    return pending;
  }

  const live = await buildAuthSessionFromSupabase();
  if (!live) throw new Error("Compte créé mais session introuvable (réessaie).");
  return live;
}

async function login(payload: LoginPayload): Promise<AuthSession> {
  const email = payload.email?.trim();
  const password = payload.password?.trim();

  if (!email || !password) {
    throw new Error("Email et mot de passe sont requis pour se connecter.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(normalizeAuthErrorMessage(error.message));

  const session = await buildAuthSessionFromSupabase();
  if (!session) throw new Error("Impossible de récupérer la session après la connexion.");
  return session;
}

// ============================================================
// ✅ HASH-ROUTER AUTH (/#/auth/...) — robust parser
// - En PKCE, Supabase renvoie souvent `?code=...`.
// - En implicit (ou selon config), on peut recevoir `#access_token=...`.
// - Avec un hash-router, ces paramètres peuvent se retrouver DANS window.location.hash.
//
// Cette fonction tente de créer la session à partir de l'URL si nécessaire.
// Elle est idempotente: si aucune info auth n'est présente, elle ne fait rien.
// ============================================================
async function maybeConsumeAuthRedirectFromHash(): Promise<void> {
  if (typeof window === "undefined") return;

  const rawHash = String(window.location.hash || "");
  if (!rawHash) return;

  // Exemple: "#/auth/callback?code=XXXX"
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

  // Exemple: "#/auth/callback#access_token=...&refresh_token=..."
  // ou "#access_token=...&refresh_token=..." (rare)
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

// ✅ V7 : restoreSession = RESTORE UNIQUEMENT (pas de création d'utilisateur)
async function restoreSession(): Promise<AuthSession | null> {
  try {
    // Hash-router: si on arrive d'un email Supabase, on tente de consommer l'URL.
    await maybeConsumeAuthRedirectFromHash();

    const s = await buildAuthSessionFromSupabase();
    saveAuthToLS(s);

    // ✅ opportuniste: flush des événements locaux vers Supabase dès qu'on a un uid
    try {
      EventBuffer.syncNow().catch(() => {});
    } catch {}

    // ✅ opportuniste: pull léger du cloud -> History (multi-device)
    // (best-effort, paginé, ne casse jamais le boot)
    try {
      importHistoryFromCloud({ maxPages: 2, pageSize: 150 }).catch(() => {});
    } catch {}
    return s;
  } catch (e) {
    console.warn("[onlineApi] restoreSession error", e);
    saveAuthToLS(null);
    return null;
  }
}

async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) console.warn("[onlineApi] logout error", error);
  saveAuthToLS(null);
}

async function getCurrentSession(): Promise<AuthSession | null> {
  return await restoreSession();
}

async function getProfile(): Promise<OnlineProfile | null> {
  const s = await restoreSession();
  return s?.profile ?? null;
}

// ✅ Renvoi email confirmation
async function resendSignupConfirmation(email: string): Promise<void> {
  const e = email.trim();
  if (!e) throw new Error("Email requis.");

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
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Adresse mail requise pour réinitialiser le mot de passe.");

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: getResetPasswordRedirect(),
  });
  if (error) throw new Error(error.message);
}

async function updateEmail(newEmail: string): Promise<void> {
  const trimmed = newEmail.trim();
  if (!trimmed) throw new Error("Nouvelle adresse mail invalide.");

  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) throw new Error(error.message);
}

async function deleteAccount(): Promise<void> {
  await ensureAuthedUser();

  const { data, error } = await supabase.functions.invoke("delete-account");
  if (error) throw new Error(error.message || "Suppression impossible (Edge Function).");
  if ((data as any)?.error) throw new Error((data as any).error);

  await supabase.auth.signOut();
  saveAuthToLS(null);
}

// ============================================================
// Profil
// ============================================================
async function updateProfile(patch: UpdateProfilePayload): Promise<OnlineProfile> {
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

  const res = await writeWithColumnFallback<any>(
    async (obj) => {
      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .update(obj as any)
        .eq("id", userId)
        .select()
        .single();
      return { data, error };
    },
    dbPatch,
    { debugLabel: `profiles update (${PROFILES_TABLE})` }
  );

  if (res.error) throw new Error(res.error.message || "Erreur updateProfile.");

  const profile = mapProfile(res.data as any);

  const current = loadAuthFromLS();
  if (current?.user?.id === userId) {
    saveAuthToLS({ ...current, profile });
  }

  return profile;
}

// ============================================================
// Avatar Storage (bucket: avatars public)
// ============================================================
async function uploadAvatarImage(opts: { dataUrl: string; folder?: string }): Promise<{ publicUrl: string; path: string }> {
  const { dataUrl } = opts;
  const { user } = await ensureAuthedUser();

  const folder = user.id;

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

  await updateProfile({ avatarUrl: publicUrl });

  return { publicUrl, path };
}

// ============================================================
// Cloud store snapshot (user_store) — store-direct
// ============================================================
async function pullStoreSnapshot(): Promise<{
  status: "ok" | "not_found" | "error";
  payload?: any;
  updatedAt?: string | null;
  version?: number | null;
  error?: any;
}> {
  try {
    const { user } = await ensureAuthedUser();

    // ✅ Compat schémas: certaines versions utilisent `payload`, d'autres `data`/`store`
    // ✅ Compat clé: certaines versions utilisent `user_id`, d'autres `owner_user_id`
    const selectCols = "payload,data,store,updated_at,version";
    let data: any = null;
    let error: any = null;

    // A) user_id
    {
      const r = await supabase.from("user_store").select(selectCols).eq("user_id", user.id).maybeSingle();
      data = r.data as any;
      error = r.error as any;
    }

    // B) fallback owner_user_id si colonne absente / schéma legacy
    if (error) {
      const msg = String((error as any)?.message || error);
      const lower = msg.toLowerCase();
      const looksMissingUserId =
        lower.includes("could not find the 'user_id' column") ||
        (lower.includes("column") && lower.includes("user_id") && lower.includes("does not exist")) ||
        String((error as any)?.code || "") === "PGRST204";

      if (looksMissingUserId) {
        const r2 = await supabase.from("user_store").select(selectCols).eq("owner_user_id", user.id).maybeSingle();
        data = r2.data as any;
        error = r2.error as any;
      }
    }

    if (!data && !error) return { status: "not_found", payload: null, updatedAt: null, version: null };
    if (error) return { status: "error", error };

    const payload = (data as any)?.payload ?? (data as any)?.data ?? (data as any)?.store ?? null;
    return {
      status: "ok",
      payload,
      updatedAt: (data as any)?.updated_at ?? null,
      version: (data as any)?.version ?? null,
    };
  } catch (e) {
    return { status: "error", error: e };
  }
}

async function pushStoreSnapshot(payload: any, version = 8): Promise<void> {
  const { user } = await ensureAuthedUser();

  // ✅ On écrit `payload` (schéma principal) + legacy `data/store` si colonnes existent
  // ✅ Compat clé: `user_id` OU `owner_user_id` selon ton schéma Supabase
  const base: any = {
    user_id: user.id,
    owner_user_id: user.id,
    version,
    updated_at: new Date().toISOString(),
    payload,
    data: payload,
    store: payload,
  };

  // 1) Essai upsert sur user_id
  const tryUpsert = async (obj: any, onConflict: "user_id" | "owner_user_id") => {
    return await writeWithColumnFallback<any>(
      async (cleanObj) => {
        const { data, error } = await supabase.from("user_store").upsert(cleanObj as any, { onConflict } as any);
        return { data, error };
      },
      obj,
      { debugLabel: `user_store upsert (${onConflict})` }
    );
  };

  let res = await tryUpsert(base, "user_id");

  // 2) Si ça échoue parce que user_id n'existe pas, retry owner_user_id
  if (res.error) {
    const msg = String((res.error as any)?.message || res.error);
    const lower = msg.toLowerCase();
    const looksMissingUserId =
      lower.includes("could not find the 'user_id' column") ||
      (lower.includes("column") && lower.includes("user_id") && lower.includes("does not exist")) ||
      String((res.error as any)?.code || "") === "PGRST204";

    if (looksMissingUserId) {
      res = await tryUpsert(base, "owner_user_id");
    }
  }

  if (res.error) throw new Error(res.error.message || String(res.error));
}

// ============================================================
// ONLINE SERVER PING (safe)
// - Vérifie que Supabase + table online_lobbies répondent
// - "permission denied" => serveur OK mais auth requise
// ============================================================
export type PingResult = { ok: true; authRequired?: boolean };

async function ping(): Promise<PingResult> {
  const { error } = await supabase.from("online_lobbies").select("id").limit(1);

  if (error) {
    const msg = String((error as any).message || error).toLowerCase();
    if (msg.includes("permission")) return { ok: true, authRequired: true };
    throw error;
  }

  return { ok: true };
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

// ✅ A) Lobbies actifs pour page “ONLINE / Spectateur”
async function listActiveLobbies(limit = 50): Promise<OnlineLobby[]> {
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

// Start/upsert a match row for a lobby
async function startMatch(args: { lobbyCode: string; initialState?: any }): Promise<OnlineMatchRow> {
  const { user } = await ensureAuthedUser();
  const code = safeUpper(args.lobbyCode);

  const row = {
    lobby_code: code,
    status: "started",
    state_json: args.initialState ?? {},
    owner_user: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // onConflict sur lobby_code si tu as un unique index. Si pas unique: ça fera insert multiple.
  // => On gère en upsert "best effort" : si erreur, on tente update.
  const { data, error } = await supabase
    .from("online_matches")
    .upsert(row as any, { onConflict: "lobby_code" })
    .select("*")
    .single();

  if (!error && data) return data as any;

  // fallback: update existing
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

// Update live state_json (debounce côté caller si besoin)
async function updateMatchState(args: { lobbyCode: string; state: any; status?: OnlineMatchStatus }): Promise<void> {
  const code = safeUpper(args.lobbyCode);
  const patch: any = {
    state_json: args.state ?? {},
    updated_at: new Date().toISOString(),
  };
  if (args.status) patch.status = args.status;

  const { error } = await supabase.from("online_matches").update(patch).eq("lobby_code", code);
  if (error) throw new Error(error.message || "Impossible de mettre à jour le match.");
}

// End match
async function endMatch(args: { lobbyCode: string; finalState?: any }): Promise<void> {
  const code = safeUpper(args.lobbyCode);
  const patch: any = {
    status: "ended",
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (args.finalState !== undefined) patch.state_json = args.finalState;

  const { error } = await supabase.from("online_matches").update(patch).eq("lobby_code", code);
  if (error) throw new Error(error.message || "Impossible de terminer le match.");
}

// Fetch match row (for spectator)
async function fetchMatchByCode(lobbyCode: string): Promise<OnlineMatchRow | null> {
  const code = safeUpper(lobbyCode);
  if (!code) return null;

  const { data, error } = await supabase
    .from("online_matches")
    .select("*")
    .eq("lobby_code", code)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return ((data || [])[0] as any) || null;
}

// ============================================================
// Matchs “historique” (compat OnlineMatch de ton app)
// -> on mappe depuis online_matches si tu veux les afficher dans FriendsPage
// ============================================================
function mapOnlineMatchFromRow(row: OnlineMatchRow): OnlineMatch {
  return {
    id: String(row.id),
    userId: String(row.owner_user || "unknown"),
    mode: "x01",
    payload: {
      lobbyCode: row.lobby_code,
      state: row.state_json,
    },
    isTraining: false,
    startedAt: row.created_at ? Date.parse(row.created_at) : now(),
    finishedAt: row.finished_at
      ? Date.parse(row.finished_at)
      : row.status === "ended"
        ? now()
        : now(),
  } as any;
}

async function uploadMatch(payload: UploadMatchPayload): Promise<OnlineMatch> {
  // Ici on conserve le “match final” dans online_matches.state_json
  // et on marque ended.
  // NOTE: si tu as un flux matchId dédié plus tard, on améliorera.
  const lobbyCode = safeUpper((payload as any)?.payload?.lobbyCode || (payload as any)?.payload?.code || "");
  if (!lobbyCode) {
    // fallback: ne pas casser si appel sans code
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

  // final state = payload.payload
  await endMatch({ lobbyCode, finalState: payload.payload });
  const row = await fetchMatchByCode(lobbyCode);
  if (!row) throw new Error("Match introuvable après upload.");
  return mapOnlineMatchFromRow(row);
}

async function listMatches(limit = 50): Promise<OnlineMatch[]> {
  const { data, error } = await supabase
    .from("online_matches")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => mapOnlineMatchFromRow(r as any));
}

// ============================================================
// Export
// ============================================================
export const onlineApi = {
  // Auth
  signup,
  login,
  restoreSession,
  ensureAnonymousSession,
  ensureAutoSession, // ✅ compat UI
  logout,
  getCurrentSession,

  // Signup confirm resend
  resendSignupConfirmation,

  // Profil (helper)
  getProfile,

  // Gestion compte
  requestPasswordReset,
  updateEmail,
  deleteAccount,

  // Profil
  updateProfile,
  uploadAvatarImage,

  // Snapshot cloud
  pullStoreSnapshot,
  pushStoreSnapshot,

  // Ping serveur
  ping,

  // Salons
  createLobby,
  joinLobby,
  listActiveLobbies, // ✅ A

  // Match live
  startMatch, // ✅ B
  updateMatchState, // ✅ B
  endMatch, // ✅ B
  fetchMatchByCode, // ✅ B

  // Matchs (list/history)
  uploadMatch,
  listMatches,

  // Info
  USE_MOCK,

  // debug
  loadAuthFromLS,
};