// ============================================
// src/contexts/AuthContext.tsx
// Auth + Profile (V7 propre)
// - Ne bloque jamais la navigation
// - Charge le profil "profiles" si connecté
// ============================================

import React from "react";
import type { User } from "@supabase/supabase-js";
import { useAuthSession } from "./AuthSessionContext";
import { getProfile, type Profile } from "../lib/accountApi";

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = React.createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuthSession();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(false);

  const refreshProfile = React.useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    setLoadingProfile(true);
    try {
      const p = await getProfile(user.id);
      setProfile(p);
    } catch (e) {
      // ✅ NON BLOQUANT : ne casse jamais l'app
      console.warn("[Auth] getProfile non bloquant:", e);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.id]);

  // Charge profil quand session OK
  React.useEffect(() => {
    if (status === "signed_in") {
      refreshProfile().catch(() => {});
    } else {
      setProfile(null);
    }
  }, [status, refreshProfile]);

  const loading = status === "checking" || loadingProfile;

  const value: AuthCtx = {
    user,
    profile,
    loading,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
