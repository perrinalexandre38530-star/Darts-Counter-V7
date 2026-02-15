// @ts-nocheck
// =============================================================
// src/hooks/useBatardEngine.ts
// BATARD — engine V1 (visites 3 flèches + validation configurable)
// + Stats match/joueur basées UNIQUEMENT sur BatardConfig
// =============================================================
import * as React from "react";
import type { Dart } from "../lib/types";
import type { BatardConfig, BatardRound } from "../lib/batard/batardTypes";

export type BatardPlayerStats = {
  turns: number;
  dartsThrown: number;

  validDarts: number;     // nb de flèches valides (respect round)
  validHits: number;      // alias (ici identique à validDarts)
  pointsAdded: number;    // points réellement ajoutés au score (donc dépend scoreOnlyValid)
  fails: number;
  advances: number;

  maxRoundReached: number;   // index max atteint (0-based)
  finishedAtTurn: number | null;
};

export type BatardPlayerState = {
  id: string;
  score: number;
  roundIndex: number;
  finished: boolean;
  stats: BatardPlayerStats;

  // UI helpers (dernier tour)
  lastVisit?: Dart[];
  lastVisitScore?: number;
  lastValidHits?: number;
  lastAdvanced?: boolean;
  lastFailed?: boolean;
};

function isBull(v: number, mult: 1 | 2 | 3) {
  // Convention projet: bull button ajoute v=25 ; DBull = 25x2 = 50
  const score = v * mult;
  return score === 25 || score === 50;
}

export function isDartValid(d: Dart, round: BatardRound): boolean {
  const v = d.v;
  const mult = d.mult;

  if (round.type === "TARGET_BULL") {
    return isBull(v, mult as any);
  }

  if (round.type === "TARGET_NUMBER") {
    if (round.target != null && v !== round.target) return false;
  }

  // ANY_SCORE: pas de cible numéro (mais peut imposer mult)
  const rule = round.multiplierRule || "ANY";
  if (rule === "SINGLE") return mult === 1;
  if (rule === "DOUBLE") return mult === 2;
  if (rule === "TRIPLE") return mult === 3;
  return true;
}

function clampInt(n: any, def = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return def;
  return Math.trunc(x);
}

export function useBatardEngine(players: string[], config: BatardConfig) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = React.useState(0);
  const [turnCounter, setTurnCounter] = React.useState(0);

  const [states, setStates] = React.useState<BatardPlayerState[]>(() =>
    players.map((id) => ({
      id,
      score: 0,
      roundIndex: 0,
      finished: false,
      stats: {
        turns: 0,
        dartsThrown: 0,
        validDarts: 0,
        validHits: 0,
        pointsAdded: 0,
        fails: 0,
        advances: 0,
        maxRoundReached: 0,
        finishedAtTurn: null,
      },
    }))
  );

  const currentRound =
    config.rounds[states[currentPlayerIndex]?.roundIndex] || null;

  const minHits = Math.max(1, clampInt(config.minValidHitsToAdvance, 1));
  const failValue = Math.max(0, clampInt(config.failValue, 0));

  const applyFail = (player: BatardPlayerState) => {
    switch (config.failPolicy) {
      case "MINUS_POINTS":
        player.score -= failValue;
        break;
      case "BACK_ROUND":
        player.roundIndex = Math.max(0, player.roundIndex - failValue);
        break;
      case "FREEZE":
      case "NONE":
      default:
        break;
    }
  };

  const applyAdvance = (player: BatardPlayerState) => {
    player.roundIndex += 1;
    player.stats.advances += 1;
    player.stats.maxRoundReached = Math.max(player.stats.maxRoundReached, player.roundIndex);
    if (player.roundIndex >= config.rounds.length) {
      player.finished = true;
      if (player.stats.finishedAtTurn == null) player.stats.finishedAtTurn = turnCounter + 1;
    }
  };

  const submitVisit = (visit: Dart[]) => {
    if (!currentRound) return;

    setStates((prev) => {
      const updated = [...prev];
      const p = { ...updated[currentPlayerIndex] };

      // recomposer stats immutables
      const stats = { ...p.stats };

      // compute scoring
      let validHits = 0;
      let visitScore = 0;
      let visitScoreAll = 0;

      for (const d of visit) {
        const ok = isDartValid(d, currentRound);
        if (ok) validHits += 1;

        const pts = (d.v || 0) * (d.mult || 1);
        visitScoreAll += pts;

        if (config.scoreOnlyValid) {
          if (ok) visitScore += pts;
        } else {
          visitScore += pts;
        }
      }

      const advanced = validHits >= minHits;

      // stats de base
      stats.turns += 1;
      stats.dartsThrown += visit.length;
      stats.validDarts += validHits;
      stats.validHits += validHits;

      if (advanced) {
        p.score += visitScore;
        stats.pointsAdded += visitScore;
        applyAdvance(p);
      } else {
        // même si fail, on peut scorer si scoreOnlyValid=false
        if (!config.scoreOnlyValid) {
          p.score += visitScore;
          stats.pointsAdded += visitScore;
        }
        stats.fails += 1;
        applyFail(p);
      }

      p.stats = stats;

      // UI helpers (dernier tour)
      p.lastVisit = visit;
      p.lastVisitScore = config.scoreOnlyValid ? visitScore : visitScoreAll;
      p.lastValidHits = validHits;
      p.lastAdvanced = advanced;
      p.lastFailed = !advanced;

      updated[currentPlayerIndex] = p;
      return updated;
    });

    setTurnCounter((c) => c + 1);
    setCurrentPlayerIndex((i) => (i + 1) % players.length);
  };

  const finished = React.useMemo(() => {
    if (config.winMode === "RACE_TO_FINISH") {
      return states.some((p) => p.finished);
    }
    return states.every((p) => p.finished);
  }, [states, config.winMode]);

  const winnerId = React.useMemo(() => {
    if (!finished) return null;

    if (config.winMode === "RACE_TO_FINISH") {
      // premier qui a finishedAtTurn le plus petit
      const fin = states
        .filter((p) => p.finished && p.stats.finishedAtTurn != null)
        .slice()
        .sort((a, b) => (a.stats.finishedAtTurn! - b.stats.finishedAtTurn!))[0];
      return fin?.id || null;
    }

    // SCORE_MAX : tout le monde fini => meilleur score
    const best = [...states].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    return best?.id || null;
  }, [states, finished, config.winMode]);

  const ranking = React.useMemo(() => {
    const list = [...states];
    if (config.winMode === "RACE_TO_FINISH") {
      // finished d’abord (plus tôt), puis score
      return list.sort((a, b) => {
        const af = a.stats.finishedAtTurn ?? 999999;
        const bf = b.stats.finishedAtTurn ?? 999999;
        if (af !== bf) return af - bf;
        return (b.score || 0) - (a.score || 0);
      });
    }
    return list.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [states, config.winMode]);

  return {
    states,
    ranking,
    currentPlayerIndex,
    currentRound,
    submitVisit,
    finished,
    winnerId,
    turnCounter,
  };
}
