// ============================================================
// src/hooks/useAuthOnline.ts
// Auth ONLINE (Supabase) — robust anti-freeze (FIX CRITIQUE)
// ✅ RÈGLE: NE JAMAIS bloquer l’UI si profile n’existe pas
// ✅ L’auth = supabase.auth (session/user) POINT.
// - init boot: getSession() + onAuthStateChange()
// - ready=true GARANTI (finally + watchdog) pour éviter blocage AppGate
// - profile = BONUS (best-effort), n’impacte JAMAIS status/ready
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
  profile: OnlineProfile | null; // ⚠️ BONUS: best-effort uniquement
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

/**
 * Profile = BONUS.
 * - Ne doit JAMAIS bloquer ready/status.
 * - Si l’API profile n’existe pas / RLS / table absente => return null tranquille.
 */
async function safeLoadProfileBestEffort(user: User): Promise<OnlineProfile | null> {
  try {
    const api: any = onlineApi as any;

    if (typeof api.getMyProfile === "function") {
      const res = await api.getMyProfile();
      return (res?.profile ?? res ?? null) as OnlineProfile | null;
    }

    if (typeof api.getProfile === "function") {
      const res = await api.getProfile(user.id);
      return (res?.profile ?? res ?? null) as OnlineProfile | null;
    }

    return null;
  } catch (e) {
    console.warn("[useAuthOnline] loadProfile best-effort failed:", e);
    return null;
  }
}

/**
 * ✅ FIX CRITIQUE:
 * status/ready DOIVENT dépendre UNIQUEMENT de session.user.
 * profile ne doit JAMAIS conditionner signed_in / signed_out.
 */
function applyAuthFromSession(
  setState: React.Dispatch<React.SetStateAction<AuthState>>,
  session: Session | null
) {
  const user = session?.user ?? null;

  if (user) {
    setState((s) => ({
      ...s,
      status: "signed_in",
      session,
      user,
      // profile inchangé ici (chargé async en bonus)
      loading: false,
      ready: true,
      error: null,
    }));
  } else {
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

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(initial);

  // Watchdog anti-freeze (Safari / SW / storage / erreurs réseau)
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

      // ✅ Auth = session/user only
      applyAuthFromSession(setState, session);

      // ✅ BONUS: profile best-effort (n’impacte PAS ready/status)
      const user = session?.user ?? null;
      if (user) {
        const profile = await safeLoadProfileBestEffort(user);
        setState((s) => {
          // si on s’est déconnecté entre temps, on ne force pas le profile
          if (!s.user || s.user.id !== user.id) return s;
          return { ...s, profile };
        });
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

    (async () => {
      try {
        // restoreSession best-effort (ne doit JAMAIS bloquer l’UI)
        try {
          await Promise.race([
            (onlineApi as any)?.restoreSession?.(),
            new Promise((resolve) => setTimeout(resolve, 800)),
          ]);
        } catch {}

        const session = await safeGetSession();
        if (!alive) return;

        // ✅ Auth = session/user only
        applyAuthFromSession(setState, session);

        // ✅ BONUS profile async (best-effort)
        const user = session?.user ?? null;
        if (user) {
          safeLoadProfileBestEffort(user).then((profile) => {
            if (!alive) return;
            setState((s) => {
              if (!s.user || s.user.id !== user.id) return s;
              return { ...s, profile };
            });
          });
        }

        // subscribe auth changes
        const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
          try {
            if (!alive) return;

            // ✅ Auth = session/user only (peu importe profile)
            if (event === "SIGNED_OUT" || !nextSession?.user) {
              applyAuthFromSession(setState, null);
              return;
            }

            applyAuthFromSession(setState, nextSession);

            // ✅ BONUS profile (best-effort) après changement auth
            const nextUser = nextSession.user;
            safeLoadProfileBestEffort(nextUser).then((profile) => {
              if (!alive) return;
              setState((s) => {
                if (!s.user || s.user.id !== nextUser.id) return s;
                return { ...s, profile };
              });
            });
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

  const signup = React.useCallback(
    async (payload: { email?: string; nickname: string; password?: string }) => {
      try {
        const ok = await (onlineApi as any).signup?.(payload);
        const success = typeof ok === "boolean" ? ok : !ok?.error;
        await refresh();
        return success;
      } catch (e) {
        console.warn("[useAuthOnline] signup error:", e);
        await refresh();
        return false;
      }
    },
    [refresh]
  );

  const login = React.useCallback(
    async (payload: { email?: string; nickname?: string; password?: string }) => {
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
    },
    [refresh]
  );

  const logout = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[useAuthOnline] signOut error:", e);
    } finally {
      // ✅ force state clean (auth only)
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
