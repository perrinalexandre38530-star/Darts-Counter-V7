// ============================================
// src/defis/modes/count_up.ts
// COUNT-UP (Défi)
// - Ajoute tous les points touchés
// - Fin après N tours par joueur
// ============================================

import type { DefiMode } from "../engine/DefiEngine";
import type { DefiDart, RankingEntry } from "../engine/DefiTypes";

export type CountUpConfig = {
  rounds: number; // tours par joueur
};

export type CountUpData = {
  scores: Record<string, number>;
  turnsCompleted: number; // une volée = 1 tour
  rounds: number;
  playersCount: number;
};

const dartPoints = (d: DefiDart) => {
  const v = Math.max(0, Number.isFinite(d.v) ? d.v : 0);
  const m = d.mult === 2 ? 2 : d.mult === 3 ? 3 : 1;
  return Math.round(v * m);
};

const mode: DefiMode<CountUpConfig, CountUpData> = {
  id: "count_up",
  label: "COUNT-UP",
  dartsPerTurn: 3,

  init({ players, config }) {
    const rounds = Math.max(1, Math.min(50, config?.rounds ?? 10));
    const scores: Record<string, number> = {};
    for (const p of players) scores[p.id] = 0;
    return { scores, turnsCompleted: 0, rounds, playersCount: players.length };
  },

  onDart(data, playerId, dart) {
    return {
      ...data,
      scores: { ...data.scores, [playerId]: (data.scores[playerId] ?? 0) + dartPoints(dart) },
    };
  },

  onTurnEnd(data) {
    return { ...data, turnsCompleted: data.turnsCompleted + 1 };
  },

  isFinished(data) {
    const totalTurns = data.playersCount * data.rounds;
    return data.turnsCompleted >= totalTurns;
  },

  getRanking(data, ctx) {
    const list: RankingEntry[] = ctx.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      value: data.scores[p.id] ?? 0,
    }));
    list.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return list;
  },

  getDisplay(data, ctx, turnPlayerId, state) {
    const turnP = ctx.players.find((p) => p.id === turnPlayerId);
    const score = data.scores[turnPlayerId] ?? 0;

    const maxTurns = data.playersCount * data.rounds;
    const turnsDone = Math.min(maxTurns, data.turnsCompleted);

    return {
      title: "COUNT-UP",
      subtitle: `Tours: ${data.rounds}  •  Fléchettes: 3`,
      roundLabel: `Tour ${state.turn.round}/${data.rounds}`,
      turnLabel: turnP ? `À toi : ${turnP.name} (${score})` : undefined,
    };
  },
};

export default mode;
