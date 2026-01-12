// ============================================
// src/lib/supabaseClient.ts
// Client Supabase unique pour toute l'app
// ✅ FIX: singleton HMR-safe => évite "Multiple GoTrueClient instances"
// ✅ SAFE: n'explose jamais si env manquants (log seulement)
// ✅ FIX: storageKey unique par projet Supabase (évite collisions StackBlitz/Pages)
// ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

const isDev = !!import.meta.env.DEV;

// --- Helpers ---
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
  console.log("[supabaseClient] SUPABASE_URL =", SUPABASE_URL);
  console.log("[supabaseClient] PROJECT_REF =", PROJECT_REF);
  console.log(
    "[supabaseClient] ANON_KEY(first10) =",
    (SUPABASE_ANON_KEY || "").slice(0, 10)
  );
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabaseClient] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants. Supabase sera inactif."
  );
}

// ✅ cache global (HMR / imports multiples / double init)
declare global {
  // eslint-disable-next-line no-var
  var __dc_supabase: SupabaseClient | undefined;
}

const canUseWindow = typeof window !== "undefined";

// ⚠️ storage: window.localStorage seulement côté navigateur
const storage = canUseWindow ? window.localStorage : undefined;

// ✅ storageKey custom UNIQUE par projet Supabase
// (évite collisions entre environnements/builds/projets)
const STORAGE_KEY = `dc-supabase-auth-v1:${PROJECT_REF}`;

// ✅ Création client seulement si pas déjà existant
function createSupabaseClient(): SupabaseClient {
  // Même si env manquants, on crée un client "safe" pour éviter crash import,
  // mais les appels réseau échoueront -> à gérer par try/catch côté appelant.
  const url = SUPABASE_URL || "https://invalid.supabase.co";
  const key = SUPABASE_ANON_KEY || "invalid-anon-key";

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,

      // ✅ Ton app gère le parsing /#/auth/callback et /#/auth/reset dans App.tsx
      // => on laisse false ici
      detectSessionInUrl: false,

      storage,
      storageKey: STORAGE_KEY,
    },
  });
}

export const supabase: SupabaseClient =
  globalThis.__dc_supabase || createSupabaseClient();

globalThis.__dc_supabase = supabase;
