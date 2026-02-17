// src/lib/stats/rebuildStatsToStore.ts
// ============================================
// Rebuild stats snapshot into Store from History.list()
// Source de vérité : History (IndexedDB)
// Objectif : reconnecter définitivement History -> Store -> StatsHub
// ============================================

import { History } from "../history";
import { loadStore, saveStore } from "../storage";

export type PlayerStats = {
  matches: number;
  wins: number;
  points: number;
  darts: number;
};

export type ModeStats = {
  matches: number;
  totalPoints: number;
};

type AnyMatch = any;

function asArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export async function rebuildStatsToStore() {
  const history = await History.list();
  const store: any = (await loadStore()) || {};

  const statsByPlayer: Record<string, PlayerStats> = {};
  const statsByMode: Record<string, ModeStats> = {};

  for (const match of asArray<AnyMatch>(history)) {
    if (!match) continue;

    // On s'appuie sur payload déjà décodé par History.list() (voir src/lib/history.ts)
    const payload = match.payload;
    if (!payload || typeof payload !== "object") continue;

    const mode = String(match.mode || payload.mode || "unknown");
    const players = asArray<any>(payload.players);

    // --- statsByMode ---
    if (!statsByMode[mode]) {
      statsByMode[mode] = { matches: 0, totalPoints: 0 };
    }
    statsByMode[mode].matches++;

    for (const p of players) {
      if (!p) continue;

      const id = String(p.id || p.playerId || p.profileId || p.name || "");
      if (!id) continue;

      if (!statsByPlayer[id]) {
        statsByPlayer[id] = { matches: 0, wins: 0, points: 0, darts: 0 };
      }

      statsByPlayer[id].matches++;

      // winner flag : isWinner / winner / rank===1 etc (best effort)
      const isWinner = Boolean(
        p.isWinner ||
          p.winner ||
          p.is_winner ||
          p.rank === 1 ||
          p.placement === 1
      );
      if (isWinner) statsByPlayer[id].wins++;

      const pts = Number(p.points ?? p.score ?? 0) || 0;
      const darts = Number(p.dartsThrown ?? p.darts ?? p.thrown ?? 0) || 0;

      statsByPlayer[id].points += pts;
      statsByPlayer[id].darts += darts;

      statsByMode[mode].totalPoints += pts;
    }
  }

  // On écrit dans le store ce que StatsHub lit (snapshot stable)
  store.statsByPlayer = statsByPlayer;
  store.statsByMode = statsByMode;

  await saveStore(store);


  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dc-history-updated"));
    }
  } catch {}
  return {
    players: Object.keys(statsByPlayer).length,
    modes: Object.keys(statsByMode).length,
  };
}
