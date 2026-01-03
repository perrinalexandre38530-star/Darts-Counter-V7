// ============================================
// src/lib/supabaseClient.ts
// Client Supabase unique pour toute l'app
// ✅ FIX: singleton HMR-safe => évite "Multiple GoTrueClient instances"
// ✅ SAFE: n'explose jamais si env manquants (log seulement)
// ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

// Logs utiles (évite de spammer en prod si tu veux : tu peux conditionner sur import.meta.env.DEV)
console.log("[supabaseClient] SUPABASE_URL =", SUPABASE_URL);
console.log(
  "[supabaseClient] ANON_KEY(first10) =",
  (SUPABASE_ANON_KEY || "").slice(0, 10)
);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabaseClient] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants. Supabase sera inactif."
  );
}

// ✅ cache global (HMR / imports multiples / double init)
declare global {
  interface Window {
    __dc_supabase?: SupabaseClient;
  }
}

const canUseWindow = typeof window !== "undefined";

// ⚠️ storage: window.localStorage seulement côté navigateur
const storage = canUseWindow ? window.localStorage : undefined;

// ✅ storageKey custom => évite collisions avec d'autres projets / instances
const STORAGE_KEY = "dc-supabase-auth-v1";

// ✅ Création client seulement si pas déjà existant
function createSupabaseClient(): SupabaseClient {
  // Même si env manquants, on crée un client "safe" pour éviter crash import,
  // mais les appels réseau échoueront -> à gérer par try/catch côté appelant.
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,

      // ✅ Ton app utilise /#/auth/callback et /#/auth/reset :
      // - Si tu gères le parsing manuellement dans App.tsx => laisse false
      // - Sinon, mets true pour que supabase récupère la session depuis l’URL
      detectSessionInUrl: false,

      storage,
      storageKey: STORAGE_KEY,
    },
    // Optionnel: schema par défaut "public"
    // db: { schema: "public" },
  });
}

export const supabase: SupabaseClient =
  (canUseWindow && window.__dc_supabase) || createSupabaseClient();

if (canUseWindow) window.__dc_supabase = supabase;
