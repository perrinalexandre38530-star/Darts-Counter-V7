// ============================================
// src/lib/supabaseClient.ts
// Client Supabase unique pour toute l'app
// - Singleton HMR-safe => évite "Multiple GoTrueClient instances"
// - Safe si env manquants (log seulement)
// - storageKey stable et unique par projet Supabase (évite collisions)
// - Hash-router safe: l'app gère elle-même /#/auth/callback et /#/auth/reset
// ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { purgeLegacyLocalStorageIfNeeded } from "./storageQuota";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

// ✅ Exports de diagnostic (évite de "deviner" quand Supabase est injoignable)
// - url: valeur réellement injectée par Vite
// - hasEnv: true si URL + KEY présentes
export const __SUPABASE_ENV__ = {
  url: SUPABASE_URL,
  hasEnv: !!SUPABASE_URL && !!SUPABASE_ANON_KEY,
} as const;

const isDev = !!import.meta.env.DEV;

function supabaseProjectRef(url: string): string {
  // Ex: https://abcdefghijk.supabase.co -> "abcdefghijk"
  try {
    const u = new URL(url);
    const host = u.hostname || "";
    const ref = host.split(".")[0] || "";
    return ref || "unknown";
  } catch {
    return "unknown";
  }
}

const PROJECT_REF = supabaseProjectRef(SUPABASE_URL);

// Logs utiles (DEV uniquement)
if (isDev) {
  // eslint-disable-next-line no-console
  console.log("[supabaseClient] SUPABASE_URL =", SUPABASE_URL);
  // eslint-disable-next-line no-console
  console.log("[supabaseClient] PROJECT_REF =", PROJECT_REF);
  // eslint-disable-next-line no-console
  console.log("[supabaseClient] ANON_KEY(first10) =", (SUPABASE_ANON_KEY || "").slice(0, 10));
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabaseClient] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants. Supabase sera inactif."
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __dc_supabase_by_ref: Record<string, SupabaseClient> | undefined;
}

const canUseWindow = typeof window !== "undefined";

// ⚠️ Sur mobile (surtout Android/WebView), le localStorage peut être saturé par des vieux
// caches/historiques. Si le quota est dépassé, Supabase Auth ne peut plus persister la session
// (erreur "exceeded the quota"), donc on ne restaure rien au reboot.
// => On purge les vieux gros keys **avant** de créer le client et on utilise un storage "safe".
if (canUseWindow) {
  purgeLegacyLocalStorageIfNeeded({ force: false });
}

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function safeStorage(): StorageLike | undefined {
  if (!canUseWindow) return undefined;

  const ls = window.localStorage;
  const ss = window.sessionStorage;

  const trySet = (s: StorageLike, key: string, value: string) => {
    try {
      s.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };

  return {
    getItem: (key: string) => {
      try {
        const v = ls.getItem(key);
        if (v != null) return v;
      } catch {
        // ignore
      }
      try {
        return ss.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      // 1) localStorage
      if (trySet(ls, key, value)) return;

      // 2) purge + retry localStorage
      purgeLegacyLocalStorageIfNeeded({ force: true });
      if (trySet(ls, key, value)) return;

      // 3) fallback sessionStorage (moins persistant, mais évite le blocage)
      trySet(ss, key, value);
    },
    removeItem: (key: string) => {
      try {
        ls.removeItem(key);
      } catch {
        // ignore
      }
      try {
        ss.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

const storage = safeStorage();

// ✅ storageKey custom UNIQUE par projet Supabase
const STORAGE_KEY = `dc-supabase-auth-v2:${PROJECT_REF}`;

function createSupabaseClient(): SupabaseClient {
  // Même si env manquants, on crée un client "safe" pour éviter crash import.
  // ⚠️ MAIS on ne met plus une URL "invalid" qui masque le vrai problème :
  // on garde une URL vide et c'est l'UI qui affichera un message clair.
  const url = SUPABASE_URL || "";
  const key = SUPABASE_ANON_KEY || "";

  // Si url/key vides, createClient plantera au moment du fetch => "Failed to fetch".
  // C'est attendu : on affiche une erreur explicite côté écran de login.
  return createClient(url || "https://invalid.supabase.co", key || "invalid-anon-key", {
    auth: {
      persistSession: true,
      autoRefreshToken: true,

      // Hash-router: les params de session peuvent être derrière le #
      // => on gère le parsing / exchange dans onlineApi.restoreSession()
      detectSessionInUrl: false,

      storage,
      storageKey: STORAGE_KEY,

      // PKCE recommandé (magic link / reset)
      flowType: "pkce",
    },
  });
}

// ✅ Singleton HMR-safe **par projet Supabase**.
// Si tu changes VITE_SUPABASE_URL (rebase/zip différent), on évite de garder
// un ancien client pointant vers un autre projet (cause typique des "Failed to fetch").
const byRef = (globalThis.__dc_supabase_by_ref ||= {});

export const supabase: SupabaseClient = byRef[PROJECT_REF] || createSupabaseClient();
byRef[PROJECT_REF] = supabase;