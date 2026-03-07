// ============================================
// src/contexts/AuthContext.tsx
// Compat bridge vers le système V7 unique (useAuthOnline)
// - Ne dépend plus du legacy AuthSessionProvider interne
// - Ne recharge plus un profil séparé via getProfile()
// - Reprend le profile best-effort déjà géré par useAuthOnline
// ============================================

import React from "react";
import type { User } from "@supabase/supabase-js";
import { useAuthOnline } from "../hooks/useAuthOnline";
import type { OnlineProfile as Profile } from "../lib/onlineTypes";

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = React.createContext<AuthCtx | null>(null);

function AuthBridge({ children }: { children: React.ReactNode }) {
  const online = useAuthOnline();

  const value = React.useMemo<AuthCtx>(
    () => ({
      user: online.user ?? null,
      profile: online.profile ?? null,
      loading: !online.ready || online.loading || online.status === "checking",
      refreshProfile: online.refresh,
    }),
    [online.user, online.profile, online.ready, online.loading, online.status, online.refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthBridge>{children}</AuthBridge>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
