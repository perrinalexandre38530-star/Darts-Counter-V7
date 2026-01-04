// ============================================================
// src/hooks/useAuthOnline.ts
// Auth ONLINE (Supabase) — robust anti-freeze
// - init boot: getSession() + onAuthStateChange()
// - ready=true GARANTI (finally + watchdog) pour éviter blocage AppGate
// - expose: status, ready, loading, session, user, profile, login/signup/logout/refresh
// ============================================================

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { onlineApi } from "../lib/onlineApi";
import type { OnlineProfile } from "../lib/onlineTypes";

type AuthStatus = "signed_out" | "signed_in";

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
  status: "signed_out",
  session: null,
  user: null,
  profile: null,
  error: null,
};

type Ctx = AuthState & {
  signup: (payload: { email?: string; nickname: string; password?: string }) => Promise<boolean>;
  login: (payload: { email?: string; nickname?: string; password?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthOnlineContext = React.createContext<Ctx | null>(null);

async function safeGetSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session ?? null;
  } catch (e) {
    console.warn("[useAuthOnline] getSession failed:", e);
    return null;
  }
}

async function safeLoadProfile(user: User): Promise<OnlineProfile | null> {
  try {
    // onlineApi.getMyProfile() si tu l'as, sinon fallback sur onlineApi.getProfile(user.id)
    const api: any = onlineApi as any;

    if (typeof api.getMyProfile === "function") {
      const res = await api.getMyProfile();
      return (res?.profile ?? res ?? null) as OnlineProfile | null;
    }

    if (typeof api.getProfile === "function") {
      const res = await api.getProfile(user.id);
      return (res?.profile ?? res ?? null) as OnlineProfile | null;
    }

    // Pas d'API profile => OK, on ne bloque pas.
    return null;
  } catch (e) {
    console.warn("[useAuthOnline] loadProfile failed:", e);
    return null;
  }
}

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(initial);

  // watchdog anti-freeze (ex: Safari / SW / storage)
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

  const refresh = React.useCallback(async () => {
    try {
      const session = await safeGetSession();
      const user = session?.user ?? null;

      if (!session || !user) {
        setState((s) => ({
          ...s,
          status: "signed_out",
          session: null,
          user: null,
          profile: null,
          loading: false,
          ready: true,
        }));
        return;
      }

      const profile = await safeLoadProfile(user);

      setState((s) => ({
        ...s,
        status: "signed_in",
        session,
        user,
        profile,
        loading: false,
        ready: true,
      }));
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

    (async () => {
      try {
        // restoreSession best-effort (ne doit JAMAIS bloquer ready)
        try {
          await Promise.race([
            onlineApi.restoreSession(),
            new Promise((resolve) => setTimeout(resolve, 800)),
          ]);
        } catch {}

        // init session
        const session = await safeGetSession();
        if (!alive) return;

        const user = session?.user ?? null;
        if (!session || !user) {
          setState((s) => ({
            ...s,
            status: "signed_out",
            session: null,
            user: null,
            profile: null,
            loading: false,
            ready: true,
          }));
        } else {
          const profile = await safeLoadProfile(user);
          if (!alive) return;
          setState((s) => ({
            ...s,
            status: "signed_in",
            session,
            user,
            profile,
            loading: false,
            ready: true,
          }));
        }

        // subscribe auth changes
        const { data } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
          try {
            if (!alive) return;

            if (event === "SIGNED_OUT" || !nextSession?.user) {
              setState((s) => ({
                ...s,
                status: "signed_out",
                session: null,
                user: null,
                profile: null,
                loading: false,
                ready: true,
              }));
              return;
            }

            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
              const user = nextSession.user;
              const profile = await safeLoadProfile(user);

              if (!alive) return;

              setState((s) => ({
                ...s,
                status: "signed_in",
                session: nextSession,
                user,
                profile,
                loading: false,
                ready: true,
              }));
            }
          } catch (e) {
            console.warn("[useAuthOnline] onAuthStateChange handler error:", e);
            // IMPORTANT: ne jamais bloquer ready
            setState((s) => ({ ...s, loading: false, ready: true }));
          }
        });

        return () => {
          try {
            data?.subscription?.unsubscribe();
          } catch {}
        };
      } catch (e) {
        console.warn("[useAuthOnline] boot fatal:", e);
      } finally {
        // ✅ ready garanti quoiqu'il arrive
        if (alive) {
          setState((s) => ({ ...s, loading: false, ready: true }));
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const signup = React.useCallback(async (payload: { email?: string; nickname: string; password?: string }) => {
    try {
      const ok = await (onlineApi as any).signup?.(payload);
      // si signup() renvoie un objet, on considère ok si pas d'erreur
      const success = typeof ok === "boolean" ? ok : !ok?.error;
      // refresh derrière pour éviter état incohérent
      await refresh();
      return success;
    } catch (e) {
      console.warn("[useAuthOnline] signup error:", e);
      await refresh();
      return false;
    }
  }, [refresh]);

  const login = React.useCallback(async (payload: { email?: string; nickname?: string; password?: string }) => {
    try {
      const ok = await (onlineApi as any).login?.(payload);
      const success = typeof ok === "boolean" ? ok : !ok?.error;
      await refresh();
      return success;
    } catch (e) {
      console.warn("[useAuthOnline] login error:", e);
      await refresh();
      return false;
    }
  }, [refresh]);

  const logout = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[useAuthOnline] signOut error:", e);
    } finally {
      // force state clean
      setState((s) => ({
        ...s,
        status: "signed_out",
        session: null,
        user: null,
        profile: null,
        loading: false,
        ready: true,
      }));
    }
  }, []);

  const value: Ctx = React.useMemo(
    () => ({
      ...state,
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
    // fallback: évite crash si provider manquant
    return {
      ...initial,
      signup: async () => false,
      login: async () => false,
      logout: async () => {},
      refresh: async () => {},
    } as Ctx;
  }
  return ctx;
}
