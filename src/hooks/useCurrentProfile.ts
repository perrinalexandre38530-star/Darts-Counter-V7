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

  const [linkedTick, setLinkedTick] = React.useState(0);
  React.useEffect(() => {
    const onLinked = () => setLinkedTick((x) => x + 1);
    window.addEventListener("dc-linked-profile-projection-updated", onLinked as any);
    return () => window.removeEventListener("dc-linked-profile-projection-updated", onLinked as any);
  }, []);

  return React.useMemo(() => {
    if (!activeId) return null;
    const base = (profiles.find((p: any) => p?.id === activeId) as any) ?? null;
    if (!base) return null;
    try {
      const raw = localStorage.getItem("dc_linked_profile_projection_v1") || "";
      const parsed = raw ? JSON.parse(raw) : null;
      const linkedProfiles = Array.isArray(parsed?.projection?.profiles) ? parsed.projection.profiles : [];
      const linked = linkedProfiles.find((p: any) => String(p?.id ?? p?.profileId ?? p?.playerId ?? "") === String(activeId));
      if (linked) return { ...base, ...linked } as Profile;
    } catch {}
    return base as Profile;
  }, [activeId, profiles, linkedTick]);
}
