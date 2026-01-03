// ============================================================
// src/hooks/useAuthOnline.tsx
// Auth Online unifiée (V7 STABLE)
// - Restore session au boot -> ready=true même si signed_out
// - Aucun “presence ping” / aucun write DB tant que pas demandé
// - Sync store: pull au login/restore (si cloud plus récent), push manuel
// ============================================================

import React from "react";
import {
  onlineApi,
  type AuthSession,
  type SignupPayload,
  type LoginPayload,
  type UpdateProfilePayload,
} from "../lib/onlineApi";
import type { OnlineProfile } from "../lib/onlineTypes";
import { hydrateFromOnline, pushLocalSnapshotToOnline } from "../lib/hydrateFromOnline";
import { startCloudSync, stopCloudSync } from "../lib/cloudSync";

type AuthOnlineContextValue = {
  ready: boolean;
  loading: boolean;
  session: AuthSession | null;

  // auth
  signup: (p: SignupPayload) => Promise<AuthSession>;
  login: (p: LoginPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
  restore: () => Promise<AuthSession | null>;

  // account
  resendSignupConfirmation: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  deleteAccount: () => Promise<void>;

  // profile
  updateProfile: (patch: UpdateProfilePayload) => Promise<OnlineProfile>;

  // cloud sync
  syncPull: (opts?: { reload?: boolean }) => Promise<{ status: string; applied: boolean }>;
  syncPush: () => Promise<void>;
};

const AuthOnlineContext = React.createContext<AuthOnlineContextValue | null>(null);

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [session, setSession] = React.useState<AuthSession | null>(null);

  const restore = React.useCallback(async () => {
    setLoading(true);
    try {
      const s = await onlineApi.restoreSession();
      setSession(s);

      // ✅ PATCH 2: si session valide -> startCloudSync
      if (s?.token) {
        try {
          startCloudSync(); // ✅ démarre pull/push cloud
        } catch {}

        // ✅ si connecté “vraiment” (token non vide), on tente un pull cloud
        try {
          await hydrateFromOnline({ reload: false });
        } catch {}
      } else {
        // pas de session => stop pour éviter un timer fantôme
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
    restore();
  }, [restore]);

  const signup = React.useCallback(async (p: SignupPayload) => {
    setLoading(true);
    try {
      const s = await onlineApi.signup(p);
      setSession(s);

      // ✅ PATCH 2: si signup retourne un token, on démarre la sync
      if (s?.token) {
        try {
          startCloudSync();
        } catch {}
      }

      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = React.useCallback(async (p: LoginPayload) => {
    setLoading(true);
    try {
      const s = await onlineApi.login(p);
      setSession(s);

      // ✅ PATCH 2: session signée -> startCloudSync
      if (s?.token) {
        try {
          startCloudSync(); // ✅ démarre pull/push cloud
        } catch {}
      }

      // ✅ pull cloud (si cloud plus récent) + reload pour tout recharger
      try {
        await hydrateFromOnline({ reload: true });
      } catch {
        // si ça rate, on laisse la session quand même
      }

      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = React.useCallback(async () => {
    setLoading(true);
    try {
      // ✅ PATCH 2: stop timer AVANT/pendant logout
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

  const resendSignupConfirmation = React.useCallback(async (email: string) => {
    await onlineApi.resendSignupConfirmation(email);
  }, []);

  const requestPasswordReset = React.useCallback(async (email: string) => {
    await onlineApi.requestPasswordReset(email);
  }, []);

  const updateEmail = React.useCallback(async (newEmail: string) => {
    await onlineApi.updateEmail(newEmail);
  }, []);

  const deleteAccount = React.useCallback(async () => {
    setLoading(true);
    try {
      // ✅ sécurité: stop sync avant suppression
      try {
        stopCloudSync();
      } catch {}

      await onlineApi.deleteAccount();
      setSession(null);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  const updateProfile = React.useCallback(async (patch: UpdateProfilePayload) => {
    setLoading(true);
    try {
      const prof = await onlineApi.updateProfile(patch);
      // refresh session cache
      const s = await onlineApi.getCurrentSession();
      setSession(s);

      // (optionnel) si la session a expiré, on coupe la sync
      if (!s?.token) {
        try {
          stopCloudSync();
        } catch {}
      }

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
    session,

    signup,
    login,
    logout,
    restore,

    resendSignupConfirmation,
    requestPasswordReset,
    updateEmail,
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
