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
import { setStorageUser } from "../lib/storage";
import { onlineApi } from "../lib/onlineApi";
import { isNasProviderEnabled } from "../lib/serverConfig";
import { ensureLocalProfileForOnlineUser } from "../lib/accountBridge";
import type { OnlineProfile } from "../lib/onlineTypes";


async function ensureOnlineProfileRow(user: User): Promise<void> {
  try {
    if (isNasProviderEnabled()) return;
    // ✅ IMPORTANT:
    // Ne pas "upsert" à chaque boot/login.
    // Sinon on écrase le display_name choisi par l'utilisateur (et parfois l'avatar_url).
    // On ne crée la ligne QUE si elle n'existe pas.
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
    // Nick unique & stable: base + suffix
    const nickname = `${safeBase}_${suffix}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const displayName = safeBase;

    // profiles.id n'a parfois pas de DEFAULT -> on met explicitement user.id
    // OnConflict sur id (PK) => pas besoin d'un index unique sur user_id
    // ✅ Insert only (no overwrite)
    const { error } = await supabase.from("profiles").insert(
      {
        id: user.id,
        user_id: user.id,
        nickname,
        display_name: displayName,
        created_at: new Date().toISOString(),
      } as any,
    );

    // Si conflit de nickname (unique), on retente avec un suffixe plus long
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
    if (isNasProviderEnabled()) {
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
    try { setStorageUser(String(user.id || "")); } catch {}
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
    try { setStorageUser(null); } catch {}
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

      // ✅ NAS: ne JAMAIS voler le profil local actif existant à un nouveau compte.
      // Tant qu'aucun profil local n'est explicitement lié à ce compte online,
      // on laisse le store intact et on déclenche un onboarding dédié côté UI.
      if (isNasProviderEnabled() && !alreadyLinked) {
        return store;
      }

      // 🔴 FIX : ne pas créer un nouveau profil si un profil actif existe déjà
      const activeId = store?.activeProfileId;
      if (activeId && profiles.find((p: any) => p.id === activeId) && !alreadyLinked) {
        return store;
      }

      return ensureLocalProfileForOnlineUser(
        store,
        user,
        onlineProfile || undefined
      );
    });
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

        if (isNasProviderEnabled()) {
          const onNasAuthChanged = async () => {
            try {
              if (!alive) return;
              const nextSession = await safeEnsureSession();
              applyAuthFromSession(setState, nextSession);
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

          window.addEventListener("dc-auth-changed", onNasAuthChanged as EventListener);
          return () => {
            try {
              window.removeEventListener("dc-auth-changed", onNasAuthChanged as EventListener);
            } catch {}
          };
        }

        // subscribe auth changes
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
      try { setStorageUser(null); } catch {}
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