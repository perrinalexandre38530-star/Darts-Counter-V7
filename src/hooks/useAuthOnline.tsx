// ============================================================
// src/hooks/useAuthOnline.tsx
// V8 — 1 compte unique, auto-connecté (anonymous), supprimable
// ============================================================

import React from "react";
import { onlineApi, type AuthSession, type UpdateProfilePayload } from "../lib/onlineApi";
import type { OnlineProfile } from "../lib/onlineTypes";
import { hydrateFromOnline, pushLocalSnapshotToOnline } from "../lib/hydrateFromOnline";
import { startCloudSync, stopCloudSync } from "../lib/cloudSync";

type Status = "signed_in" | "signed_out";

type AuthOnlineContextValue = {
  ready: boolean;
  loading: boolean;
  status: Status;
  session: AuthSession | null;

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

  // ✅ V8: la "présence" logique côté UI
  const status: Status = session?.token ? "signed_in" : "signed_out";

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      // ✅ V8 onlineApi.restoreSession() => garantit une session (anon si besoin)
      const s = await onlineApi.restoreSession();
      setSession(s);

      if (s?.token) {
        try {
          startCloudSync();
        } catch {}

        // pull cloud léger (pas de reload)
        try {
          await hydrateFromOnline({ reload: false });
        } catch {}
      } else {
        // en théorie ne devrait quasiment jamais arriver en V8
        try {
          stopCloudSync();
        } catch {}
      }

      return s;
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = React.useCallback(async () => {
    // V8: normalement tu ne "logout" jamais définitivement.
    // On le garde pour debug / QA.
    setLoading(true);
    try {
      try {
        stopCloudSync();
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
        stopCloudSync();
      } catch {}

      // supprime compte courant (Edge Function)
      await onlineApi.deleteAccount();
      setSession(null);

      // ✅ V8: recrée automatiquement une session anon neuve
      const s = await onlineApi.restoreSession();
      setSession(s);

      if (s?.token) {
        try {
          startCloudSync();
        } catch {}
      }
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

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

  const syncPull = React.useCallback(async (opts?: { reload?: boolean }) => {
    setLoading(true);
    try {
      const r = await hydrateFromOnline({ reload: opts?.reload ?? true });
      return { status: r.status, applied: !!(r as any).applied };
    } finally {
      setLoading(false);
    }
  }, []);

  const syncPush = React.useCallback(async () => {
    setLoading(true);
    try {
      await pushLocalSnapshotToOnline();
    } finally {
      setLoading(false);
    }
  }, []);

  const value: AuthOnlineContextValue = {
    ready,
    loading,
    status,
    session,

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
