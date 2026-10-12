// ============================================================
// src/hooks/useAuthOnline.ts
// Auth ONLINE (Supabase) — robust anti-freeze (FIX CRITIQUE)
// ✅ RÈGLE: NE JAMAIS bloquer l’UI si profile n’existe pas
// ✅ L’auth = session/user UNIQUEMENT
// - init boot: getSession() + onAuthStateChange()
// - ready=true GARANTI (finally + watchdog) pour éviter blocage AppGate
// - profile = BONUS (best-effort), n’impacte JAMAIS status/ready
// - expose: status, ready, loading, session, user, userId, profile, login/signup/logout/refresh
// ✅ PATCH NAS FINAL:
// - coupe le résidu Supabase en mode NAS (stopAutoRefresh + signOut local)
// - évite les refresh_token CORS sur *.supabase.co quand provider=nas
// - garde le fichier complet et le flux existant
// ============================================================

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { setStorageUser } from "../lib/storage";
import { onlineApi, type UpdateProfilePayload } from "../lib/onlineApi";
import { isNasProviderEnabled, isSupabaseHardDisabledInNasMode } from "../lib/serverConfig";
import { readNasAccessToken, setApiAccessToken } from "../lib/apiClient";
import { maybeAutoRestoreCloudForSignedInUser } from "../lib/cloudAutoRestore";
import { scheduleRuntimeIdle } from "../lib/runtimePerformance";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import { cloudCommunityHeartbeat } from "../lib/publicSocialApi";

const NAS_AUTH_COOLDOWN_MS = 1500;
const PROFILE_HYDRATION_COOLDOWN_MS = 2200;

// Une vérification/restauration de compte ne doit avoir lieu qu'UNE fois par
// cycle de vie de l'application. Les événements TOKEN_REFRESHED, visibilité,
// bridge NAS ou remount React ne doivent jamais refermer AppGate.
const bootstrappedAccountsThisRuntime = new Set<string>();

// Exécute les tâches non critiques uniquement hors d’une navigation active.
// Cette fonction est utilisée par l’hydratation de profil et le heartbeat.
function scheduleOutsideNavigation(task: () => void, delayMs: number, attempt = 0): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    const navigating = (() => {
      try { return document.documentElement.dataset.mscNavigating === "1"; } catch { return false; }
    })();
    if (navigating && attempt < 8) {
      scheduleOutsideNavigation(task, 450, attempt + 1);
      return;
    }
    scheduleRuntimeIdle(task, {
      timeoutMs: isCapacitorNativeRuntime() ? 5000 : 3000,
      fallbackDelayMs: isCapacitorNativeRuntime() ? 900 : 180,
    });
  }, Math.max(0, delayMs));
}
import type { OnlineProfile } from "../lib/onlineTypes";

const AUTH_REDIRECT_LOGIN = "#/account/start";
const AUTH_REDIRECT_SIGNUP = "#/auth/signup";
const EXPLICIT_LOGOUT_KEY = "dc_explicit_logout_v1";

function isExplicitlyLoggedOut(): boolean {
  try { return localStorage.getItem(EXPLICIT_LOGOUT_KEY) === "1"; } catch { return false; }
}

function clearExplicitLogout(): void {
  try { localStorage.removeItem(EXPLICIT_LOGOUT_KEY); } catch {}
}

function markExplicitLogout(): void {
  try { localStorage.setItem(EXPLICIT_LOGOUT_KEY, "1"); } catch {}
}

function purgeAuthKeysFromBrowser(): void {
  if (typeof window === "undefined") return;
  try {
    const keys = [
      "dc_online_auth_supabase_v1",
      "dc_nas_access_token_v1",
      "dc_nas_refresh_token_v1",
      "auth_token",
      "auth_session",
      "current_user",
      "dc_session",
      "dc_user",
      "dc_user_id",
      "dc_nas_profile_onboarding_uid",
      "supabase.auth.token",
    ];
    for (const key of keys) window.localStorage.removeItem(key);
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i) || "";
      if (/^(sb-|supabase\.)/i.test(key) || /^dc-supabase-auth-v2:/i.test(key) || /auth.*token|token.*auth|refresh.*token/i.test(key)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {}
  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = window.sessionStorage.key(i) || "";
      if (/^(sb-|supabase\.)/i.test(key) || /^dc-supabase-auth-v2:/i.test(key) || /auth.*token|token.*auth|refresh.*token/i.test(key)) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {}
  setApiAccessToken("");
}

function redirectToAuth(hash: string): void {
  if (typeof window === "undefined") return;
  const target = hash.startsWith("#") ? hash : `#${hash}`;
  try {
    window.location.replace(`${window.location.pathname}${window.location.search}${target}`);
  } catch {
    window.location.hash = target;
  }
}

async function cleanupDeletedAccountLocalData(): Promise<void> {
  if (typeof window === "undefined") return;
  try { window.localStorage.clear(); } catch {}
  try { window.sessionStorage.clear(); } catch {}
  try {
    const idb: any = window.indexedDB;
    if (!idb) return;
    if (typeof idb.databases === "function") {
      const dbs = await idb.databases();
      await Promise.all((dbs || []).map((db: any) => new Promise<void>((resolve) => {
        const name = String(db?.name || "").trim();
        if (!name) return resolve();
        const req = window.indexedDB.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      })));
    }
  } catch {}
}

async function cleanupSupabaseLocalSessionForNas(): Promise<void> {
  try {
    // IMPORTANT : NAS et Supabase doivent pouvoir coexister.
    // Supabase authentifie les sauvegardes R2 directes et sert de secours de
    // connexion. On ne supprime sa session que si le mode dépannage explicite
    // VITE_DISABLE_SUPABASE_CLIENT_IN_NAS=true a été activé.
    if (!isNasProviderEnabled() || !isSupabaseHardDisabledInNasMode()) return;

    try {
      const authAny: any = (supabase as any)?.auth;
      if (typeof authAny?.stopAutoRefresh === "function") {
        authAny.stopAutoRefresh();
      }
    } catch {}

    try {
      const authAny: any = (supabase as any)?.auth;
      if (typeof authAny?.signOut === "function") {
        await authAny.signOut({ scope: "local" });
      }
    } catch {}

    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k) keys.push(k);
      }
      for (const k of keys) {
        if (k.startsWith("sb-") || k.includes("supabase.auth.token")) {
          try {
            localStorage.removeItem(k);
          } catch {}
        }
      }
    } catch {}

    try {
      const authAny: any = (supabase as any)?.auth;
      if (typeof authAny?.stopAutoRefresh === "function") {
        authAny.stopAutoRefresh();
      }
    } catch {}
  } catch (e) {
    console.warn("[useAuthOnline] cleanupSupabaseLocalSessionForNas failed:", e);
  }
}

async function ensureOnlineProfileRow(user: User): Promise<void> {
  try {
    if (isNasProviderEnabled()) return;
    const existing = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!existing.error && existing.data?.id) return;

    const base =
      (user.user_metadata as any)?.nickname ||
      (user.email ? user.email.split("@")[0] : "Player");
    const safeBase = String(base || "Player").trim().slice(0, 16) || "Player";
    const suffix = user.id.slice(0, 6);
    const nickname = `${safeBase}_${suffix}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const displayName = safeBase;

    const { error } = await supabase.from("profiles").insert(
      {
        id: user.id,
        user_id: user.id,
        nickname,
        display_name: displayName,
        created_at: new Date().toISOString(),
      } as any,
    );

    if (error && (error as any).code === "23505") {
      const nickname2 = `${safeBase}_${user.id.slice(0, 10)}`.replace(
        /[^a-zA-Z0-9_\-]/g,
        "_"
      );
      await supabase.from("profiles").insert(
        {
          id: user.id,
          user_id: user.id,
          nickname: nickname2,
          display_name: displayName,
          created_at: new Date().toISOString(),
        } as any,
      );
    }
  } catch {
    // best-effort: on ne bloque jamais l'UI
  }
}

type AuthStatus = "checking" | "signed_out" | "signed_in";

type AuthState = {
  ready: boolean;
  loading: boolean;
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: OnlineProfile | null;
  error?: string | null;
};

const initial: AuthState = {
  ready: false,
  loading: true,
  status: "checking",
  session: null,
  user: null,
  profile: null,
  error: null,
};

type Ctx = AuthState & {
  userId: string | null;
  signup: (payload: { email?: string; nickname: string; password?: string }) => Promise<boolean>;
  login: (payload: { email?: string; nickname?: string; password?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<OnlineProfile | null>;
  refresh: () => Promise<void>;
};

const AuthOnlineContext = React.createContext<Ctx | null>(null);

function cachedSessionMatchesSupabaseUser(cached: any, user: User): boolean {
  try {
    if (!cached || !user?.id) return false;
    const meta = (user.user_metadata || {}) as any;
    const liveIds = new Set([
      user.id,
      meta?.canonical_user_id,
      meta?.nas_user_id,
      meta?.multisports_user_id,
    ].map((value) => String(value || "").trim()).filter(Boolean));
    const cachedIds = [
      cached?.user?.id,
      cached?.userId,
      cached?.supabaseUserId,
    ].map((value) => String(value || "").trim()).filter(Boolean);
    return cachedIds.some((id) => liveIds.has(id));
  } catch {
    return false;
  }
}

function readCachedAuthSession(): any | null {
  try {
    return (onlineApi as any).loadAuthFromLS?.() || null;
  } catch {
    return null;
  }
}

function isCachedSessionStillUsable(cached: any): boolean {
  if (!cached?.token || !cached?.user?.id) return false;
  const rawExpiresAt = Number(cached?.expiresAt || 0);
  if (!rawExpiresAt) return true;
  const expiresAtMs = rawExpiresAt < 1_000_000_000_000 ? rawExpiresAt * 1000 : rawExpiresAt;
  return expiresAtMs > Date.now() - 30_000;
}

async function safeGetSession(): Promise<Session | null> {
  if (isExplicitlyLoggedOut()) return null;
  try {
    const cached = readCachedAuthSession();

    // ANDROID FAST BOOT:
    // onlineApi conserve déjà une session authentifiée avec expiration. Sur une
    // WebView Android, attendre le verrou interne de supabase.auth.getSession()
    // avant d'afficher l'app pouvait coûter plusieurs secondes au relancement.
    // Une session locale encore valide déverrouille donc immédiatement l'UI ;
    // Supabase continue ensuite sa restauration/refresh en arrière-plan.
    if (isCapacitorNativeRuntime() && isCachedSessionStillUsable(cached)) {
      const cachedProvider = String(cached?.authProvider || "").trim().toLowerCase();
      const cachedHasStableSupabaseId = !!String(cached?.supabaseUserId || cached?.user?.user_metadata?.supabase_user_id || "").trim();
      // Ne jamais démarrer Android sur un ancien alias NAS usr_* quand le client
      // Supabase public est disponible : même un swap de scope de quelques ms
      // suffit à afficher/persister le mauvais profil. Le fast-path reste permis
      // pour une vraie session Supabase (ou un bridge déjà étiqueté Supabase).
      if (cachedHasStableSupabaseId || cachedProvider === "supabase" || cachedProvider === "supabase_failover" || isSupabaseHardDisabledInNasMode()) {
        const cachedFastPath = authSessionToPseudoSupabaseSession(cached);
        if (cachedFastPath?.user) return cachedFastPath;
      }
    }

    // PERF CRITIQUE : lecture LOCALE Supabase avant tout bridge NAS réseau.
    // Quand une vraie session Supabase existe, ELLE est l'identité primaire.
    // Le cache bridge NAS peut fournir un jeton technique, mais il n'a jamais le
    // droit de remplacer user.id et de provoquer un changement de scope local.
    if (!isSupabaseHardDisabledInNasMode()) {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data?.session?.user) return data.session;
    }

    // Si Supabase est momentanément en train de restaurer son stockage, un cache
    // local encore valide évite un faux signed_out. Aucun réseau ici non plus.
    if (isCachedSessionStillUsable(cached)) {
      const pseudo = authSessionToPseudoSupabaseSession(cached);
      if (pseudo?.user) return pseudo;
    }

    // Le chemin réseau NAS n'est désormais qu'un fallback réel : mode NAS ou
    // ancien token NAS récupérable. Il n'est plus exécuté sur chaque lecture Auth.
    if (isNasProviderEnabled() || hasRecoverableNasAuth()) {
      const nasBridge = await safeGetNasBridgeSession();
      if (nasBridge?.user) return nasBridge;
    }

    return null;
  } catch (e) {
    console.warn("[useAuthOnline] getSession failed:", e);
    const cached = readCachedAuthSession();
    if (isCachedSessionStillUsable(cached)) return authSessionToPseudoSupabaseSession(cached);
    return null;
  }
}

async function safeEnsureSession(): Promise<Session | null> {
  const existing = await safeGetSession();
  if (existing?.user) return existing;
  return null;
}

const profileLoadInFlight = new Map<string, Promise<OnlineProfile | null>>();

function parseProfileTimestamp(value: any): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  const parsed = value ? Date.parse(String(value)) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function mapSupabaseAccountProfileRow(row: any, user: User): OnlineProfile {
  const privateInfo = row?.private_info && typeof row.private_info === "object"
    ? { ...row.private_info }
    : {};
  const rawAvatarRevision =
    privateInfo?.avatarUpdatedAt ??
    privateInfo?.avatar_updated_at ??
    0;
  const avatarUpdatedAt = Number(rawAvatarRevision || 0) || parseProfileTimestamp(rawAvatarRevision) || undefined;
  const displayName = String(row?.display_name || row?.nickname || "").trim();
  const nickname = String(row?.nickname || row?.display_name || "").trim();

  return {
    id: String(row?.id || user.id || ""),
    userId: String(user.id || row?.user_id || row?.id || ""),
    displayName: displayName || nickname || "Player",
    nickname: nickname || displayName || undefined,
    avatarUrl: String(row?.avatar_url || "").trim() || undefined,
    avatarUpdatedAt,
    country: row?.country ?? undefined,
    countryCode: row?.country_code ?? null,
    surname: row?.surname ?? null,
    firstName: row?.first_name ?? null,
    lastName: row?.last_name ?? null,
    birthDate: row?.birth_date ?? null,
    city: row?.city ?? null,
    email: row?.email ?? user.email ?? null,
    phone: row?.phone ?? null,
    preferences: row?.preferences && typeof row.preferences === "object" ? { ...row.preferences } : {},
    privateInfo,
    bio: row?.bio ?? "",
    stats: row?.stats && typeof row.stats === "object"
      ? row.stats
      : { totalMatches: 0, totalLegs: 0, avg3: 0, bestVisit: 0, bestCheckout: 0 },
    updatedAt: parseProfileTimestamp(row?.updated_at) || Date.now(),
  } as OnlineProfile;
}

/**
 * Source de vérité multi-appareils pour l'identité légère du compte.
 *
 * IMPORTANT : cette lecture contourne volontairement les caches NAS/legacy de
 * onlineApi. Un autre appareil doit toujours relire la ligne `public.profiles`
 * du compte Supabase courant (pseudo, avatar, coordonnées et préférences), puis
 * seulement utiliser les anciens bridges comme fallback si cette lecture échoue.
 */
async function loadSupabaseAccountProfile(user: User): Promise<OnlineProfile | null> {
  const userId = String(user?.id || "").trim();
  if (!userId || isSupabaseHardDisabledInNasMode()) return null;

  try {
    let result = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();

    if (!result.error && result.data) {
      return mapSupabaseAccountProfileRow(result.data, user);
    }

    // Ancien compte sans ligne profiles : on laisse le helper historique créer
    // la ligne, puis on la relit immédiatement. Ce chemin n'écrase jamais une
    // ligne existante et ne dépend pas du NAS.
    if (!result.data && !result.error) {
      await ensureOnlineProfileRow(user);
      result = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1)
        .maybeSingle();
      if (!result.error && result.data) {
        return mapSupabaseAccountProfileRow(result.data, user);
      }
    }

    if (result.error) {
      console.warn("[useAuthOnline] direct Supabase profile read failed", result.error);
    }
  } catch (error) {
    console.warn("[useAuthOnline] direct Supabase profile read failed", error);
  }
  return null;
}

async function safeLoadProfileBestEffort(user: User): Promise<OnlineProfile | null> {
  const userId = String(user?.id || "").trim();
  if (!userId) return null;
  const existing = profileLoadInFlight.get(userId);
  if (existing) return existing;

  const task = (async () => {
    try {
      // PRIORITÉ ABSOLUE : ligne Supabase publique du compte courant.
      // C'est elle qui rend le pseudo/avatar identiques sur PC, téléphone et
      // tout nouvel appareil, même si le cache local/NAS est ancien ou vide.
      const direct = await loadSupabaseAccountProfile(user);
      if (direct) return direct;

      const api: any = onlineApi as any;

      if (typeof api.getProfile === "function") {
        const res = await api.getProfile();
        return (res?.profile ?? res ?? null) as OnlineProfile | null;
      }

      if (typeof api.getMyProfile === "function") {
        const res = await api.getMyProfile();
        return (res?.profile ?? res ?? null) as OnlineProfile | null;
      }

      return null;
    } catch (e) {
      console.warn("[useAuthOnline] safeLoadProfileBestEffort failed:", e);
      return null;
    } finally {
      profileLoadInFlight.delete(userId);
    }
  })();

  profileLoadInFlight.set(userId, task);
  return task;
}

function applyAuthFromSession(
  setState: React.Dispatch<React.SetStateAction<AuthState>>,
  session: Session | null,
  opts?: { ready?: boolean }
) {
  const user = session?.user ?? null;
  setApiAccessToken((session as any)?.access_token || "");

  if (user) {
    // IMPORTANT: la vraie session Supabase fixe l'identité primaire AVANT tout
    // setStorageUser. Tous les appels secondaires (NAS/backup/legacy) sont ainsi
    // forcés à rester dans ce namespace pendant toute la session React.
    try {
      (window as any).__dc_primary_auth_user_id = String(user.id || "");
      (window as any).__dc_last_signed_in_user_id = String(user.id || "");
      setStorageUser(String(user.id || ""));
      localStorage.setItem("dc_user_id", String(user.id || ""));
    } catch {}
    setState((s) => {
      const sameUser = String(s.user?.id || "") === String(user.id || "");
      return {
        ...s,
        status: "signed_in",
        session,
        user,
        // Ne jamais laisser le profil du compte précédent traverser un changement
        // de session. Pour le même compte (TOKEN_REFRESHED), on le conserve.
        profile: sameUser ? s.profile : null,
        loading: false,
        ready: opts?.ready ?? true,
        error: null,
      };
    });
  } else {
    try {
      try { delete (window as any).__dc_primary_auth_user_id; } catch {}
      setStorageUser(null);
      localStorage.removeItem("dc_user_id");
    } catch {}
    setState((s) => ({
      ...s,
      status: "signed_out",
      session: null,
      user: null,
      profile: null,
      loading: false,
      ready: true,
      error: null,
    }));
  }
}


function forceOpenLoginRoute(): void {
  if (typeof window === "undefined") return;

  try {
    const appGo = (window as any).__appGo || (window as any).__appStore?.go;
    if (typeof appGo === "function") {
      appGo("auth_v7_login");
    }
  } catch {}

  try {
    const current = String(window.location.hash || "");
    if (!current.startsWith("#/auth/login")) {
      window.location.hash = "#/auth/login";
    }
    window.setTimeout(() => {
      try { window.dispatchEvent(new HashChangeEvent("hashchange")); } catch {}
    }, 0);
  } catch {
    try { window.location.hash = "#/auth/login"; } catch {}
  }
}

function hasRecoverableNasAuth(): boolean {
  try {
    return !!readNasAccessToken();
  } catch {
    return false;
  }
}

function authSessionToPseudoSupabaseSession(s: any): Session | null {
  try {
    const canonicalUid = String(s?.canonicalUserId || s?.user?.user_metadata?.canonical_user_id || s?.user?.id || s?.userId || "").trim();
    const supabaseUid = String(
      s?.supabaseUserId ||
      s?.user?.user_metadata?.supabase_user_id ||
      s?.session?.user?.id ||
      (String(s?.authProvider || "").toLowerCase() === "supabase" ? s?.user?.id || s?.userId : "") ||
      ""
    ).trim();
    // IMPORTANT — identité UI / stockage STABLE :
    // dès qu'un UID Supabase existe, il reste l'identité exposée à React.
    // Le bridge NAS peut posséder un identifiant canonique usr_* séparé, mais il
    // ne doit JAMAIS remplacer user.id après coup : ce swap faisait recharger un
    // autre namespace IndexedDB et remettait avatar/stats à une ancienne version.
    const uid = supabaseUid || canonicalUid;
    if (!uid) return null;
    const degraded = s?.degradedMode === true || String(s?.authProvider || "") === "supabase_failover";
    return {
      // Le JWT Supabase ne doit jamais être envoyé comme Bearer au backend NAS.
      access_token: degraded ? "" : String(s?.token || ""),
      refresh_token: degraded ? "" : String(s?.refreshToken || ""),
      user: {
        id: uid,
        email: s?.user?.email || undefined,
        created_at: s?.user?.createdAt ? new Date(Number(s.user.createdAt)).toISOString() : undefined,
        user_metadata: {
          nickname: s?.user?.nickname || s?.profile?.displayName || s?.profile?.nickname || "Player",
          auth_provider: s?.authProvider || (degraded ? "supabase_failover" : "nas"),
          degraded_mode: degraded,
          supabase_user_id: supabaseUid || null,
          canonical_user_id: canonicalUid || null,
          nas_user_id: canonicalUid && canonicalUid !== uid ? canonicalUid : null,
        },
      },
    } as any;
  } catch {
    return null;
  }
}


async function safeGetNasBridgeSession(): Promise<Session | null> {
  try {
    const s: any = await onlineApi.getCurrentSession?.();
    return authSessionToPseudoSupabaseSession(s);
  } catch {
    return null;
  }
}

function SessionExpiredFloatingCard({
  authStatus,
  userId,
  refresh,
}: {
  authStatus: AuthStatus;
  userId: string | null;
  refresh: () => Promise<void>;
}) {
  const [visible, setVisible] = React.useState(false);
  const statusRef = React.useRef<AuthStatus>(authStatus);
  const userIdRef = React.useRef<string | null>(userId);
  const refreshRef = React.useRef(refresh);

  React.useEffect(() => { statusRef.current = authStatus; }, [authStatus]);
  React.useEffect(() => { userIdRef.current = userId; }, [userId]);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  React.useEffect(() => {
    let disposed = false;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<any>)?.detail || {};
      const reason = String(detail?.reason || "");
      const sourcePath = String(detail?.sourcePath || "");
      if (detail?.status !== "signed_out") return;
      if (reason !== "401" && reason !== "missing_token") return;

      // Anti-déconnexion fantôme : un 401 issu d'un polling /online/*
      // ne doit pas masquer l'app ni forcer une reconnexion.
      if (sourcePath.startsWith("/online/")) {
        try { refreshRef.current?.(); } catch {}
        setVisible(false);
        return;
      }

      void (async () => {
        // Cas principal du bug : un appel /online/* part trop tôt au relancement
        // et crie “déconnecté” alors que le provider a encore une session valide.
        // On laisse d'abord le provider se resynchroniser.
        if (statusRef.current === "signed_in" || userIdRef.current || hasRecoverableNasAuth()) {
          try { await refreshRef.current?.(); } catch {}
          if (disposed) return;
          if (statusRef.current === "signed_in" || userIdRef.current || hasRecoverableNasAuth()) {
            setVisible(false);
            return;
          }
        }

        if (disposed) return;
        setVisible(true);
        forceOpenLoginRoute();
      })();
    };

    window.addEventListener("dc-auth-changed", handler as EventListener);
    return () => {
      disposed = true;
      window.removeEventListener("dc-auth-changed", handler as EventListener);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        padding: 18,
      }}
    >
      <div
        role="alert"
        aria-live="assertive"
        style={{
          width: "min(92vw, 360px)",
          pointerEvents: "auto",
          border: "1px solid rgba(35, 230, 255, 0.75)",
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(4, 15, 24, 0.96), rgba(0, 0, 0, 0.94))",
          boxShadow: "0 0 30px rgba(35, 230, 255, 0.28), inset 0 0 22px rgba(255, 203, 70, 0.08)",
          color: "#eafcff",
          padding: 20,
          textAlign: "center",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: 0.4,
            color: "#ffd45a",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Vous avez été déconnecté
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.45, color: "rgba(234,252,255,0.82)", marginBottom: 16 }}>
          Votre session online a expiré. Reconnectez-vous pour accéder aux messages, amis et données online.
        </div>

        <button
          type="button"
          onClick={() => {
            setVisible(false);
            forceOpenLoginRoute();
          }}
          style={{
            width: "100%",
            border: "1px solid rgba(35, 230, 255, 0.95)",
            borderRadius: 999,
            background: "linear-gradient(180deg, rgba(35,230,255,0.24), rgba(35,230,255,0.08))",
            color: "#eaffff",
            fontWeight: 900,
            letterSpacing: 0.8,
            padding: "12px 14px",
            boxShadow: "0 0 18px rgba(35, 230, 255, 0.22)",
            cursor: "pointer",
          }}
        >
          SE CONNECTER
        </button>
      </div>
    </div>
  );
}

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(initial);
  const lastNasAuthAttemptRef = React.useRef(0);
  const authChangeInFlightRef = React.useRef(false);
  const lastProfileHydrationRef = React.useRef(new Map<string, number>());
  const lastSignedInSessionRef = React.useRef<Session | null>(null);
  const accountBootstrapInFlightRef = React.useRef(new Map<string, Promise<void>>());

  const bootstrapSignedInAccount = React.useCallback(async (user: User) => {
    const userId = String(user?.id || "").trim();
    if (!userId) return;

    if (bootstrappedAccountsThisRuntime.has(userId)) {
      setState((current) => {
        if (String(current.user?.id || "") !== userId) return current;
        if (current.ready && current.status === "signed_in" && !current.loading) return current;
        return { ...current, loading: false, ready: true, status: "signed_in" };
      });
      return;
    }

    const existing = accountBootstrapInFlightRef.current.get(userId);
    if (existing) return existing;

    // Marqué avant le réseau : un second événement auth concurrent ne peut pas
    // remettre l'écran « Vérification du compte… » pendant le bootstrap courant.
    bootstrappedAccountsThisRuntime.add(userId);

    const task = (async () => {
      // L'authentification libère immédiatement l'interface. La sauvegarde du
      // compte est recherchée/restaurée EN ARRIÈRE-PLAN : jamais d'AppGate de
      // 10-15 s sur un nouvel appareil. La progression est publiée globalement.
      setState((current) => {
        if (String(current.user?.id || "") !== userId) return current;
        return { ...current, loading: false, ready: true, status: "signed_in" };
      });
      await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
      try {
        await maybeAutoRestoreCloudForSignedInUser(userId);
      } catch (error) {
        console.warn("[useAuthOnline] background account restore skipped", error);
      }
    })();

    accountBootstrapInFlightRef.current.set(userId, task);
    try {
      await task;
    } finally {
      if (accountBootstrapInFlightRef.current.get(userId) === task) {
        accountBootstrapInFlightRef.current.delete(userId);
      }
    }
  }, []);

  const hydrateProfileAndBackups = React.useCallback((user: User) => {
    const userId = String(user?.id || "").trim();
    if (!userId) return;
    const nowTs = Date.now();
    const previous = lastProfileHydrationRef.current.get(userId) || 0;
    if (nowTs - previous < PROFILE_HYDRATION_COOLDOWN_MS) return;
    lastProfileHydrationRef.current.set(userId, nowTs);

    // Le profil compte est une lecture réseau minuscule et CRITIQUE pour
    // l'identité visuelle. Il ne doit plus attendre 3,6 s + requestIdleCallback
    // sur Android : c'est précisément ce délai qui faisait apparaître Perrin/
    // l'avatar par défaut avant Ninja. Les sauvegardes lourdes restent, elles,
    // hors navigation via bootstrapSignedInAccount().
    window.setTimeout(() => {
      void safeLoadProfileBestEffort(user).then((profile) => {
        setState((current) => {
          // Le bridge différé peut avoir remplacé l'id Supabase par l'id canonique.
          // On accepte les deux identités si elles correspondent au même cache.
          const currentId = String(current.user?.id || "");
          const cached = readCachedAuthSession();
          const sameAccount = current.user
            ? cachedSessionMatchesSupabaseUser(cached, current.user) || currentId === userId
            : false;
          if (!sameAccount) return current;
          return { ...current, profile };
        });

        // Le bridge NAS est désormais uniquement technique (sauvegardes privées).
        // Il ne doit plus être réappliqué comme session React après hydratation du
        // profil, sinon user.id pouvait basculer quelques secondes après le login.
      });
    }, 0);
  }, []);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setState((s) => {
        if (s.ready) return s;
        const uid = String(s.user?.id || "").trim();
        if (uid && accountBootstrapInFlightRef.current.has(uid)) return s;
        console.warn("[useAuthOnline] WATCHDOG -> force ready=true");
        return { ...s, ready: true, loading: false };
      });
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (!isNasProviderEnabled()) return;
    cleanupSupabaseLocalSessionForNas();
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      if (isNasProviderEnabled()) {
        await cleanupSupabaseLocalSessionForNas();
      }

      setState((s) => ({ ...s, loading: true, status: "checking" }));
      const session = await safeEnsureSession();

      if (session?.user) {
        lastSignedInSessionRef.current = session;
      } else {
        lastSignedInSessionRef.current = null;
      }

      const user = session?.user ?? null;
      applyAuthFromSession(setState, session, { ready: !user });
      if (user) {
        await bootstrapSignedInAccount(user);
        hydrateProfileAndBackups(user);
      }
    } catch (e: any) {
      console.warn("[useAuthOnline] refresh fatal:", e);
      setState((s) => ({
        ...s,
        loading: false,
        ready: true,
        error: e?.message || "refresh error",
      }));
    }
  }, [bootstrapSignedInAccount, hydrateProfileAndBackups]);

  React.useEffect(() => {
    let alive = true;
    let supaSubscription: any = null;
    let nasHandler: any = null;

    (async () => {
      try {
        if (isNasProviderEnabled()) {
          await cleanupSupabaseLocalSessionForNas();
        }

        const session = await safeEnsureSession();
        if (!alive) return;

        if (session?.user) {
          lastSignedInSessionRef.current = session;
        }

        const user = session?.user ?? null;
        applyAuthFromSession(setState, session, { ready: !user });
        if (user) {
          await bootstrapSignedInAccount(user);
          if (!alive) return;
          hydrateProfileAndBackups(user);
        }

        nasHandler = async () => {
          if (!alive || authChangeInFlightRef.current) return;

          const nowTs = Date.now();
          if (nowTs - lastNasAuthAttemptRef.current < NAS_AUTH_COOLDOWN_MS) return;
          lastNasAuthAttemptRef.current = nowTs;
          authChangeInFlightRef.current = true;

          try {
            if (isNasProviderEnabled()) {
              await cleanupSupabaseLocalSessionForNas();
            }
            const nextSession = await safeEnsureSession();

            if (nextSession?.user) {
              lastSignedInSessionRef.current = nextSession;
              applyAuthFromSession(setState, nextSession, { ready: bootstrappedAccountsThisRuntime.has(String(nextSession.user?.id || "").trim()) });
              await bootstrapSignedInAccount(nextSession.user);
              hydrateProfileAndBackups(nextSession.user);
            } else {
              lastSignedInSessionRef.current = null;
              applyAuthFromSession(setState, null);
            }
          } catch (e) {
            console.warn("[useAuthOnline] auth change handler error:", e);
            setState((current) => ({ ...current, loading: false, ready: true }));
          } finally {
            authChangeInFlightRef.current = false;
          }
        };

        window.addEventListener("dc-auth-changed", nasHandler as EventListener);

        if (isNasProviderEnabled()) {
          return;
        }

        const { data } = supabase.auth.onAuthStateChange((event, emittedSession) => {
          // IMPORTANT — SUPABASE AUTH LOCK:
          // Ne JAMAIS lancer getSession/getUser/from()/restoreSession() directement
          // dans ce callback. supabase-js peut conserver son verrou Auth tant que le
          // callback n'est pas revenu, ce qui bloque ensuite exchangeCodeForSession(),
          // signInWithPassword() et tous les appels Supabase suivants.
          if (!alive) return;

          if (event === "SIGNED_OUT" || !emittedSession?.user) {
            lastSignedInSessionRef.current = null;
            applyAuthFromSession(setState, null);
            return;
          }

          // La session fournie par l'événement suffit pour déverrouiller l'UI
          // immédiatement. Aucun getCurrentSession()/restoreSession()/NAS bridge
          // n'est autorisé dans le task qui suit directement ce callback.
          lastSignedInSessionRef.current = emittedSession;
          if (event === "TOKEN_REFRESHED") {
            applyAuthFromSession(setState, emittedSession);
            return;
          }

          applyAuthFromSession(setState, emittedSession, { ready: bootstrappedAccountsThisRuntime.has(String(emittedSession.user?.id || "").trim()) });
          // Sortir immédiatement du callback Supabase puis initialiser le compte.
          // Le coordinateur déduplique si le login/boot a déjà lancé la même tâche.
          window.setTimeout(() => {
            void bootstrapSignedInAccount(emittedSession.user).then(() => {
              hydrateProfileAndBackups(emittedSession.user);
            });
          }, 0);
        });

        supaSubscription = data?.subscription ?? null;
      } catch (e) {
        console.warn("[useAuthOnline] boot fatal:", e);
      } finally {
        if (alive) {
          setState((s) => ({ ...s, loading: false, ready: true }));
        }
      }
    })();

    return () => {
      alive = false;
      try {
        if (nasHandler) {
          window.removeEventListener("dc-auth-changed", nasHandler as EventListener);
        }
      } catch {}
      try {
        supaSubscription?.unsubscribe?.();
      } catch {}
    };
  }, [bootstrapSignedInAccount, hydrateProfileAndBackups]);

  // ============================================================
  // PROFIL COMPTE MULTI-APPAREILS — synchro légère continue
  // ============================================================
  // `public.profiles` est l'autorité pour l'identité légère du compte. Une
  // modification effectuée sur PC doit donc remonter sur le téléphone sans
  // nettoyage de cookies ni restauration de sauvegarde. On combine :
  // - un refresh immédiat après connexion,
  // - un refresh au focus / retour au premier plan,
  // - un événement local après updateProfile(),
  // - Supabase Realtime quand la publication est disponible,
  // - un polling visible de secours toutes les 30 s.
  React.useEffect(() => {
    if (state.status !== "signed_in" || !state.user?.id) return;

    const user = state.user;
    const userId = String(user.id || "").trim();
    if (!userId) return;

    let disposed = false;
    let channel: any = null;

    const commit = (profile: OnlineProfile | null) => {
      if (disposed || !profile) return;
      setState((current) => {
        if (String(current.user?.id || "") !== userId) return current;
        return { ...current, profile };
      });
    };

    const refreshProfile = () => {
      if (disposed) return;
      void safeLoadProfileBestEffort(user).then(commit).catch((error) => {
        console.warn("[useAuthOnline] account profile refresh skipped", error);
      });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshProfile();
    };
    const onFocus = () => refreshProfile();
    const onOnline = () => refreshProfile();
    const onCloudProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {};
      const eventUserId = String(detail?.userId || detail?.profile?.userId || detail?.profile?.id || "").trim();
      if (eventUserId && eventUserId !== userId) return;
      if (detail?.profile) commit(detail.profile as OnlineProfile);
      else refreshProfile();
    };

    refreshProfile();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("dc:account-profile-cloud-updated", onCloudProfileUpdated as EventListener);
    document.addEventListener("visibilitychange", onVisible);

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshProfile();
    }, 30_000);

    try {
      channel = supabase
        .channel(`account-profile-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
          (payload: any) => {
            if (disposed) return;
            const row = payload?.new;
            if (row && String(row?.id || "") === userId) {
              commit(mapSupabaseAccountProfileRow(row, user));
            } else {
              refreshProfile();
            }
          },
        )
        .subscribe();
    } catch (error) {
      // Le polling/focus reste le fallback fiable si Realtime n'est pas publié.
      console.warn("[useAuthOnline] account profile realtime unavailable", error);
    }

    return () => {
      disposed = true;
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("dc:account-profile-cloud-updated", onCloudProfileUpdated as EventListener);
      document.removeEventListener("visibilitychange", onVisible);
      try {
        if (channel) void supabase.removeChannel(channel);
      } catch {}
    };
  }, [state.status, state.user?.id]);

  // Présence communautaire globale : un compte authentifié compte comme actif même
  // s'il n'ouvre jamais la page ONLINE. Le RPC ne publie aucune donnée de profil :
  // il rafraîchit uniquement ms_presence. Toutes les requêtes passent hors navigation.
  React.useEffect(() => {
    if (isNasProviderEnabled()) return;
    if (state.status !== "signed_in" || !state.user?.id) return;

    let alive = true;
    let heartbeatTimer: number | null = null;

    const scheduleHeartbeat = (next: "online" | "away" | "offline") => {
      scheduleOutsideNavigation(() => {
        if (!alive) return;
        void cloudCommunityHeartbeat(next).catch((error) => {
          console.warn("[community] heartbeat unavailable:", error);
        });
      }, isCapacitorNativeRuntime() ? 900 : 120);
    };

    const currentStatus = () => document.visibilityState === "hidden" ? "away" as const : "online" as const;
    scheduleHeartbeat(currentStatus());

    heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") scheduleHeartbeat("online");
    }, 60_000);

    const onVisibility = () => scheduleHeartbeat(currentStatus());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      if (heartbeatTimer != null) window.clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      // Pas de requête synchrone au démontage : le seuil anti-stale du backend
      // retire automatiquement un ancien statut online après 2 minutes.
    };
  }, [state.status, state.user?.id]);

  const signup = React.useCallback(
    async (payload: { email?: string; nickname: string; password?: string }) => {
      clearExplicitLogout();
      try {
        if (isNasProviderEnabled()) {
          await cleanupSupabaseLocalSessionForNas();
        }
        const ok = await (onlineApi as any).signup?.(payload);
        const success = typeof ok === "boolean" ? ok : !ok?.error;
        if (success) {
          const directSession = authSessionToPseudoSupabaseSession(ok);
          if (directSession?.user) {
            lastSignedInSessionRef.current = directSession;
            applyAuthFromSession(setState, directSession, { ready: false });
            await bootstrapSignedInAccount(directSession.user);
            hydrateProfileAndBackups(directSession.user);
          } else {
            void refresh();
          }
        }
        return success;
      } catch (e) {
        console.warn("[useAuthOnline] signup error:", e);
        return false;
      }
    },
    [bootstrapSignedInAccount, hydrateProfileAndBackups, refresh]
  );

  const login = React.useCallback(
    async (payload: { email?: string; nickname?: string; password?: string }) => {
      clearExplicitLogout();
      try {
        if (isNasProviderEnabled()) {
          await cleanupSupabaseLocalSessionForNas();
        }
        const ok = await (onlineApi as any).login?.(payload);
        const success = typeof ok === "boolean" ? ok : !ok?.error;
        if (success) {
          const directSession = authSessionToPseudoSupabaseSession(ok);
          if (directSession?.user) {
            lastSignedInSessionRef.current = directSession;
            applyAuthFromSession(setState, directSession, { ready: false });
            await bootstrapSignedInAccount(directSession.user);
            hydrateProfileAndBackups(directSession.user);
          } else {
            void refresh();
          }
        }
        return success;
      } catch (e) {
        console.warn("[useAuthOnline] login error:", e);
        return false;
      }
    },
    [bootstrapSignedInAccount, hydrateProfileAndBackups, refresh]
  );

  const updateProfile = React.useCallback(async (patch: UpdateProfilePayload): Promise<OnlineProfile | null> => {
    const expectedUserId = String(state.user?.id || "").trim();
    if (state.status !== "signed_in" || !expectedUserId) {
      throw new Error("Utilisateur non authentifié.");
    }

    const profile = await onlineApi.updateProfile(patch);
    setState((current) => {
      if (String(current.user?.id || "").trim() !== expectedUserId) return current;
      return { ...current, profile };
    });
    return profile;
  }, [state.status, state.user?.id]);

  const logout = React.useCallback(async () => {
    // LOGOUT LOCAL-FIRST : l'UI et le verrou de session basculent AVANT tout appel réseau.
    // Ainsi une API lente/hors-ligne ou un listener Supabase retardé ne peut plus
    // maintenir/restaurer artificiellement l'utilisateur dans l'application.
    markExplicitLogout();
    lastSignedInSessionRef.current = null;

    try {
      const authAny: any = (supabase as any)?.auth;
      if (typeof authAny?.stopAutoRefresh === "function") authAny.stopAutoRefresh();
    } catch {}

    try { setStorageUser(null); } catch {}
    purgeAuthKeysFromBrowser();

    setState((s) => ({
      ...s,
      status: "signed_out",
      session: null,
      user: null,
      profile: null,
      loading: false,
      ready: true,
      error: null,
    }));

    // La sortie visuelle est immédiate et ne dépend jamais du réseau.
    redirectToAuth(AUTH_REDIRECT_LOGIN);

    try {
      await (onlineApi as any).logout?.();
    } catch (e) {
      console.warn("[useAuthOnline] remote signOut error (local logout already complete):", e);
    } finally {
      // Ne jamais écraser une nouvelle connexion démarrée pendant que le logout
      // distant finissait. Une connexion volontaire retire le verrou.
      if (isExplicitlyLoggedOut()) {
        purgeAuthKeysFromBrowser();
        lastSignedInSessionRef.current = null;
      }
    }
  }, []);


  const deleteAccount = React.useCallback(async () => {
    try {
      lastSignedInSessionRef.current = null;
      await (onlineApi as any).deleteAccount?.();
    } catch (e) {
      console.warn("[useAuthOnline] deleteAccount error:", e);
      throw e;
    } finally {
      try { setStorageUser(null); } catch {}
      await cleanupDeletedAccountLocalData();
      if (isNasProviderEnabled()) {
        await cleanupSupabaseLocalSessionForNas();
      }
      lastSignedInSessionRef.current = null;
      setState((s) => ({
        ...s,
        status: "signed_out",
        session: null,
        user: null,
        profile: null,
        loading: false,
        ready: true,
        error: null,
      }));
      redirectToAuth(AUTH_REDIRECT_SIGNUP);
    }
  }, []);

  const value: Ctx = React.useMemo(
    () => ({
      ...state,
      userId: state.user?.id ?? null,
      signup,
      login,
      logout,
      deleteAccount,
      updateProfile,
      refresh,
    }),
    [state, signup, login, logout, deleteAccount, updateProfile, refresh]
  );

  return (
    <AuthOnlineContext.Provider value={value}>
      {children}
      <SessionExpiredFloatingCard authStatus={state.status} userId={state.user?.id ?? null} refresh={refresh} />
    </AuthOnlineContext.Provider>
  );
}

export function useAuthOnline() {
  const ctx = React.useContext(AuthOnlineContext);
  if (!ctx) {
    return {
      ...initial,
      userId: null,
      signup: async () => false,
      login: async () => false,
      logout: async () => {},
      deleteAccount: async () => {},
      updateProfile: async () => null,
      refresh: async () => {},
    } as Ctx;
  }
  return ctx;
}
