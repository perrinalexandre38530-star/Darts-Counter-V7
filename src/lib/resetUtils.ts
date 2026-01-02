// ===============================================
// src/lib/resetUtils.ts
// Outils pour réinitialiser les stats d'un profil
// ===============================================

import { delKV } from "./storage";
import { purgeAllStatsForProfile } from "./statsLiteIDB";

// Toutes les clés connues des stats multi-profils
const STAT_KEYS = [
  "x01-multi-v1",
  "x01-training-v1",
  "cricket-v1",
  "clock-v1",
  "killer-v1",
  "stats-lite-v1",
  "stats-quick-v1",
  "history-v1",
];

/**
 * Reset complet des stats pour 1 profil
 * - supprime statsLite
 * - supprime quickStats
 * - supprime stats multi
 * - supprime l’historique associé à ce profil
 */
export async function resetStatsForProfile(playerId: string): Promise<void> {
  try {
    // 1) Purge StatsLite (indexedDB local)
    await purgeAllStatsForProfile(playerId);
  } catch (err) {
    console.warn("[reset] purgeAllStatsForProfile error:", err);
  }

  // 2) Supprimer chaque clé KV contenant des stats
  for (const key of STAT_KEYS) {
    try {
      await delKV(`${key}:${playerId}`);
      await delKV(`${key}:global`);
    } catch {}
  }

  // 3) Purger quick-stats localStorage
  try {
    const QUICK = "dc-quick-stats";
    const raw = localStorage.getItem(QUICK);
    if (raw) {
      const parsed = JSON.parse(raw);
      delete parsed[playerId];
      localStorage.setItem(QUICK, JSON.stringify(parsed));
    }
  } catch {}

  console.log("[reset] Stats réinitialisées pour", playerId);
}
