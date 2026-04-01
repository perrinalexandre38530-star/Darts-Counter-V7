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
import { isNasProviderEnabled } from "../lib/serverConfig";

const NAS_AUTH_COOLDOWN_MS = 1500;
import { ensureLocalProfileForOnlineUser } from "../lib/accountBridge";
import type { OnlineProfile } from "../lib/onlineTypes";

async function cleanupSupabaseLocalSessionForNas(): Promise<void> {
  try {
    if (!isNasProviderEnabled()) return;

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
  refresh: () => Promise<void>;
};

const AuthOnlineContext = React.createContext<Ctx | null>(null);

async function safeGetSession(): Promise<Session | null> {
  try {
    if (isNasProviderEnabled()) {
      await cleanupSupabaseLocalSessionForNas();

      try {
        const s: any = await onlineApi.getCurrentSession();
        const user = s?.user?.id
          ? ({
              id: s.user.id,
              email: s.user.email,
              user_metadata: { nickname: s.user.nickname || s.profile?.displayName || "Player" },
            } as any)
          : null;

        if (!user) return null;

        return {
          access_token: s?.token || "",
          refresh_token: s?.refreshToken || "",
          user,
        } as any;
      } catch (e) {
        console.warn("[useAuthOnline] NAS safeGetSession soft-failed:", e);
        return null;
      }
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

      if (isNasProviderEnabled() && !alreadyLinked) {
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
      } else if (isNasProviderEnabled() && lastSignedInSessionRef.current?.user) {
        setState((s) => ({ ...s, loading: false, ready: true }));
        return;
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
        if (user) {
          tryBridgeLocalProfile(user, null);

          safeLoadProfileBestEffort(user).then((profile) => {
            if (!alive) return;
            setState((s) => {
              if (!s.user || s.user.id !== user.id) return s;
              return { ...s, profile };
            });
            tryBridgeLocalProfile(user, profile);
          });
        }

        if (isNasProviderEnabled()) {
          nasHandler = async () => {
            try {
              if (!alive) return;

              const nowTs = Date.now();
              if (nowTs - lastNasAuthAttemptRef.current < NAS_AUTH_COOLDOWN_MS) {
                return;
              }
              lastNasAuthAttemptRef.current = nowTs;

              await cleanupSupabaseLocalSessionForNas();
              const nextSession = await safeEnsureSession();

              if (nextSession?.user) {
                lastSignedInSessionRef.current = nextSession;
                applyAuthFromSession(setState, nextSession);
              } else if (lastSignedInSessionRef.current?.user) {
                setState((s) => ({ ...s, loading: false, ready: true }));
                return;
              } else {
                applyAuthFromSession(setState, nextSession);
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
                });
              }
            } catch (e) {
              console.warn("[useAuthOnline] NAS auth change handler error:", e);
              setState((s) => ({ ...s, loading: false, ready: true }));
            }
          };

          window.addEventListener("dc-auth-changed", nasHandler as EventListener);
          return;
        }

        const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
          try {
            if (!alive) return;

            if (event === "SIGNED_OUT" || !nextSession?.user) {
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
        if (isNasProviderEnabled()) {
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
        if (isNasProviderEnabled()) {
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
      await (onlineApi as any).logout?.();
    } catch (e) {
      console.warn("[useAuthOnline] signOut error:", e);
    } finally {
      try {
        setStorageUser(null);
        localStorage.removeItem("dc_user_id");
      } catch {}
      if (isNasProviderEnabled()) {
        await cleanupSupabaseLocalSessionForNas();
      }
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
  }, []);

  const value: Ctx = React.useMemo(
    () => ({
      ...state,
      userId: state.user?.id ?? null,
      signup,
      login,
      logout,
      refresh,
    }),
    [state, signup, login, logout, refresh]
  );

  return <AuthOnlineContext.Provider value={value}>{children}</AuthOnlineContext.Provider>;
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
      refresh: async () => {},
    } as Ctx;
  }
  return ctx;
}
