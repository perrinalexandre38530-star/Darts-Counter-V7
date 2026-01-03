// @ts-nocheck
// ============================================
// src/hooks/useAuthOnline.tsx
// Auth Online unifiée (MOCK ou Supabase réel)
//
// ✅ Objectifs V7 (stabilité):
// - Ne JAMAIS spammer Supabase sur des tables/colonnes absentes
// - ready = true quand restoreSession a fini (même si signed_out)
// - Aucun write "presence" tant que la DB n'est pas prête
//
// ✅ IMPORTANT (demandé):
// - SUPPRIME app_version / last_seen / device / presence ping
// - Pas de profiles_online / matches_online ici
// ============================================

import React from "react";
import { onlineApi, type AuthSession, type UpdateProfilePayload } from "../lib/onlineApi";
import type { UserAuth, OnlineProfile } from "../lib/onlineTypes";

type Status = "checking" | "signed_out" | "signed_in";

export type AuthOnlineContextValue = {
  status: Status;
  loading: boolean;
  ready: boolean;
  user: UserAuth | null;
  profile: OnlineProfile | null;
  isMock: boolean;
  signup: (p: { nickname: string; email?: string; password?: string }) => Promise<void>;
  login: (p: { nickname?: string; email?: string; password?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthOnlineContext = React.createContext<AuthOnlineContextValue | null>(null);

// ============================================================
// ✅ SAFETY FLAG — présence désactivée
// (Tu pourras remettre plus tard quand tu auras une table/colonnes dédiées)
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

  // Applique une session (ou null) : user + profil complet
  const applySession = React.useCallback((session: AuthSession | null) => {
    setReady(true);

    if (!session) {
      setStatus("signed_out");
      setUser(null);
      setProfile(null);
      return;
    }

    setStatus("signed_in");
    setUser(session.user as any);
    setProfile(session.profile as any);
  }, []);

  // Restore au chargement (lecture via onlineApi)
  React.useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        setReady(false);
        setStatus("checking");
        const session = await onlineApi.restoreSession();
        if (!cancelled) applySession(session);
      } catch (e) {
        console.warn("[authOnline] restore error:", e);
        if (!cancelled) applySession(null);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  // ============================================================
  // ✅ PRESENCE EFFECT (désactivé)
  // ============================================================
  React.useEffect(() => {
    if (!PRESENCE_ENABLED) return;
    if (onlineApi.USE_MOCK) return;
    if (status !== "signed_in") return;

    // Si tu veux réactiver plus tard :
    // - créer table presence OU colonnes dans profiles
    // - réactiver ici avec un write "safe" (sans colonnes inexistantes)
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

      const session = await onlineApi.signup({
        email,
        password,
        nickname: nickname || email,
      } as any);

      applySession(session as any);
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

  // REFRESH (re-lire la session complète)
  async function refresh() {
    setLoading(true);
    try {
      const session = await onlineApi.restoreSession();
      applySession(session as any);
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
