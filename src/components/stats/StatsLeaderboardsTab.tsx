// @ts-nocheck
// =============================================================
// src/components/stats/StatsLeaderboardsTab.tsx
// Wrapper pour la page CLASSEMENTS globale
// =============================================================

import * as React from "react";
import type { Store } from "../../lib/types";
import StatsLeaderboardsPage from "../../pages/StatsLeaderboardsPage";

type Props = {
  // ✅ Compat historique : utilisé depuis StatsShell/StatsHub (ancienne API)
  store?: Store;
  go?: (tab: any, params?: any) => void;

  // ✅ Nouvelle API (StatsHub patché) : on peut fournir directement les données
  // (évite d'avoir à reconstruire un Store complet)
  records?: any[];
  profiles?: any[];
};

export default function StatsLeaderboardsTab({ store, go, records, profiles }: Props) {
  // Si le caller a fourni records/profiles, on construit un pseudo-store minimal.
  // StatsLeaderboardsPage sait déjà agréger store.history + IDB History ;
  // ici on lui donne juste assez pour qu'il puisse afficher sans crash.
  const pseudoStore = React.useMemo(() => {
    if (store) return store;
    return {
      profiles: Array.isArray(profiles) ? profiles : [],
      history: Array.isArray(records) ? records : [],
    } as any;
  }, [store, profiles, records]);

  const noop = React.useCallback(() => {}, []);

  return <StatsLeaderboardsPage store={pseudoStore as any} go={(go as any) ?? noop} />;
}