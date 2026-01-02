// ============================================================
// src/lib/onlineApi.ts
// API Mode Online
// - Auth / Profil / Matchs → Supabase
// - Salons X01 (lobbies) → Supabase ("online_lobbies")
// - Snapshot cloud du store → Supabase ("user_store") ✅ (table vue sur tes captures)
// - Surface d'API unique pour le front
// ============================================================

// ✅ IMPORTANT : un seul client Supabase partout
import { supabase } from "./supabaseClient";

import type { UserAuth, OnlineProfile, OnlineMatch } from "./onlineTypes";

// --------------------------------------------
// Types publics de l'API (auth / profils / matchs)
// --------------------------------------------

export type AuthSession = {
  token: string; // peut être "" si signup en attente de confirmation email
  user: UserAuth;
  profile: OnlineProfile | null;
};

export type SignupPayload = {
  email?: string;
  nickname: string;
  password?: string; // requis pour Supabase
};

export type LoginPayload = {
  email?: string;
  nickname?: string;
  password?: string; // requis pour Supabase
};

// PATCH profil : on ajoute ici TOUTES les infos perso
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

  // bonus (si tu veux l'éditer)
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
// Types Lobbies (Supabase "online_lobbies")
// --------------------------------------------

export type OnlineLobbySettings = {
  start: number;
  doubleOut: boolean;
  [k: string]: any;
};

export type OnlineLobby = {
  id: string;
  code: string; // "4F9Q"
  mode: string; // "x01"
  maxPlayers: number;
  hostUserId: string;
  hostNickname: string;
  settings: OnlineLobbySettings;
  status: string; // "waiting" | "running" | ...
  createdAt: string;
};

// --------------------------------------------
// Config / helpers locaux
// --------------------------------------------

const USE_MOCK = false;
const LS_AUTH_KEY = "dc_online_auth_supabase_v1";

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

// ✅ Redirects STABLES (évite webcontainer/stackblitz)
// - On force l'URL PROD via VITE_SITE_URL (Cloudflare Pages)
// - Fallback hardcodé si la variable n'est pas set
function getSiteUrl(): string {
  const fromEnv =
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_SITE_URL) ||
    "";

  const SITE_URL = String(fromEnv || "https://darts-counter-v7.pages.dev").trim();

  // Sécurités: pas de slash final
  return SITE_URL.replace(/\/+$/, "");
}

function getEmailConfirmRedirect(): string {
  // ⚠️ IMPORTANT : callback en hash car tu utilises HashRouter (#/)
  return `${getSiteUrl()}/#/auth/callback`;
}

function getResetPasswordRedirect(): string {
  // callback reset mdp
  return `${getSiteUrl()}/#/auth/reset`;
}

// ============================================================
// 🖼️ Helpers image (dataUrl -> Blob) — AVATAR STORAGE
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
// 1) PARTIE SUPABASE (Auth / Profils / Matchs)
// ============================================================

// --------------------------------------------
// Mapping Supabase -> types de l'app
// --------------------------------------------

// ✅ D'après tes captures, la table s'appelle "profiles"
type SupabaseProfileRow = {
  id: string;
  nickname: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  created_at: string | null;
  updated_at: string | null;

  // infos perso (si présentes)
  surname?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;

  // compat
  bio?: string | null;
  stats?: any | null;
};

function mapProfile(row: SupabaseProfileRow): OnlineProfile {
  return {
    id: row.id,
    userId: row.id,
    displayName: row.display_name ?? row.nickname ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    country: row.country ?? undefined,

    surname: row.surname ?? "",
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    birthDate: row.birth_date ?? null,
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
  };
}

// Table d’historique : "matches_online" (si elle existe chez toi)
type SupabaseMatchRow = {
  id: string;
  user_id: string;
  mode: string;
  payload: any;
  created_at: string | null;
};

function mapMatch(row: SupabaseMatchRow): OnlineMatch {
  const t = row.created_at ? Date.parse(row.created_at) : now();
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode,
    payload: row.payload,
    isTraining: false,
    startedAt: t,
    finishedAt: t,
  };
}

// Lobbies : table "online_lobbies"
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
    settings: (row.settings as OnlineLobbySettings) || { start: 501, doubleOut: true },
    status: row.status || "waiting",
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// --------------------------------------------
// Helpers AUTH Supabase
// --------------------------------------------

async function ensureAuthedUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data?.session?.user;
  if (!user) throw new Error("Non authentifié (reconnecte-toi).");
  return { user, session: data.session! };
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

  const userAuth: UserAuth = {
    id: user.id,
    email: user.email ?? undefined,
    nickname: meta?.nickname || user.email || "Player",
    createdAt: user.created_at ? Date.parse(user.created_at) : now(),
  };

  // ✅ Profil = table "profiles" (id == auth.users.id)
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();

  let profile: OnlineProfile | null = null;

  if (profileError) {
    console.warn("[onlineApi] profiles select error", profileError);
  } else if (profileRow) {
    profile = mapProfile(profileRow as unknown as SupabaseProfileRow);
  } else {
    // création profil au 1er login
    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        nickname: meta?.nickname ?? user.email ?? "Player",
        display_name: meta?.nickname ?? user.email ?? "Player",
        country: null,
        avatar_url: null,
      })
      .select()
      .single();

    if (createError) {
      console.warn("[onlineApi] profiles insert error", createError);
    } else {
      profile = mapProfile(created as unknown as SupabaseProfileRow);
    }
  }

  const authSession: AuthSession = {
    token: session?.access_token ?? "",
    user: userAuth,
    profile,
  };

  saveAuthToLS(authSession);
  return authSession;
}

// --------------------------------------------
// Fonctions publiques : AUTH
// --------------------------------------------

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
      // ✅ IMPORTANT : redirection stable (StackBlitz change souvent d'URL)
      emailRedirectTo: getEmailConfirmRedirect(),
    },
  });

  if (error) {
    console.error("[onlineApi] signup error", error);
    throw new Error(error.message);
  }

  // ⚠️ Si confirmation email activée : pas de session tout de suite.
  // On renvoie une session "pending" (token = "") pour que le front affiche "check tes mails".
  const createdUser = data?.user;
  const createdSession = data?.session;

  if (!createdSession) {
    const pending: AuthSession = {
      token: "",
      user: {
        id: createdUser?.id || "pending",
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

  if (error) {
    console.error("[onlineApi] login error", error);
    throw new Error(error.message);
  }

  const session = await buildAuthSessionFromSupabase();
  if (!session) {
    throw new Error("Impossible de récupérer la session après la connexion.");
  }

  return session;
}

async function restoreSession(): Promise<AuthSession | null> {
  // Source de vérité : Supabase (toujours)
  const live = await buildAuthSessionFromSupabase();

  // Si Supabase dit "pas de session", on purge le cache local
  if (!live?.user || !live.token) {
    saveAuthToLS(null);
    return null;
  }

  return live;
}

async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) console.warn("[onlineApi] logout error", error);
  saveAuthToLS(null);
}

async function getCurrentSession(): Promise<AuthSession | null> {
  return await restoreSession();
}

// --------------------------------------------
// Fonctions publiques : GESTION COMPTE
// --------------------------------------------

async function requestPasswordReset(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Adresse mail requise pour réinitialiser le mot de passe.");

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    // ✅ IMPORTANT : redirect stable
    redirectTo: getResetPasswordRedirect(),
  });

  if (error) {
    console.error("[onlineApi] requestPasswordReset error", error);
    throw new Error(error.message);
  }
}

async function updateEmail(newEmail: string): Promise<void> {
  const trimmed = newEmail.trim();
  if (!trimmed) throw new Error("Nouvelle adresse mail invalide.");

  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) {
    console.error("[onlineApi] updateEmail error", error);
    throw new Error(error.message);
  }
}

// --------------------------------------------
// Fonctions publiques : PROFIL
// --------------------------------------------

async function updateProfile(patch: UpdateProfilePayload): Promise<OnlineProfile> {
  const { user } = await ensureAuthedUser();
  const userId = user.id;

  // DB patch → snake_case
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

  const { data, error } = await supabase
    .from("profiles")
    .update(dbPatch)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("[onlineApi] updateProfile error", error);
    throw new Error(error.message);
  }

  const profile = mapProfile(data as unknown as SupabaseProfileRow);

  // met à jour cache LS si on a une session
  const current = loadAuthFromLS();
  if (current?.user?.id === userId) {
    saveAuthToLS({ ...current, profile });
  }

  return profile;
}

// ✅ AVATAR : Storage bucket "avatars" (public)
// Path : {userId}/avatar.ext
async function uploadAvatarImage(args: { dataUrl: string }): Promise<{ publicUrl: string; path: string }> {
  const { user } = await ensureAuthedUser();

  const blob = dataUrlToBlob(args.dataUrl);
  const mime = (blob as any).type || "image/png";
  const ext = extFromMime(mime);

  const path = `${user.id}/avatar.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: mime, upsert: true });

  if (upErr) {
    console.error("[onlineApi] uploadAvatarImage error", upErr);
    throw new Error(upErr.message);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) throw new Error("Impossible de récupérer l’URL publique de l’avatar.");

  await updateProfile({ avatarUrl: publicUrl });

  return { publicUrl, path };
}

// --------------------------------------------
// Fonctions publiques : MATCHS ONLINE
// --------------------------------------------

async function uploadMatch(payload: UploadMatchPayload): Promise<OnlineMatch> {
  const { user } = await ensureAuthedUser();

  const { data, error } = await supabase
    .from("matches_online")
    .insert({
      user_id: user.id,
      mode: payload.mode,
      payload: payload.payload,
    })
    .select()
    .single();

  if (error) {
    console.error("[onlineApi] uploadMatch error", error);
    throw new Error(error.message);
  }

  return mapMatch(data as unknown as SupabaseMatchRow);
}

async function listMatches(limit = 50): Promise<OnlineMatch[]> {
  const { user } = await ensureAuthedUser();

  const { data, error } = await supabase
    .from("matches_online")
    .select("*")
    .eq("user_id", user.id) // ✅ important : ne pas récupérer ceux des autres
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[onlineApi] listMatches error", error);
    throw new Error(error.message);
  }

  return (data as SupabaseMatchRow[]).map(mapMatch);
}

// ============================================================
// 3) CLOUD STORE SNAPSHOT (SOURCE UNIQUE DES DONNÉES)
// ✅ Table vue chez toi : "user_store"
// colonnes: user_id (uuid), version (int), updated_at (timestamptz), data (jsonb)
// ============================================================

type UserStoreRow = {
  user_id: string;
  version: number | null;
  updated_at: string | null;
  data: any;
};

async function pullStoreSnapshot(): Promise<{
  status: "ok" | "not_found" | "error";
  payload?: any;
  updatedAt?: string | null;
  version?: number | null;
  error?: any;
}> {
  try {
    const { user } = await ensureAuthedUser();

    const { data, error } = await supabase
      .from("user_store")
      .select("data,updated_at,version")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!data && !error) {
      return { status: "not_found", payload: null, updatedAt: null, version: null };
    }

    if (error) {
      console.warn("[pullStoreSnapshot] error", error);
      return { status: "error", error };
    }

    return {
      status: "ok",
      payload: (data as any)?.data ?? null,
      updatedAt: (data as any)?.updated_at ?? null,
      version: (data as any)?.version ?? null,
    };
  } catch (e) {
    return { status: "error", error: e };
  }
}

async function pushStoreSnapshot(payload: any, version = 1): Promise<void> {
  const { user } = await ensureAuthedUser();

  const row: UserStoreRow = {
    user_id: user.id,
    version,
    updated_at: new Date().toISOString(),
    data: payload,
  };

  const { error } = await supabase.from("user_store").upsert(row, { onConflict: "user_id" });

  if (error) {
    console.warn("[onlineApi] pushStoreSnapshot error", error);
    throw new Error(error.message);
  }
}

// ============================================================
// 2) Salons X01 ONLINE (Supabase "online_lobbies")
// ============================================================

function generateLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function createLobby(args: {
  mode: string; // "x01"
  maxPlayers: number;
  settings: OnlineLobbySettings;
}): Promise<OnlineLobby> {
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

    if (!error && data) return mapLobbyRow(data as SupabaseLobbyRow);

    lastError = error;
    if (error && (error as any).code === "23505") continue; // code déjà pris
    console.error("[onlineApi] createLobby error", error);
    break;
  }

  throw new Error(lastError?.message || "Impossible de créer un salon online pour le moment.");
}

async function joinLobby(args: { code: string; userId: string; nickname: string }): Promise<OnlineLobby> {
  const codeUpper = args.code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("online_lobbies")
    .select("*")
    .eq("code", codeUpper)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[onlineApi] joinLobby error", error);
    throw new Error(error.message || "Impossible de rejoindre ce salon pour le moment.");
  }

  if (!data) throw new Error("Aucun salon trouvé avec ce code.");
  return mapLobbyRow(data as SupabaseLobbyRow);
}

// --------------------------------------------
// Export API unique
// --------------------------------------------

export const onlineApi = {
  // Auth
  signup,
  login,
  restoreSession,
  logout,
  getCurrentSession,

  // Gestion compte
  requestPasswordReset,
  updateEmail,

  // Profil
  updateProfile,
  uploadAvatarImage,

  // Matchs
  uploadMatch,
  listMatches,

  // Snapshot cloud
  pullStoreSnapshot,
  pushStoreSnapshot,

  // Salons
  createLobby,
  joinLobby,

  // Info
  USE_MOCK,

  // debug
  loadAuthFromLS,
};
