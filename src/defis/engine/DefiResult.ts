// ============================================
// src/defis/engine/DefiResult.ts
// Résultat standard Défi (hors Territories)
// ============================================

import type { RankingEntry, DefiDisplay } from "./DefiTypes";
import type { DefiState } from "./DefiState";

export type DefiResult = {
  finishedAt: number;
  /** Classement final (ou état si non classable) */
  ranking: RankingEntry[];
  /** Vue synthèse pour écran de fin */
  summary?: DefiDisplay;
  /** État final complet (si besoin) */
  finalState?: DefiState<any>;
};
