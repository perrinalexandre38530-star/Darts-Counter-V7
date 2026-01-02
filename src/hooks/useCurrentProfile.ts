// ============================================
// src/hooks/useCurrentProfile.ts
// Hook utilitaire : retourne le profil actif
// en lisant le store global exposé dans App.tsx
// (window.__appStore).
// ============================================

import * as React from "react";
import type { Store, Profile } from "../lib/types";

declare global {
  interface Window {
    __appStore?: Store;
  }
}

export function useCurrentProfile(): Profile | null {
  const [profile, setProfile] = React.useState<Profile | null>(null);

  React.useEffect(() => {
    // On lit le store global mis à jour par App.tsx
    const appStore = window.__appStore;
    if (!appStore) {
      setProfile(null);
      return;
    }

    const activeId = appStore.activeProfileId;
    const current =
      (appStore.profiles || []).find((p) => p.id === activeId) ?? null;

    setProfile(current);
  }, []);

  return profile;
}
