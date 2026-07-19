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
import { isNasProviderEnabled, isNasDataSyncEnabled } from "../lib/serverConfig";
import { readNasAccessToken, setApiAccessToken } from "../lib/apiClient";
import { maybeAutoRestoreCloudForSignedInUser } from "../lib/cloudAutoRestore";

const NAS_AUTH_COOLDOWN_MS = 1500;
import { ensureLocalProfileForOnlineUser } from "../lib/accountBridge";
import type { OnlineProfile } from "../lib/onlineTypes";

const AUTH_REDIRECT_LOGIN = "#/auth/login";
const AUTH_REDIRECT_SIGNUP = "#/auth/signup";

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
      if (/^(sb-|supabase\.)/i.test(key) || /auth.*token|token.*auth|refresh.*token/i.test(key)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {}
  try { window.sessionStorage.clear(); } catch {}
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
    if (!isNasDataSyncEnabled()) return;

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
    if (isNasDataSyncEnabled()) return;
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

async function safeGetSession(): Promise<Session | null> {
  try {
    // Priorité à la session interne NAS/R2 quand elle existe.
    // C'est le cas des comptes publics Supabase bridgés et des comptes invités NAS :
    // ils doivent apparaître connectés partout, même si le SDK Supabase navigateur
    // n'a pas de session locale exploitable.
    const nasBridge = await safeGetNasBridgeSession();
    if (nasBridge?.user) return nasBridge;

    if (isNasDataSyncEnabled()) {
      await cleanupSupabaseLocalSessionForNas();
      return null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session ?? null;
  } catch (e) {
    console.warn("[useAuthOnline] getSession failed:", e);
    return null;
  }
}

async function safeEnsureSession(): Promise<Session | null> {
  const existing = await safeGetSession();
  if (existing?.user) return existing;
  return null;
}

async function safeLoadProfileBestEffort(user: User): Promise<OnlineProfile | null> {
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
  }
}

function applyAuthFromSession(
  setState: React.Dispatch<React.SetStateAction<AuthState>>,
  session: Session | null
) {
  const user = session?.user ?? null;
  setApiAccessToken((session as any)?.access_token || "");

  if (user) {
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

function tryBridgeLocalProfile(user: User, onlineProfile?: OnlineProfile | null) {
  try {
    const w: any = window as any;
    const appStore = w.__appStore;

    if (!appStore || typeof appStore.update !== "function") return;

    appStore.update((store: any) => {
      const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
      const uid = String(user?.id || "");

      const alreadyLinked = profiles.find((p: any) => {
        const pi = (p as any)?.privateInfo || {};
        return String((pi as any)?.onlineUserId || "") === uid;
      });

      if (isNasDataSyncEnabled() && !alreadyLinked) {
        return store;
      }

      const activeId = store?.activeProfileId;
      if (activeId && profiles.find((p: any) => p.id === activeId) && !alreadyLinked) {
        return store;
      }

      return ensureLocalProfileForOnlineUser(store, user, onlineProfile || undefined);
    });
  } catch (e) {
    console.warn("[useAuthOnline] tryBridgeLocalProfile failed", e);
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
    return {
      access_token: String(s?.token || ""),
      refresh_token: String(s?.refreshToken || ""),
      user: {
        id: uid,
        email: s?.user?.email || undefined,
        user_metadata: {
          nickname: s?.user?.nickname || s?.profile?.displayName || s?.profile?.nickname || "Player",
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
  const lastSignedInSessionRef = React.useRef<Session | null>(null);

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
    if (!isNasDataSyncEnabled()) return;
    cleanupSupabaseLocalSessionForNas();
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      if (isNasDataSyncEnabled()) {
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
      if (user) {
        const profile = await safeLoadProfileBestEffort(user);
        setState((s) => {
          if (!s.user || s.user.id !== user.id) return s;
          return { ...s, profile };
        });
        tryBridgeLocalProfile(user, profile);
        void maybeAutoRestoreCloudForSignedInUser(user.id);
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
  }, []);

  React.useEffect(() => {
    let alive = true;
    let supaSubscription: any = null;
    let nasHandler: any = null;

    (async () => {
      try {
        if (isNasDataSyncEnabled()) {
          await cleanupSupabaseLocalSessionForNas();
        }

        const session = await safeEnsureSession();
        if (!alive) return;

        if (session?.user) {
          lastSignedInSessionRef.current = session;
        }

        applyAuthFromSession(setState, session);

        const user = session?.user ?? null;
        if (user) {
          tryBridgeLocalProfile(user, null);

          safeLoadProfileBestEffort(user).then((profile) => {
            if (!alive) return;
            setState((s) => {
              if (!s.user || s.user.id !== user.id) return s;
              return { ...s, profile };
            });
            tryBridgeLocalProfile(user, profile);
            void maybeAutoRestoreCloudForSignedInUser(user.id);
          });
        }

        nasHandler = async () => {
          try {
            if (!alive) return;

            const nowTs = Date.now();
            if (nowTs - lastNasAuthAttemptRef.current < NAS_AUTH_COOLDOWN_MS) {
              return;
            }
            lastNasAuthAttemptRef.current = nowTs;

            if (isNasDataSyncEnabled()) {
              await cleanupSupabaseLocalSessionForNas();
            }
            const nextSession = await safeEnsureSession();

            if (nextSession?.user) {
              lastSignedInSessionRef.current = nextSession;
              applyAuthFromSession(setState, nextSession);
            } else {
              lastSignedInSessionRef.current = null;
              applyAuthFromSession(setState, null);
            }

            const nextUser = nextSession?.user ?? null;
            if (nextUser) {
              tryBridgeLocalProfile(nextUser, null);
              safeLoadProfileBestEffort(nextUser).then((profile) => {
                if (!alive) return;
                setState((s) => {
                  if (!s.user || s.user.id !== nextUser.id) return s;
                  return { ...s, profile };
                });
                tryBridgeLocalProfile(nextUser, profile);
                void maybeAutoRestoreCloudForSignedInUser(nextUser.id);
              });
            }
          } catch (e) {
            console.warn("[useAuthOnline] auth change handler error:", e);
            setState((s) => ({ ...s, loading: false, ready: true }));
          }
        };

        window.addEventListener("dc-auth-changed", nasHandler as EventListener);

        if (isNasDataSyncEnabled()) {
          return;
        }

        const { data } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
          try {
            if (!alive) return;

            if (event === "SIGNED_OUT" || !nextSession?.user) {
              const fallback = await safeGetNasBridgeSession();
              if (fallback?.user) {
                lastSignedInSessionRef.current = fallback;
                applyAuthFromSession(setState, fallback);
                return;
              }
              applyAuthFromSession(setState, null);
              return;
            }

            applyAuthFromSession(setState, nextSession);

            const nextUser = nextSession.user;
            tryBridgeLocalProfile(nextUser, null);

            safeLoadProfileBestEffort(nextUser).then((profile) => {
              if (!alive) return;
              setState((s) => {
                if (!s.user || s.user.id !== nextUser.id) return s;
                return { ...s, profile };
              });

              tryBridgeLocalProfile(nextUser, profile);
              void maybeAutoRestoreCloudForSignedInUser(nextUser.id);
            });
          } catch (e) {
            console.warn("[useAuthOnline] onAuthStateChange handler error:", e);
            setState((s) => ({ ...s, loading: false, ready: true }));
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
  }, []);

  const signup = React.useCallback(
    async (payload: { email?: string; nickname: string; password?: string }) => {
      try {
        if (isNasDataSyncEnabled()) {
          await cleanupSupabaseLocalSessionForNas();
        }
        const ok = await (onlineApi as any).signup?.(payload);
        const success = typeof ok === "boolean" ? ok : !ok?.error;
        if (success) {
          try {
            const s: any = await onlineApi.getCurrentSession?.();
            const uid = String(s?.user?.id || "").trim();
            if (uid) {
              localStorage.setItem("dc_user_id", uid);
              setStorageUser(uid);
            }
          } catch {}
        }
        return success;
      } catch (e) {
        console.warn("[useAuthOnline] signup error:", e);
        return false;
      }
    },
    []
  );

  const login = React.useCallback(
    async (payload: { email?: string; nickname?: string; password?: string }) => {
      try {
        if (isNasDataSyncEnabled()) {
          await cleanupSupabaseLocalSessionForNas();
        }
        const ok = await (onlineApi as any).login?.(payload);
        const success = typeof ok === "boolean" ? ok : !ok?.error;
        if (success) {
          try {
            const s: any = await onlineApi.getCurrentSession?.();
            const uid = String(s?.user?.id || "").trim();
            if (uid) {
              localStorage.setItem("dc_user_id", uid);
              setStorageUser(uid);
            }
          } catch {}
        }
        return success;
      } catch (e) {
        console.warn("[useAuthOnline] login error:", e);
        return false;
      }
    },
    []
  );

  const logout = React.useCallback(async () => {
    try {
      lastSignedInSessionRef.current = null;
      await (onlineApi as any).logout?.();
    } catch (e) {
      console.warn("[useAuthOnline] signOut error:", e);
    } finally {
      try { setStorageUser(null); } catch {}
      purgeAuthKeysFromBrowser();
      if (isNasDataSyncEnabled()) {
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
      redirectToAuth(AUTH_REDIRECT_LOGIN);
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
      if (isNasDataSyncEnabled()) {
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
