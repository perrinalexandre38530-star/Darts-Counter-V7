// ============================================
// src/lib/supabaseClient.ts
// Client Supabase unique pour toute l'app
// ✅ FIX: singleton HMR-safe => évite "Multiple GoTrueClient instances"
// ============================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[supabaseClient] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants.");
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

export const supabase: SupabaseClient =
  (canUseWindow && window.__dc_supabase) ||
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,

      // ✅ Ton app utilise /#/auth/callback et /#/auth/reset :
      // - Si tu gères le parsing manuellement dans App.tsx => tu peux laisser false
      // - Sinon, mettre true pour que supabase récupère la session depuis l’URL
      detectSessionInUrl: false,

      storage,
      storageKey: STORAGE_KEY,
    },
  });

if (canUseWindow) window.__dc_supabase = supabase;
