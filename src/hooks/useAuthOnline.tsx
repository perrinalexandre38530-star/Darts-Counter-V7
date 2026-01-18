// ============================================================
// src/hooks/useAuthOnline.tsx
// Auth ONLINE (Supabase) — V8 ALWAYS-CONNECTED (ANON SESSION)
// ============================================================
// Objectif V8:
// - L'app ne doit JAMAIS rester "signed_out" en usage normal.
// - Si aucune session -> créer une session anonyme automatiquement.
// - Le "profil local" ne doit pas conditionner l'auth.
// - Le "profil cloud" est best-effort (ne bloque jamais l'UI).
//
// IMPORTANT:
// - Nécessite que Supabase "Anonymous sign-ins" soit activé côté projet.
//   Sinon signInAnonymously échouera -> on retombe en signed_out,
//   mais avec une erreur claire dans state.error.
// ============================================================

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { onlineApi } from "../lib/onlineApi";
import type { OnlineProfile } from "../lib/onlineTypes";

type AuthStatus = "checking" | "signed_out" | "signed_in";

type AuthState = {
  ready: boolean;
  loading: boolean;
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: OnlineProfile | null; // BONUS best-effort
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

  // "logout" en V8 = debug uniquement :
  // on coupe la session puis on recrée une session anonyme.
  logout: () => Promise<void>;

  refresh: () => Promise<void>;
};

const AuthOnlineContext = React.createContext<Ctx | null>(null);

function applyAuthFromSession(
  setState: React.Dispatch<React.SetStateAction<AuthState>>,
  session: Session | null,
  error: string | null = null
) {
  const user = session?.user ?? null;

  if (user) {
    setState((s) => ({
      ...s,
      status: "signed_in",
      session,
      user,
      loading: false,
      ready: true,
      error,
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
      error,
    }));
  }
}

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
 * V8: crée une session anonyme si aucune session n'existe.
 * Retourne la session (ou null si échec).
 */
async function ensureAnonSession(): Promise<{ session: Session | null; error: string | null }> {
  try {
    // 1) si déjà une session -> ok
    const existing = await safeGetSession();
    if (existing?.user) return { session: existing, error: null };

    // 2) sinon on tente l'anonymous sign-in
    // NOTE: Supabase JS v2 expose signInAnonymously()
    const anyAuth: any = supabase.auth as any;

    if (typeof anyAuth.signInAnonymously !== "function") {
      const msg =
        "Supabase JS ne supporte pas signInAnonymously() dans cette version. Mets à jour @supabase/supabase-js (v2) ou active un fallback.";
      console.warn("[useAuthOnline]", msg);
      return { session: null, error: msg };
    }

    const { data, error } = await anyAuth.signInAnonymously();
    if (error) throw error;

    const s = data?.session ?? null;
    if (!s?.user) {
      return { session: null, error: "Anonymous sign-in: session vide (inattendu)" };
    }
    return { session: s, error: null };
  } catch (e: any) {
    const msg =
      e?.message ||
      "Impossible de créer la session anonyme. Vérifie que 'Anonymous sign-ins' est activé dans Supabase Auth.";
    console.warn("[useAuthOnline] ensureAnonSession failed:", e);
    return { session: null, error: msg };
  }
}

/**
 * Profile = BONUS (best-effort).
 * Ne doit JAMAIS bloquer ready/status.
 */
async function safeLoadProfileBestEffort(): Promise<OnlineProfile | null> {
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

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>(initial);

  // Watchdog anti-freeze
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
    setState((s) => ({ ...s, loading: true, status: "checking", error: null }));

    // ✅ V8: garantit une session (anon si besoin)
    const { session, error } = await ensureAnonSession();
    applyAuthFromSession(setState, session, error);

    // BONUS: profile cloud (best-effort)
    if (session?.user) {
      const profile = await safeLoadProfileBestEffort();
      setState((s) => {
        if (!s.user || s.user.id !== session.user.id) return s;
        return { ...s, profile };
      });
    }
  }, []);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // ✅ Boot V8: session obligatoire (anon si besoin)
        const { session, error } = await ensureAnonSession();
        if (!alive) return;

        applyAuthFromSession(setState, session, error);

        // BONUS profile
        if (session?.user) {
          safeLoadProfileBestEffort().then((profile) => {
            if (!alive) return;
            setState((s) => {
              if (!s.user || s.user.id !== session.user!.id) return s;
              return { ...s, profile };
            });
          });
        }

        // ✅ subscribe auth changes
        const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
          try {
            if (!alive) return;

            // Si SIGNED_OUT -> V8: on recrée anon immédiatement en arrière-plan
            if (event === "SIGNED_OUT" || !nextSession?.user) {
              applyAuthFromSession(setState, null, null);

              // recrée anon
              ensureAnonSession().then(({ session: s2, error: e2 }) => {
                if (!alive) return;
                applyAuthFromSession(setState, s2, e2);
              });

              return;
            }

            // signed_in
            applyAuthFromSession(setState, nextSession, null);

            // BONUS profile
            safeLoadProfileBestEffort().then((profile) => {
              if (!alive) return;
              setState((s) => {
                if (!s.user || s.user.id !== nextSession.user.id) return s;
                return { ...s, profile };
              });
            });
          } catch (e) {
            console.warn("[useAuthOnline] onAuthStateChange handler error:", e);
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
        if (alive) setState((s) => ({ ...s, loading: false, ready: true }));
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

  // ✅ V8 logout debug: signOut puis recrée anon
  const logout = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[useAuthOnline] signOut error:", e);
    } finally {
      // V8: on redevient "connecté" via anon
      await refresh();
    }
  }, [refresh]);

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
