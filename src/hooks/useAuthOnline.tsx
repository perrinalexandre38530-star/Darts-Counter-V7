// ============================================================
// src/hooks/useAuthOnline.ts
// Auth ONLINE (Supabase) — robust anti-freeze (FIX CRITIQUE)
// ✅ RÈGLE: NE JAMAIS bloquer l’UI si profile n’existe pas
// ✅ L’auth = supabase.auth (session/user) POINT.
// - init boot: getSession() + onAuthStateChange()
// - ready=true GARANTI (finally + watchdog) pour éviter blocage AppGate
// - profile = BONUS (best-effort), n’impacte JAMAIS status/ready
// - expose: status, ready, loading, session, user, userId, profile, login/signup/logout/refresh
// ============================================================

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { onlineApi } from "../lib/onlineApi";
import { ensureLocalProfileForOnlineUser } from "../lib/accountBridge";
import type { OnlineProfile } from "../lib/onlineTypes";


async function ensureOnlineProfileRow(user: User): Promise<void> {
  try {
    const base =
      (user.user_metadata as any)?.nickname ||
      (user.email ? user.email.split("@")[0] : "Player");
    const safeBase = String(base || "Player").trim().slice(0, 16) || "Player";
    const suffix = user.id.slice(0, 6);
    // Nick unique & stable: base + suffix
    const nickname = `${safeBase}_${suffix}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const displayName = safeBase;

    // profiles.id n'a parfois pas de DEFAULT -> on met explicitement user.id
    // OnConflict sur id (PK) => pas besoin d'un index unique sur user_id
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        user_id: user.id,
        nickname,
        display_name: displayName,
        created_at: new Date().toISOString(),
      } as any,
      { onConflict: "id" }
    );

    // Si conflit de nickname (unique), on retente avec un suffixe plus long
    if (error && (error as any).code === "23505") {
      const nickname2 = `${safeBase}_${user.id.slice(0, 10)}`.replace(
        /[^a-zA-Z0-9_\-]/g,
        "_"
      );
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          user_id: user.id,
          nickname: nickname2,
          display_name: displayName,
          created_at: new Date().toISOString(),
        } as any,
        { onConflict: "id" }
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
  profile: OnlineProfile | null; // ⚠️ BONUS: best-effort uniquement
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
  // ✅ NEW: ID utilisateur unique (source of truth)
  userId: string | null;

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

async function safeEnsureSession(): Promise<Session | null> {
  const existing = await safeGetSession();
  if (existing?.user) return existing;

  // ✅ COMPTE UTILISATEUR UNIQUE (V7)
  // On NE crée JAMAIS de session anonyme en fallback.
  // Sinon :
  // - l’app semble "connectée" sans vrai compte
  // - on peut avoir l’impression de devoir se reconnecter à chaque fois
  // - et on pollue Supabase avec des users anonymes.
  return null;
}

/**
 * Profile = BONUS.
 * - Ne doit JAMAIS bloquer ready/status.
 * - Si l’API profile n’existe pas / RLS / table absente => return null tranquille.
 */
async function safeLoadProfileBestEffort(user: User): Promise<OnlineProfile | null> {
  try {
    const api: any = onlineApi as any;

    // ✅ onlineApi.getProfile(userId) (V7)
    if (typeof api.getProfile === "function") {
      // ⚠️ FIX: onlineApi.getProfile() (V7) ne prend PAS d'argument.
      // Le passer provoque une exception -> profile reste toujours null,
      // donc pas d'hydratation (nickname/avatar/infos perso) sur les nouveaux appareils.
      const res = await api.getProfile();
      return (res?.profile ?? res ?? null) as OnlineProfile | null;
    }

    // Compat très ancien
    if (typeof api.getMyProfile === "function") {
      const res = await api.getMyProfile();
      return (res?.profile ?? res ?? null) as OnlineProfile | null;
    }

    return null;
  } catch (e) {
    // best-effort : on ne casse jamais l'app si table / RLS / schéma KO
    console.warn("[useAuthOnline] safeLoadProfileBestEffort failed:", e);
    return null;
  }
}

/**
 * ✅ FIX CRITIQUE:
 * status/ready DOIVENT dépendre UNIQUEMENT de session.user.
 * profile ne doit JAMAIS conditionner signed_in / signed_out.
 */
function applyAuthFromSession(setState: React.Dispatch<React.SetStateAction<AuthState>>, session: Session | null) {
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

function tryBridgeLocalProfile(user: User, onlineProfile?: OnlineProfile | null) {
  // ⚠️ Sur un nouvel appareil, l'utilisateur peut être connecté (session persistée)
  // mais ne pas avoir de profil local => l'app le renvoie vers "Profils" et
  // donne l'impression qu'il doit se reconnecter à chaque fois.
  try {
    const w: any = window as any;
    const appStore = w.__appStore;
    if (!appStore || typeof appStore.update !== "function") return;
    appStore.update((store: any) => ensureLocalProfileForOnlineUser(store, user, onlineProfile || undefined));
  } catch (e) {
    console.warn("[useAuthOnline] tryBridgeLocalProfile failed", e);
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
      setState((s) => ({ ...s, loading: true, status: "checking" }));
      const session = await safeEnsureSession();

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
        // PROFILES V7: aucune logique "restore" custom.
        // Supabase décide de la session (getSession/onAuthStateChange).

        const session = await safeEnsureSession();
        if (!alive) return;

        // ✅ Auth = session/user only
        applyAuthFromSession(setState, session);

        // ✅ BONUS profile async (best-effort)
        const user = session?.user ?? null;
        if (user) {
          // ✅ Bridge local profile immediately (fallback name from email)
          tryBridgeLocalProfile(user, null);

          safeLoadProfileBestEffort(user).then((profile) => {
            if (!alive) return;
            setState((s) => {
              if (!s.user || s.user.id !== user.id) return s;
              return { ...s, profile };
            });

            // ✅ Bridge local profile with server profile details (name/avatar)
            tryBridgeLocalProfile(user, profile);
          });
        }

        // subscribe auth changes
        const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
          try {
            if (!alive) return;

            // ✅ Auth = session/user only (peu importe profile)
            if (event === "SIGNED_OUT" || !nextSession?.user) {
              applyAuthFromSession(setState, null);

              // ✅ COMPTE UNIQUE: NE PAS recréer de session anonyme.
              // On reste signed_out tant qu'un vrai login n'est pas fait.
              return;
            }

            applyAuthFromSession(setState, nextSession);

            // ✅ BONUS profile (best-effort) après changement auth
            const nextUser = nextSession.user;

            // ✅ Bridge local profile ASAP
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
    // fallback: évite crash si provider manquant
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