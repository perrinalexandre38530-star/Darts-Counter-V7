// ============================================
// src/lib/simpleRounds/variants.ts
// Registry des 5 variantes (darts) basées sur rounds simples.
// ============================================

import tickerCountUp from "../../assets/tickers/ticker_count_up.png";
import tickerSuperBull from "../../assets/tickers/ticker_super_bull.png";
import tickerHappyMille from "../../assets/tickers/ticker_happy_mille.png";
import tickerEnculette from "../../assets/tickers/ticker_enculette.png";
import ticker170 from "../../assets/tickers/ticker_v170.png";

import type { VariantSpec } from "./types";

const clampVisit = (n: number) => {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return Math.max(0, Math.min(180, v));
};

export const SIMPLE_ROUND_VARIANTS: Record<string, VariantSpec> = {
  count_up: {
    id: "count_up",
    title: "COUNT-UP",
    tickerSrc: tickerCountUp,
    infoTitle: "Règles COUNT-UP",
    infoText: "Additionne tes points sur X rounds. Score final le plus haut gagne. Si un objectif est défini, le premier à l'atteindre gagne.",
    playersOptions: [2, 3, 4],
    roundsOptions: [5, 8, 10, 12, 15],
    objectiveOptions: [0, 100, 170, 300, 500, 1000],
    defaults: { players: 2, botsEnabled: false, botLevel: "normal", rounds: 10, objective: 0 },
    applyVisit: ({ visit, currentScore, objective }) => {
      const v = clampVisit(visit);
      const next = currentScore + v;
      if (objective > 0 && next >= objective) return { delta: v, forceWin: true };
      return { delta: v };
    },
    computeWinnerOnEnd: (scores) => {
      let best = -Infinity;
      let idx = 0;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > best) {
          best = scores[i];
          idx = i;
        }
      }
      return idx;
    },
  },

  super_bull: {
    id: "super_bull",
    title: "SUPER BULL",
    tickerSrc: tickerSuperBull,
    infoTitle: "Règles SUPER BULL",
    infoText: "Additionne tes points sur X rounds. Variante orientée gros scores. Si un objectif est défini, le premier à l'atteindre gagne.",
    playersOptions: [2, 3, 4],
    roundsOptions: [5, 8, 10, 12, 15],
    objectiveOptions: [0, 100, 170, 200, 300, 500, 1000],
    defaults: { players: 2, botsEnabled: false, botLevel: "normal", rounds: 10, objective: 200 },
    applyVisit: ({ visit, currentScore, objective }) => {
      const v = clampVisit(visit);
      const next = currentScore + v;
      if (objective > 0 && next >= objective) return { delta: v, forceWin: true };
      return { delta: v };
    },
    computeWinnerOnEnd: (scores) => {
      let best = -Infinity;
      let idx = 0;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > best) {
          best = scores[i];
          idx = i;
        }
      }
      return idx;
    },
  },

  happy_mille: {
    id: "happy_mille",
    title: "HAPPY MILLE",
    tickerSrc: tickerHappyMille,
    infoTitle: "Règles HAPPY MILLE",
    infoText: "Additionne tes points. Objectif par défaut: 1000. Si l'objectif est activé, le premier à l'atteindre gagne ; sinon meilleur score après X rounds.",
    playersOptions: [2, 3, 4],
    roundsOptions: [5, 8, 10, 12, 15],
    objectiveOptions: [0, 300, 500, 700, 1000, 1200],
    defaults: { players: 2, botsEnabled: false, botLevel: "normal", rounds: 10, objective: 1000 },
    applyVisit: ({ visit, currentScore, objective }) => {
      const v = clampVisit(visit);
      const next = currentScore + v;
      if (objective > 0 && next >= objective) return { delta: v, forceWin: true };
      return { delta: v };
    },
    computeWinnerOnEnd: (scores) => {
      let best = -Infinity;
      let idx = 0;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > best) {
          best = scores[i];
          idx = i;
        }
      }
      return idx;
    },
  },

  enculette: {
    id: "enculette",
    title: "ENCULETTE / VACHE",
    tickerSrc: tickerEnculette,
    infoTitle: "Règles ENCULETTE / VACHE",
    infoText: "Additionne tes points. Pénalité: si une volée = 0, -50 points. Si un objectif est défini, le premier à l'atteindre gagne ; sinon meilleur score après X rounds.",
    playersOptions: [2, 3, 4],
    roundsOptions: [5, 8, 10, 12, 15],
    objectiveOptions: [0, 100, 200, 300, 500, 1000],
    defaults: { players: 2, botsEnabled: false, botLevel: "normal", rounds: 10, objective: 0 },
    applyVisit: ({ visit, currentScore, objective }) => {
      const v = clampVisit(visit);
      const penalty = v === 0 ? -50 : 0;
      const delta = v + penalty;
      const next = currentScore + delta;
      if (objective > 0 && next >= objective) return { delta, forceWin: true };
      return { delta };
    },
    computeWinnerOnEnd: (scores) => {
      let best = -Infinity;
      let idx = 0;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > best) {
          best = scores[i];
          idx = i;
        }
      }
      return idx;
    },
  },

  game_170: {
    id: "game_170",
    title: "170",
    tickerSrc: ticker170,
    infoTitle: "Règles 170",
    infoText: "Objectif fixe: 170. 1 point si la volée est EXACTEMENT 170. Le gagnant est celui qui a le plus de réussites après X rounds.",
    playersOptions: [2, 3, 4],
    roundsOptions: [5, 8, 10, 12, 15],
    objectiveOptions: [170],
    defaults: { players: 2, botsEnabled: false, botLevel: "normal", rounds: 10, objective: 170 },
    applyVisit: ({ visit, objective }) => {
      const v = clampVisit(visit);
      const ok = v === objective;
      return { delta: ok ? 1 : 0 };
    },
    computeWinnerOnEnd: (scores) => {
      let best = -Infinity;
      let idx = 0;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > best) {
          best = scores[i];
          idx = i;
        }
      }
      return idx;
    },
  },
};
