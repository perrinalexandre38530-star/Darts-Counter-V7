// ============================================
// src/defis/modes/halve_it.ts
// HALF-IT (Défi)
// - Cible par round (20→15→BULL), 3 fléchettes
// - Si aucune fléchette sur la cible: score total ÷2
// - Sinon: + (somme des hits sur la cible)
// ============================================

import type { DefiMode } from "../engine/DefiEngine";
import type { DefiDart, RankingEntry, DefiThrow } from "../engine/DefiTypes";

export type HalveItConfig = {
  rounds: number; // nombre de cibles jouées (par joueur)
};

export type HalveItData = {
  scores: Record<string, number>;
  turnsCompleted: number;
  rounds: number;
  playersCount: number;
  targetIndex: number; // 0..rounds-1 (global)
};

const TARGETS: Array<{ label: string; v: number }> = [
  { label: "20", v: 20 },
  { label: "19", v: 19 },
  { label: "18", v: 18 },
  { label: "17", v: 17 },
  { label: "16", v: 16 },
  { label: "15", v: 15 },
  { label: "BULL", v: 25 },
];

const dartPoints = (d: DefiDart) => {
  const v = Math.max(0, Number.isFinite(d.v) ? d.v : 0);
  const m = d.mult === 2 ? 2 : d.mult === 3 ? 3 : 1;
  // BULL: mult 1 => 25, mult 2 => 50 (mult 3 clamp by caller)
  return Math.round(v * m);
};

const hitsSumOnTarget = (throwDarts: DefiThrow, targetV: number) => {
  let s = 0;
  for (const d of throwDarts) {
    if ((d?.v ?? -1) === targetV) s += dartPoints(d);
  }
  return s;
};

const mode: DefiMode<HalveItConfig, HalveItData> = {
  id: "halve_it",
  label: "HALVE-IT",
  dartsPerTurn: 3,

  init({ players, config }) {
    const rounds = Math.max(1, Math.min(50, config?.rounds ?? 10));
    const scores: Record<string, number> = {};
    for (const p of players) scores[p.id] = 0;
    return { scores, turnsCompleted: 0, rounds, playersCount: players.length, targetIndex: 0 };
  },

  onDart(data) {
    // Les points sont comptés à la fin de la volée (onTurnEnd) uniquement
    return data;
  },

  onTurnEnd(data, playerId, throwDarts, ctx) {
    const t = TARGETS[data.targetIndex % TARGETS.length];
    const hits = hitsSumOnTarget(throwDarts, t.v);

    const prev = data.scores[playerId] ?? 0;
    const nextScore = hits === 0 ? Math.floor(prev / 2) : prev + hits;

    // Avance compteur de tours (1 tour = 1 volée)
    const turnsCompleted = data.turnsCompleted + 1;

    // Chaque fois que tous les joueurs ont joué, on passe au round (cible) suivant
    const targetIndex = turnsCompleted % data.playersCount === 0 ? data.targetIndex + 1 : data.targetIndex;

    return {
      ...data,
      scores: { ...data.scores, [playerId]: nextScore },
      turnsCompleted,
      targetIndex,
    };
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
    const t = TARGETS[data.targetIndex % TARGETS.length];
    const turnP = ctx.players.find((p) => p.id === turnPlayerId);
    const score = data.scores[turnPlayerId] ?? 0;

    return {
      title: "HALVE-IT",
      subtitle: `Cible: ${t.label}  •  Fléchettes: 3`,
      roundLabel: `Round ${Math.min(data.rounds, data.targetIndex + 1)}/${data.rounds}`,
      turnLabel: turnP ? `À toi : ${turnP.name} (${score})` : undefined,
    };
  },
};

export default mode;
