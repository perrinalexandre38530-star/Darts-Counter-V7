// ============================================================
// src/hooks/useAuthOnline.tsx
// V8 — 1 compte Supabase unique + auto-session
// + Compat UI : fournit login/signup pour Profiles.tsx
// ============================================================

import React from "react";
import {
  onlineApi,
  type AuthSession,
  type UpdateProfilePayload,
  type SignupPayload,
  type LoginPayload,
} from "../lib/onlineApi";
import type { OnlineProfile } from "../lib/onlineTypes";

type Status = "signed_in" | "signed_out";

type AuthOnlineContextValue = {
  ready: boolean;
  loading: boolean;
  status: Status;

  session: AuthSession | null;
  user: AuthSession["user"] | null;
  profile: OnlineProfile | null;

  // ✅ Compat Profiles.tsx
  signup: (payload: SignupPayload) => Promise<AuthSession>;
  login: (payload: LoginPayload) => Promise<AuthSession>;

  refresh: () => Promise<AuthSession | null>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;

  updateProfile: (patch: UpdateProfilePayload) => Promise<OnlineProfile>;

  syncPull: (opts?: { reload?: boolean }) => Promise<{ status: string; applied: boolean }>;
  syncPush: () => Promise<void>;
};

const AuthOnlineContext = React.createContext<AuthOnlineContextValue | null>(null);

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [session, setSession] = React.useState<AuthSession | null>(null);

  // ✅ "connecté" = on a un user (même si token vide tant que mail pas confirmé)
  const status: Status = session?.user?.id ? "signed_in" : "signed_out";

  const user = session?.user ?? null;
  const profile = session?.profile ?? null;

  const afterSignedIn = React.useCallback(async (_s: AuthSession) => {
    // ✅ Base saine: App.tsx gère pull/push du store (cloud unique)
    // Ici on garde uniquement l'état auth pour l'UI.
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const s = await onlineApi.restoreSession();
      setSession(s);

      if (s?.user?.id) {
        try {
          await afterSignedIn(s);
        } catch {}
      } else {
        try {
          // base saine: pas de cloudSync ici
        } catch {}
      }

      return s;
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [afterSignedIn]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // ✅ Compat: signup (Profiles.tsx)
  const signup = React.useCallback(
    async (payload: SignupPayload) => {
      setLoading(true);
      try {
        const s = await onlineApi.signup(payload);
        setSession(s);
        if (s?.user?.id) await afterSignedIn(s);
        return s;
      } finally {
        setLoading(false);
        setReady(true);
      }
    },
    [afterSignedIn]
  );

  // ✅ Compat: login (Profiles.tsx)
  const login = React.useCallback(
    async (payload: LoginPayload) => {
      setLoading(true);
      try {
        const s = await onlineApi.login(payload);
        setSession(s);
        if (s?.user?.id) await afterSignedIn(s);
        return s;
      } finally {
        setLoading(false);
        setReady(true);
      }
    },
    [afterSignedIn]
  );

  const logout = React.useCallback(async () => {
    setLoading(true);
    try {
      try {
        // base saine: pas de cloudSync ici
      } catch {}
      await onlineApi.logout();
      setSession(null);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  const deleteAccount = React.useCallback(async () => {
    setLoading(true);
    try {
      try {
        // base saine: pas de cloudSync ici
      } catch {}

      await onlineApi.deleteAccount();
      setSession(null);

      // recrée une session anon neuve (comportement V8)
      const s = await onlineApi.restoreSession();
      setSession(s);

      if (s?.user?.id) {
        try {
          await afterSignedIn(s);
        } catch {}
      }
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [afterSignedIn]);

  const updateProfile = React.useCallback(async (patch: UpdateProfilePayload) => {
    setLoading(true);
    try {
      const prof = await onlineApi.updateProfile(patch);

      // refresh cache session (profile)
      const s = await onlineApi.getCurrentSession();
      setSession(s);

      return prof;
    } finally {
      setLoading(false);
    }
  }, []);

  const syncPull = React.useCallback(async (_opts?: { reload?: boolean }) => {
    // ✅ Pull est déclenché automatiquement au SIGNED_IN dans App.tsx
    return { status: "ok", applied: false };
  }, []);

  const syncPush = React.useCallback(async () => {
    // ✅ Push est déclenché automatiquement (debounce) dans App.tsx
  }, []);

  const value: AuthOnlineContextValue = {
    ready,
    loading,
    status,

    session,
    user,
    profile,

    signup,
    login,

    refresh,
    logout,
    deleteAccount,

    updateProfile,
    syncPull,
    syncPush,
  };

  return <AuthOnlineContext.Provider value={value}>{children}</AuthOnlineContext.Provider>;
}

export function useAuthOnline(): AuthOnlineContextValue {
  const ctx = React.useContext(AuthOnlineContext);
  if (!ctx) throw new Error("useAuthOnline doit être utilisé dans un AuthOnlineProvider.");
  return ctx;
}
