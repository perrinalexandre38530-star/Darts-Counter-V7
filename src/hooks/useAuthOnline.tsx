// @ts-nocheck
// ============================================
// src/hooks/useAuthOnline.tsx
// Auth Online unifiée (MOCK ou Supabase réel)
// - Compatible ancien code (user/profile/status/loading/...)
// - En mode réel : email + mot de passe requis
// - En mode mock : pseudo uniquement
// ✅ FIX: ajoute "ready" pour éviter que l'app conclue trop tôt "pas de compte"
// ✅ NEW: PRESENCE profiles_online (upsert + anti spam + last_seen + away/online)
// ============================================

import React from "react";
import {
  onlineApi,
  type AuthSession,
  type UpdateProfilePayload,
} from "../lib/onlineApi";
import type { UserAuth, OnlineProfile } from "../lib/onlineTypes";

// ✅ Supabase client (si tu l’as déjà dans ton projet)
import { supabase } from "../lib/supabaseClient";

type Status = "checking" | "signed_out" | "signed_in";

export type AuthOnlineContextValue = {
  status: Status;
  loading: boolean;
  ready: boolean; // ✅ AJOUT: vrai quand restoreSession a fini (même si signed_out)
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
// ✅ PRESENCE helpers (anti-spam, robust)
// ============================================================
const PRESENCE_THROTTLE_MS = 5000;
const PRESENCE_HEARTBEAT_MS = 25000;
const PRESENCE_ERR_COOLDOWN_MS = 15000;

let __lastPresenceWrite = 0;
let __lastPresenceErrorAt = 0;

function canWritePresence() {
  const now = Date.now();
  if (now - __lastPresenceWrite < PRESENCE_THROTTLE_MS) return false;
  if (now - __lastPresenceErrorAt < PRESENCE_ERR_COOLDOWN_MS) return false;
  __lastPresenceWrite = now;
  return true;
}

async function upsertPresenceSafe(userId: string, patch: any) {
  if (!userId) return;
  if (!supabase) return;

  if (!canWritePresence()) return;

  try {
    const payload = {
      user_id: userId,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles_online")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      __lastPresenceErrorAt = Date.now();
      console.warn("[presence] upsert failed:", error?.message || error);
    }
  } catch (e: any) {
    __lastPresenceErrorAt = Date.now();
    console.warn("[presence] upsert fatal:", e?.message || e);
  }
}

async function setPresenceStatus(userId: string, status: "online" | "away" | "offline") {
  await upsertPresenceSafe(userId, {
    status,
    last_seen: new Date().toISOString(),
    device: "web",
    app_version: "v5",
  });
}

// ============================================
// Provider
// ============================================

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("checking");
  const [loading, setLoading] = React.useState(false);

  // ✅ AJOUT
  const [ready, setReady] = React.useState(false);

  const [user, setUser] = React.useState<UserAuth | null>(null);
  const [profile, setProfile] = React.useState<OnlineProfile | null>(null);

  // Applique une session (ou null) : user + profil complet
  const applySession = React.useCallback((session: AuthSession | null) => {
    // ✅ IMPORTANT: dès qu'on a une réponse (session OU null), on est "ready"
    setReady(true);

    if (!session) {
      setStatus("signed_out");
      setUser(null);
      setProfile(null);
      return;
    }

    setStatus("signed_in");
    setUser(session.user);
    setProfile(session.profile);
  }, []);

  // Restore au chargement (lecture depuis Supabase / localStorage via onlineApi)
  React.useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        setReady(false);
        setStatus("checking");

        const session = await onlineApi.restoreSession();
        if (!cancelled) applySession(session);
      } catch (e) {
        console.warn("[authOnline] restore error", e);
        if (!cancelled) applySession(null);
      }
    }

    restore();

    return () => {
      cancelled = true;
    };
  }, [applySession]);

  // ============================================================
  // ✅ PRESENCE EFFECT (c’est ICI que ça doit vivre)
  // - évite les boucles
  // - heartbeat + away/online
  // ============================================================
  React.useEffect(() => {
    if (onlineApi.USE_MOCK) return; // pas de présence en mock
    if (status !== "signed_in") return;
    const uid = String((user as any)?.id || "");
    if (!uid) return;

    let alive = true;
    let timer: any = null;

    const writeNow = async () => {
      if (!alive) return;
      const st = document.hidden ? "away" : "online";
      await setPresenceStatus(uid, st as any);
    };

    // 1) écriture immédiate
    writeNow();

    // 2) heartbeat
    timer = setInterval(() => {
      writeNow();
    }, PRESENCE_HEARTBEAT_MS);

    // 3) visibility -> away/online
    const onVis = () => writeNow();
    document.addEventListener("visibilitychange", onVis);

    // 4) best effort offline quand on quitte
    const onUnload = () => {
      // navigator.sendBeacon serait idéal, mais on reste simple:
      // on tente une dernière écriture "offline" (peut être ignorée par navigateur)
      try {
        setPresenceStatus(uid, "offline");
      } catch {}
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      alive = false;
      try {
        clearInterval(timer);
      } catch {}
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onUnload);

      // best effort offline quand on se déconnecte / démonte
      try {
        setPresenceStatus(uid, "offline");
      } catch {}
    };
  }, [status, (user as any)?.id]);

  // SIGNUP
  async function signup(params: { nickname: string; email?: string; password?: string }) {
    const nickname = params.nickname?.trim();
    const email = params.email?.trim();
    const password = params.password?.trim();

    setLoading(true);
    try {
      // Mode MOCK : pseudo seulement
      if (onlineApi.USE_MOCK) {
        if (!nickname) throw new Error("Pseudo requis");
        const session = await onlineApi.signup({ nickname });
        applySession(session);
        return;
      }

      // Mode Supabase réel : email + mot de passe obligatoires
      if (!email || !password) {
        throw new Error("Email et mot de passe sont requis pour créer un compte.");
      }

      const session = await onlineApi.signup({
        email,
        password,
        nickname: nickname || email,
      });

      applySession(session);
    } finally {
      setLoading(false);
    }
  }

  // LOGIN
  async function login(params: { nickname?: string; email?: string; password?: string }) {
    const nickname = params.nickname?.trim();
    const email = params.email?.trim();
    const password = params.password?.trim();

    setLoading(true);
    try {
      // Mode MOCK : pseudo seulement
      if (onlineApi.USE_MOCK) {
        if (!nickname) throw new Error("Pseudo requis");
        const session = await onlineApi.login({ nickname });
        applySession(session);
        return;
      }

      // Mode Supabase réel : email + mot de passe obligatoires
      if (!email || !password) {
        throw new Error("Email et mot de passe sont requis pour se connecter.");
      }

      const session = await onlineApi.login({
        email,
        password,
        nickname: nickname || undefined,
      });

      applySession(session);
    } finally {
      setLoading(false);
    }
  }

  // LOGOUT
  async function logout() {
    setLoading(true);
    try {
      // ✅ best effort offline avant logout
      try {
        const uid = String((user as any)?.id || "");
        if (!onlineApi.USE_MOCK && uid) await setPresenceStatus(uid, "offline");
      } catch {}

      await onlineApi.logout();
      applySession(null);
    } finally {
      setLoading(false);
    }
  }

  // UPDATE PROFILE (toutes les infos perso + avatar_url, etc.)
  async function updateProfile(patch: UpdateProfilePayload) {
    setLoading(true);
    try {
      const newProfile = await onlineApi.updateProfile(patch);
      setProfile(newProfile);
    } finally {
      setLoading(false);
    }
  }

  // REFRESH (re-lire la session complète : user + profil)
  async function refresh() {
    setLoading(true);
    try {
      const session = await onlineApi.restoreSession();
      applySession(session);
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
        isMock: onlineApi.USE_MOCK,
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
  if (!ctx) {
    throw new Error("useAuthOnline doit être utilisé dans un AuthOnlineProvider.");
  }
  return ctx;
}
