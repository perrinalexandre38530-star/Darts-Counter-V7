// ============================================
// src/hooks/useCurrentProfile.ts
// Hook utilitaire : retourne le profil actif.
//
// ✅ V7 : source de vérité = StoreContext (si présent) OU window.__appStore.store
// - Ne dépend pas d'un snapshot figé au mount
// - Tolérant aux variantes de structure (store/profiles/activeProfileId)
// ============================================

import * as React from "react";
import type { Profile } from "../lib/types";
import { useStore } from "../contexts/StoreContext";

function readStoreBestEffort(): any | null {
  try {
    const w: any = window as any;
    // App.tsx expose: window.__appStore.store = store
    return w?.__appStore?.store ?? null;
  } catch {
    return null;
  }
}

export function useCurrentProfile(): Profile | null {
  const ctx = useStore();
  const store = (ctx as any)?.store ?? readStoreBestEffort();

  // Dépendances primitives (évite rerenders inutiles)
  const activeId = store?.activeProfileId ?? null;
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];

  return React.useMemo(() => {
    if (!activeId) return null;
    return (profiles.find((p: any) => p?.id === activeId) as Profile) ?? null;
  }, [activeId, profiles]);
}
