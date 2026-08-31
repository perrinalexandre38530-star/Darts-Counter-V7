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
import { onlineApi } from "../lib/onlineApi";
import { isNasProviderEnabled, isSupabaseHardDisabledInNasMode } from "../lib/serverConfig";
import { readNasAccessToken, setApiAccessToken } from "../lib/apiClient";
import { maybeAutoRestoreCloudForSignedInUser } from "../lib/cloudAutoRestore";
import { scheduleRuntimeIdle } from "../lib/runtimePerformance";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";

const NAS_AUTH_COOLDOWN_MS = 1500;
const PROFILE_HYDRATION_COOLDOWN_MS = 2200;
const BACKUP_RESTORE_COOLDOWN_MS = 2 * 60 * 1000;
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
    // PERF CRITIQUE : lecture LOCALE Supabase en premier. L'ancienne version
    // appelait onlineApi.getCurrentSession() avant getSession(); ce chemin peut
    // restaurer le profil, sonder le NAS puis créer un bridge réseau. Il se
    // déclenchait au boot, sur les événements Auth et pendant OAuth.
    if (!isSupabaseHardDisabledInNasMode()) {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data?.session?.user) {
        const cached = readCachedAuthSession();
        if (cachedSessionMatchesSupabaseUser(cached, data.session.user)) {
          const cachedBridge = authSessionToPseudoSupabaseSession(cached);
          if (cachedBridge?.user) return cachedBridge;
        }
        return data.session;
      }
    }

    // Si Supabase est momentanément en train de restaurer son stockage, un cache
    // local encore valide évite un faux signed_out. Aucun réseau ici non plus.
    const cached = readCachedAuthSession();
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

async function safeLoadProfileBestEffort(user: User): Promise<OnlineProfile | null> {
  const userId = String(user?.id || "").trim();
  if (!userId) return null;
  const existing = profileLoadInFlight.get(userId);
  if (existing) return existing;

  const task = (async () => {
    try {
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
  session: Session | null
) {
  const user = session?.user ?? null;
  setApiAccessToken((session as any)?.access_token || "");

  if (user) {
    // IMPORTANT: une session résiduelle ne doit jamais annuler un logout explicite.
    // Le verrou est retiré uniquement par une action volontaire de connexion/signup/OAuth.
    try {
      setStorageUser(String(user.id || ""));
      localStorage.setItem("dc_user_id", String(user.id || ""));
    } catch {}
    try {
      (window as any).__dc_last_signed_in_user_id = String(user.id || "");
    } catch {}
    setState((s) => ({
      ...s,
      status: "signed_in",
      session,
      user,
      loading: false,
      ready: true,
      error: null,
    }));
  } else {
    try {
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
    const uid = String(s?.user?.id || s?.userId || "").trim();
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
          supabase_user_id: s?.supabaseUserId || null,
        },
      },
    } as any;
  } catch {
    return null;
  }
}


function shouldSearchBackupsForUser(user: any): boolean {
  // Un compte créé à l'instant ne peut pas avoir de sauvegarde historique à
  // restaurer. On évite donc NAS/R2/fichier au premier login. Sur un nouvel
  // appareil avec un ancien compte, created_at est ancien et la recherche part.
  const createdMs = Date.parse(String(user?.created_at || ""));
  if (!Number.isFinite(createdMs) || createdMs <= 0) return true;
  const ageMs = Date.now() - createdMs;
  return ageMs < -60_000 || ageMs > 10 * 60_000;
}

const backupRestoreLastScheduledAt = new Map<string, number>();
const backupRestoreInFlight = new Set<string>();

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

function searchBackupsInBackground(user: any): void {
  const userId = String(user?.id || "").trim();
  if (!userId || !shouldSearchBackupsForUser(user)) return;

  const nowTs = Date.now();
  const lastTs = backupRestoreLastScheduledAt.get(userId) || 0;
  if (nowTs - lastTs < BACKUP_RESTORE_COOLDOWN_MS || backupRestoreInFlight.has(userId)) return;
  backupRestoreLastScheduledAt.set(userId, nowTs);

  // Android : la restauration cloud/NAS/R2 ne démarre plus 250 ms après login.
  // Elle attend la fin du montage et un vrai créneau idle.
  scheduleOutsideNavigation(() => {
    if (backupRestoreInFlight.has(userId)) return;
    backupRestoreInFlight.add(userId);
    void maybeAutoRestoreCloudForSignedInUser(userId)
      .catch(() => false)
      .finally(() => backupRestoreInFlight.delete(userId));
  }, isCapacitorNativeRuntime() ? 2400 : 650);
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

  const hydrateProfileAndBackups = React.useCallback((user: User) => {
    const userId = String(user?.id || "").trim();
    if (!userId) return;
    const nowTs = Date.now();
    const previous = lastProfileHydrationRef.current.get(userId) || 0;
    if (nowTs - previous < PROFILE_HYDRATION_COOLDOWN_MS) return;
    lastProfileHydrationRef.current.set(userId, nowTs);

    scheduleOutsideNavigation(() => {
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

        // Si le travail profil a créé/rafraîchi un bridge canonique, applique-le
        // depuis le cache LOCAL sans relancer getCurrentSession().
        const cached = readCachedAuthSession();
        if (cachedSessionMatchesSupabaseUser(cached, user)) {
          const bridged = authSessionToPseudoSupabaseSession(cached);
          if (bridged?.user) {
            lastSignedInSessionRef.current = bridged;
            applyAuthFromSession(setState, bridged);
          }
        }
        searchBackupsInBackground(user);
      });
    }, isCapacitorNativeRuntime() ? 900 : 120);
  }, []);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setState((s) => {
        if (s.ready) return s;
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

      applyAuthFromSession(setState, session);

      const user = session?.user ?? null;
      if (user) hydrateProfileAndBackups(user);
    } catch (e: any) {
      console.warn("[useAuthOnline] refresh fatal:", e);
      setState((s) => ({
        ...s,
        loading: false,
        ready: true,
        error: e?.message || "refresh error",
      }));
    }
  }, [hydrateProfileAndBackups]);

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

        applyAuthFromSession(setState, session);

        const user = session?.user ?? null;
        if (user) hydrateProfileAndBackups(user);

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
              applyAuthFromSession(setState, nextSession);
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
          applyAuthFromSession(setState, emittedSession);

          // TOKEN_REFRESHED ne change pas l'identité : ne réveille ni profil ni cloud.
          if (event !== "TOKEN_REFRESHED") {
            hydrateProfileAndBackups(emittedSession.user);
          }
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
  }, [hydrateProfileAndBackups]);

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
            applyAuthFromSession(setState, directSession);
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
    [hydrateProfileAndBackups, refresh]
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
            applyAuthFromSession(setState, directSession);
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
    [hydrateProfileAndBackups, refresh]
  );

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
      refresh,
    }),
    [state, signup, login, logout, deleteAccount, refresh]
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
      refresh: async () => {},
    } as Ctx;
  }
  return ctx;
}
