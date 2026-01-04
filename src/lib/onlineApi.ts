// ============================================================
// src/lib/onlineApi.ts
// API Mode Online (V7 STABLE -> V8 AUTO-SESSION)
// - Auth / Profil → Supabase (table: profiles)
// - Snapshot cloud du store → Supabase (table: user_store)
// - Salons X01 (lobbies) → Supabase (table: online_lobbies)
// ✅ IMPORTANT : AUCUNE référence à profiles_online / matches_online
// ✅ Matchs online : désactivés (fallback safe)
// ✅ NEW : resend confirmation + message email_not_confirmed
// ✅ V8 : AUTO-LOGIN (anon) + store snapshot store-direct
// ============================================================

import { supabase } from "./supabaseClient";
import type { UserAuth, OnlineProfile, OnlineMatch } from "./onlineTypes";

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
// Config
// --------------------------------------------
const USE_MOCK = false;

// Matchs online désactivés tant que tu n’as pas de table dédiée
const ONLINE_MATCHES_ENABLED = false;

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
  nickname: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  created_at: string | null;
  updated_at: string | null;

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

  let user = data?.session?.user;
  let session = data?.session;

  // ✅ V8: si pas de session, on tente de créer une session auto
  if (!user) {
    try {
      await ensureAutoSession();
      const again = await supabase.auth.getSession();
      if (again.error) throw again.error;
      user = again.data?.session?.user;
      session = again.data?.session;
    } catch (e) {
      // Cas important: compte créé mais email pas encore confirmé.
      // Dans ce cas, on NE doit PAS fabriquer une session anonyme.
      const msg = String((e as any)?.message || e || "");
      if (msg.includes("email_not_confirmed_pending")) {
        throw new Error(
          "Email non confirmé. Clique sur le lien reçu par email, puis reconnecte-toi."
        );
      }
      // on retombe sur l’erreur standard
    }
  }

  if (!user || !session) throw new Error("Non authentifié (reconnecte-toi).");
  return { user, session };
}

async function getOrCreateProfile(
  userId: string,
  fallbackNickname: string
): Promise<OnlineProfile | null> {
  // SELECT
  const { data: profileRow, error: selErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (selErr) {
    console.warn("[onlineApi] profiles select error", selErr);
    return null;
  }

  if (profileRow) return mapProfile(profileRow as any);

  // CREATE (upsert safe)
  const { data: created, error: upErr } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        nickname: fallbackNickname,
        display_name: fallbackNickname,
        country: null,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (upErr) {
    console.warn("[onlineApi] profiles upsert error", upErr);
    return null;
  }

  return mapProfile(created as any);
}

async function buildAuthSessionFromSupabase(): Promise<AuthSession | null> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
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
// ✅ V8 AUTO-SESSION
// (à placer ici : "juste après ensureAuthedUser()" comme demandé)
// ============================================================
async function ensureAutoSession(): Promise<AuthSession> {
  // 1) si session existe déjà -> ok
  let live = await buildAuthSessionFromSupabase();
  if (live?.token) return live;

  // 1bis) si on a un compte "en attente de vérification" stocké en local,
  // on NE crée PAS une session anonyme (sinon mélange d'identités).
  // => l'utilisateur doit confirmer son email puis se reconnecter.
  try {
    const pending = loadAuthFromLS();
    const hasEmail = !!pending?.user?.email;
    const hasUserId = !!pending?.user?.id && pending?.user?.id !== "pending";
    const hasToken = !!pending?.token;
    if (hasUserId && hasEmail && !hasToken) {
      throw new Error("email_not_confirmed_pending");
    }
  } catch (e) {
    // si on a volontairement throw, on laisse remonter
    if (String((e as any)?.message || "").includes("email_not_confirmed_pending")) throw e;
  }

  // 2) sinon -> anonymous sign-in
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message);

  // 3) rebuild session
  live = await buildAuthSessionFromSupabase();
  if (!live?.token) throw new Error("Impossible de créer/restaurer une session anonyme.");

  // 4) garantir profile row
  try {
    const fallback = `Player-${live.user.id.slice(0, 5)}`;
    await getOrCreateProfile(live.user.id, fallback);
  } catch {}

  return live;
}

// ============================================================
// Error mapping (login)
// ============================================================
function normalizeAuthErrorMessage(msg: string) {
  const m = String(msg || "").toLowerCase();

  // supabase renvoie souvent "Email not confirmed"
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
    return "Email non confirmé. Clique sur le lien reçu par email, puis réessaie (ou renvoie l’email de confirmation).";
  }

  if (m.includes("invalid login credentials")) {
    return "Identifiants invalides (email ou mot de passe).";
  }

  // parfois: "User not found"
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

// ✅ V8 : restoreSession = auto session garantie
async function restoreSession(): Promise<AuthSession | null> {
  try {
    const s = await ensureAutoSession();
    saveAuthToLS(s);
    return s;
  } catch (e) {
    const msg = String((e as any)?.message || e || "");
    // ✅ si le compte est en attente de confirmation, on garde le snapshot local (ne pas écraser)
    if (msg.includes("email_not_confirmed_pending")) {
      const keep = loadAuthFromLS();
      return keep;
    }
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

// Petit helper pratique pour les écrans “profil”
async function getProfile(): Promise<OnlineProfile | null> {
  const s = await restoreSession();
  return s?.profile ?? null;
}

// ✅ Renvoi email confirmation (pour les comptes “Waiting for verification”)
async function resendSignupConfirmation(email: string): Promise<void> {
  const e = email.trim();
  if (!e) throw new Error("Email requis.");

  // supabase-js v2
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

// ✅ Suppression compte : Edge Function + cleanup local (comme demandé)
async function deleteAccount(): Promise<void> {
  // on garde ensureAuthedUser pour récupérer user (utile au besoin)
  await ensureAuthedUser();

  const { data, error } = await supabase.functions.invoke("delete-account");
  if (error) throw new Error(error.message || "Suppression impossible (Edge Function).");
  if ((data as any)?.error) throw new Error((data as any).error);

  // local cleanup
  await supabase.auth.signOut();
  saveAuthToLS(null);
}

// ============================================================
// Profil
// ============================================================
async function updateProfile(patch: UpdateProfilePayload): Promise<OnlineProfile> {
  const { user } = await ensureAuthedUser();
  const userId = user.id;

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

  if (error) throw new Error(error.message);

  const profile = mapProfile(data as any);

  const current = loadAuthFromLS();
  if (current?.user?.id === userId) {
    saveAuthToLS({ ...current, profile });
  }

  return profile;
}

// ============================================================
// Avatar Storage (bucket: avatars public)
// ✅ path: {auth.uid()}/avatar-{timestamp}.ext
// ✅ folder DOIT être auth.uid() (user.id)
// ============================================================
async function uploadAvatarImage(opts: {
  dataUrl: string;
  folder?: string; // ✅ optionnel (on force user.id)
}): Promise<{ publicUrl: string; path: string }> {
  const { dataUrl } = opts;

  const { user } = await ensureAuthedUser();

  // 🔒 sécurité : on force folder = user.id (ignore opts.folder)
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
  if (!publicUrl) {
    throw new Error("Impossible de récupérer l’URL publique de l’avatar.");
  }

  // ✅ synchro profil Supabase (avatar_url)
  await updateProfile({ avatarUrl: publicUrl });

  return { publicUrl, path };
}

// ============================================================
// Cloud store snapshot (user_store) — STORE UNIQUE
// - Schéma cible: user_store(user_id uuid PK, store jsonb, updated_at timestamptz)
// - Compat: si une ancienne colonne "data" existe (ancien snapshot), on lit/écrit aussi.
// ============================================================
async function pullStoreSnapshot(): Promise<{
  status: "ok" | "not_found" | "error";
  payload?: any;
  updatedAt?: string | null;
  error?: any;
}> {
  try {
    const { user } = await ensureAuthedUser();

    // 1) Schéma sain: colonne "store"
    const res1 = await supabase
      .from("user_store")
      .select("store,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    // si la colonne n'existe pas, Supabase renvoie une erreur -> fallback "data"
    if (res1.error) {
      const msg = String((res1.error as any)?.message || "");
      const isMissingStoreCol = msg.toLowerCase().includes("store") && msg.toLowerCase().includes("column");
      if (!isMissingStoreCol) return { status: "error", error: res1.error };

      const res2 = await supabase
        .from("user_store")
        .select("data,updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!res2.data && !res2.error) return { status: "not_found", payload: null, updatedAt: null };
      if (res2.error) return { status: "error", error: res2.error };

      return {
        status: "ok",
        payload: (res2.data as any)?.data ?? null,
        updatedAt: (res2.data as any)?.updated_at ?? null,
      };
    }

    if (!res1.data && !res1.error) return { status: "not_found", payload: null, updatedAt: null };
    if (res1.error) return { status: "error", error: res1.error };

    return {
      status: "ok",
      payload: (res1.data as any)?.store ?? null,
      updatedAt: (res1.data as any)?.updated_at ?? null,
    };
  } catch (e) {
    return { status: "error", error: e };
  }
}

async function pushStoreSnapshot(storePayload: any, _version?: number): Promise<void> {
  const { user } = await ensureAuthedUser();

  // 1) Schéma sain: colonne "store"
  const row1: any = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
    store: storePayload,
  };

  const res1 = await supabase.from("user_store").upsert(row1, { onConflict: "user_id" });
  if (!res1.error) return;

  // fallback si colonne store absente (ancien schéma -> "data")
  const msg = String((res1.error as any)?.message || "");
  const isMissingStoreCol = msg.toLowerCase().includes("store") && msg.toLowerCase().includes("column");
  if (!isMissingStoreCol) throw new Error((res1.error as any)?.message || "pushStoreSnapshot failed");

  const row2: any = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
    data: storePayload,
  };

  const res2 = await supabase.from("user_store").upsert(row2, { onConflict: "user_id" });
  if (res2.error) throw new Error((res2.error as any)?.message || "pushStoreSnapshot failed");
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

async function createLobby(args: {
  mode: string;
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

    if (!error && data) return mapLobbyRow(data as any);

    lastError = error;
    if (error && (error as any).code === "23505") continue; // code déjà pris
    break;
  }

  throw new Error(lastError?.message || "Impossible de créer un salon online pour le moment.");
}

async function joinLobby(args: { code: string }): Promise<OnlineLobby> {
  const codeUpper = args.code.trim().toUpperCase();

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

// ============================================================
// Matchs online — désactivés (fallback safe)
// ============================================================
async function uploadMatch(_payload: UploadMatchPayload): Promise<OnlineMatch> {
  if (!ONLINE_MATCHES_ENABLED) {
    console.warn("[onlineApi] uploadMatch ignored: ONLINE_MATCHES_ENABLED=false");
    return {
      id: `disabled_${now()}`,
      userId: "disabled",
      mode: _payload.mode,
      payload: _payload.payload,
      isTraining: !!_payload.isTraining,
      startedAt: _payload.startedAt ?? now(),
      finishedAt: _payload.finishedAt ?? now(),
    } as any;
  }
  throw new Error("Online matches disabled");
}

async function listMatches(_limit = 50): Promise<OnlineMatch[]> {
  if (!ONLINE_MATCHES_ENABLED) return [];
  throw new Error("Online matches disabled");
}

// ============================================================
// Export
// ============================================================
export const onlineApi = {
  // Auth
  signup,
  login,
  restoreSession,
  logout,
  getCurrentSession,

  // ✅ V8 : auto-session exposée
  ensureAutoSession,

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

  // Salons
  createLobby,
  joinLobby,

  // Matchs (safe)
  uploadMatch,
  listMatches,

  // Info
  USE_MOCK,

  // debug
  loadAuthFromLS,
};
