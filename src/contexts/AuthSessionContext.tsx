// src/contexts/AuthSessionContext.tsx
import React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Status = "checking" | "signed_in" | "signed_out";

type Ctx = {
  status: Status;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthSessionContext = React.createContext<Ctx | null>(null);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("checking");
  const [session, setSession] = React.useState<Session | null>(null);

  const refresh = React.useCallback(async () => {
    setStatus("checking");
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("[AuthSession] getSession error:", error);
      setSession(null);
      setStatus("signed_out");
      return;
    }
    const s = data?.session ?? null;
    setSession(s);
    setStatus(s ? "signed_in" : "signed_out");
  }, []);

  React.useEffect(() => {
    let alive = true;

    // 1) boot session
    refresh().catch(() => {});

    // 2) live updates
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!alive) return;
      setSession(s ?? null);
      setStatus(s ? "signed_in" : "signed_out");
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const signOut = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[AuthSession] signOut:", e);
    } finally {
      setSession(null);
      setStatus("signed_out");
    }
  }, []);

  const value: Ctx = {
    status,
    session,
    user: session?.user ?? null,
    signOut,
    refresh,
  };

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const ctx = React.useContext(AuthSessionContext);
  if (!ctx) throw new Error("useAuthSession must be used within AuthSessionProvider");
  return ctx;
}
