// ============================================
// src/contexts/AuthSessionContext.tsx
// Compat bridge vers le système V7 unique (useAuthOnline)
// - NE recrée PAS de listener Supabase ici
// - NE crée PAS de client Supabase secondaire
// - Garde l'ancienne API pour les fichiers legacy
// ============================================

import React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useAuthOnline } from "../hooks/useAuthOnline";

type Status = "checking" | "signed_in" | "signed_out";

type Ctx = {
  status: Status;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthSessionContext = React.createContext<Ctx | null>(null);

function AuthSessionBridge({ children }: { children: React.ReactNode }) {
  const online = useAuthOnline();

  const value = React.useMemo<Ctx>(
    () => ({
      status: online.status as Status,
      session: online.session ?? null,
      user: online.user ?? null,
      signOut: online.logout,
      refresh: online.refresh,
    }),
    [online.status, online.session, online.user, online.logout, online.refresh]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <AuthSessionBridge>{children}</AuthSessionBridge>;
}

export function useAuthSession() {
  const ctx = React.useContext(AuthSessionContext);
  if (!ctx) throw new Error("useAuthSession must be used within AuthSessionProvider");
  return ctx;
}
