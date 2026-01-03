// @ts-nocheck
// ============================================
// src/hooks/useAuthOnline.tsx
// Auth Online unifiée (MOCK ou Supabase réel)
//
// ✅ Objectifs V7 (stabilité + multi-comptes):
// - Source de vérité = session Supabase (via onlineApi.restoreSession)
// - ready = true quand restoreSession a fini (même si signed_out)
// - Ne JAMAIS spammer Supabase sur des tables/colonnes absentes
// - Aucun write "presence" tant que la DB n'est pas prête
//
// ✅ CRITIQUE (fix bugs "compte inexistant" après email confirm / reset):
// - Listen Supabase auth state changes -> refresh automatique
// - Ne persiste plus d'état "pending" côté LS (géré dans onlineApi)
// - Ne mélange jamais 2 comptes: on reset état et on relit la session live
//
// ✅ IMPORTANT:
// - SUPPRIME app_version / last_seen / device / presence ping
// - Pas de profiles_online / matches_online ici
// ============================================

import React from "react";
import { onlineApi, type AuthSession, type UpdateProfilePayload } from "../lib/onlineApi";
import type { UserAuth, OnlineProfile } from "../lib/onlineTypes";
import { supabase } from "../lib/supabaseClient";

type Status = "checking" | "signed_out" | "signed_in" | "pending";

export type AuthOnlineContextValue = {
  status: Status;
  loading: boolean;
  ready: boolean;

  // ✅ infos user
  user: UserAuth | null;
  profile: OnlineProfile | null;

  // ✅ vrai si mode mock
  isMock: boolean;

  // ✅ actions
  signup: (p: { nickname: string; email?: string; password?: string }) => Promise<void>;
  login: (p: { nickname?: string; email?: string; password?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthOnlineContext = React.createContext<AuthOnlineContextValue | null>(null);

// ============================================================
// ✅ SAFETY FLAG — présence désactivée
// ============================================================
const PRESENCE_ENABLED = false;

// ============================================================
// Provider
// ============================================================
export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("checking");
  const [loading, setLoading] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  const [user, setUser] = React.useState<UserAuth | null>(null);
  const [profile, setProfile] = React.useState<OnlineProfile | null>(null);

  // Pour éviter les refresh multiples simultanés
  const refreshInFlight = React.useRef<Promise<void> | null>(null);

  // Applique une session (ou null) : user + profil complet
  const applySession = React.useCallback((session: AuthSession | null) => {
    setReady(true);

    if (!session) {
      setStatus("signed_out");
      setUser(null);
      setProfile(null);
      return;
    }

    // ✅ Pending email confirmation (token vide)
    if (!session.token) {
      setStatus("pending");
      setUser(session.user as any);
      setProfile(null);
      return;
    }

    setStatus("signed_in");
    setUser(session.user as any);
    setProfile(session.profile as any);
  }, []);

  // Refresh "safe" : relit depuis Supabase (source de vérité)
  const refreshSafe = React.useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    refreshInFlight.current = (async () => {
      try {
        const session = await onlineApi.restoreSession();
        applySession(session as any);
      } catch (e) {
        console.warn("[authOnline] refresh error:", e);
        applySession(null);
      } finally {
        refreshInFlight.current = null;
      }
    })();

    return refreshInFlight.current;
  }, [applySession]);

  // Restore au chargement (lecture via onlineApi)
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setReady(false);
        setStatus("checking");
        const session = await onlineApi.restoreSession();
        if (!cancelled) applySession(session as any);
      } catch (e) {
        console.warn("[authOnline] restore error:", e);
        if (!cancelled) applySession(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySession]);

  // ============================================================
  // ✅ LISTENER SUPABASE (LA CLÉ)
  // - déclenché sur: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED,
  //   PASSWORD_RECOVERY, USER_UPDATED, etc.
  // - résout "compte inexistant" après validation email / reset
  // ============================================================
  React.useEffect(() => {
    if (onlineApi.USE_MOCK) return;

    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      // On évite les logs de token/sessions en clair
      // console.info("[authOnline] event:", event);

      // ⚠️ Sur SIGNED_OUT -> on purge immédiatement l'état
      if (event === "SIGNED_OUT") {
        applySession(null);
        return;
      }

      // ✅ Sur tous les autres événements, on relit "live"
      await refreshSafe();
    });

    return () => {
      try {
        sub?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, [applySession, refreshSafe]);

  // ============================================================
  // ✅ PRESENCE EFFECT (désactivé)
  // ============================================================
  React.useEffect(() => {
    if (!PRESENCE_ENABLED) return;
    if (onlineApi.USE_MOCK) return;
    if (status !== "signed_in") return;

    // Si tu veux réactiver plus tard :
    // - créer table presence OU colonnes dans profiles
    // - écrire "safe" sans colonnes inexistantes
  }, [status, (user as any)?.id]);

  // SIGNUP
  async function signup(params: { nickname: string; email?: string; password?: string }) {
    const nickname = (params.nickname || "").trim();
    const email = (params.email || "").trim();
    const password = (params.password || "").trim();

    setLoading(true);
    try {
      if (onlineApi.USE_MOCK) {
        if (!nickname) throw new Error("Pseudo requis");
        const session = await onlineApi.signup({ nickname } as any);
        applySession(session as any);
        return;
      }

      if (!email || !password) {
        throw new Error("Email et mot de passe sont requis pour créer un compte.");
      }

      // ✅ Important : onlineApi.signup peut renvoyer token "" (pending)
      const session = await onlineApi.signup({
        email,
        password,
        nickname: nickname || email,
      } as any);

      applySession(session as any);

      // ✅ Si pending -> l'utilisateur doit valider l'email.
      // Le listener onAuthStateChange + callback route feront le reste.
    } finally {
      setLoading(false);
    }
  }

  // LOGIN
  async function login(params: { nickname?: string; email?: string; password?: string }) {
    const nickname = (params.nickname || "").trim();
    const email = (params.email || "").trim();
    const password = (params.password || "").trim();

    setLoading(true);
    try {
      if (onlineApi.USE_MOCK) {
        if (!nickname) throw new Error("Pseudo requis");
        const session = await onlineApi.login({ nickname } as any);
        applySession(session as any);
        return;
      }

      if (!email || !password) {
        throw new Error("Email et mot de passe sont requis pour se connecter.");
      }

      const session = await onlineApi.login({
        email,
        password,
        nickname: nickname || undefined,
      } as any);

      applySession(session as any);
    } finally {
      setLoading(false);
    }
  }

  // LOGOUT
  async function logout() {
    setLoading(true);
    try {
      await onlineApi.logout();
      applySession(null);
    } finally {
      setLoading(false);
    }
  }

  // UPDATE PROFILE
  async function updateProfile(patch: UpdateProfilePayload) {
    setLoading(true);
    try {
      const newProfile = await onlineApi.updateProfile(patch);
      setProfile(newProfile as any);
    } finally {
      setLoading(false);
    }
  }

  // REFRESH manuel
  async function refresh() {
    setLoading(true);
    try {
      await refreshSafe();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthOnlineContext.Provider
      value={{
        status,
        loading,
        ready,
        user,
        profile,
        isMock: !!onlineApi.USE_MOCK,
        signup,
        login,
        logout,
        updateProfile,
        refresh,
      }}
    >
      {children}
    </AuthOnlineContext.Provider>
  );
}

// ============================================
// Hook
// ============================================
export function useAuthOnline(): AuthOnlineContextValue {
  const ctx = React.useContext(AuthOnlineContext);
  if (!ctx) throw new Error("useAuthOnline doit être utilisé dans un AuthOnlineProvider.");
  return ctx;
}
