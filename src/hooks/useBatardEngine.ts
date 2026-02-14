// @ts-nocheck
// =============================================================
// src/hooks/useBatardEngine.ts
// BATARD — engine (visites 3 flèches + validation configurable)
// =============================================================
import * as React from "react";
import type { Dart } from "../lib/types";
import type { BatardConfig, BatardRound } from "../lib/batard/batardTypes";

function isBull(v: number, mult: 1 | 2 | 3) {
  // Convention projet: bull button ajoute v=25, mult=2 => 50
  const score = v * mult;
  return score === 25 || score === 50;
}

function isDartValid(d: Dart, round: BatardRound): boolean {
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

export function useBatardEngine(players: string[], config: BatardConfig) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = React.useState(0);

  const [states, setStates] = React.useState(() =>
    players.map((id) => ({
      id,
      score: 0,
      roundIndex: 0,
      finished: false,
    }))
  );

  const currentRound = config.rounds[states[currentPlayerIndex]?.roundIndex] || null;

  const applyFail = (player: any) => {
    switch (config.failPolicy) {
      case "MINUS_POINTS":
        player.score -= Math.max(0, Number(config.failValue || 0));
        break;
      case "BACK_ROUND":
        player.roundIndex = Math.max(0, player.roundIndex - Math.max(0, Number(config.failValue || 0)));
        break;
      case "FREEZE":
      case "NONE":
      default:
        break;
    }
  };

  const applyAdvance = (player: any) => {
    player.roundIndex += 1;
    if (player.roundIndex >= config.rounds.length) {
      player.finished = true;
    }
  };

  const submitVisit = (visit: Dart[]) => {
    if (!currentRound) return;

    setStates((prev) => {
      const updated = [...prev];
      const p = { ...updated[currentPlayerIndex] };

      // compute scoring
      let validHits = 0;
      let visitScore = 0;

      for (const d of visit) {
        const ok = isDartValid(d, currentRound);
        if (ok) validHits += 1;
        if (config.scoreOnlyValid) {
          if (ok) visitScore += d.v * d.mult;
        } else {
          visitScore += d.v * d.mult;
        }
      }

      const advance = validHits >= Math.max(1, Number(config.minValidHitsToAdvance || 1));

      if (advance) {
        p.score += visitScore;
        applyAdvance(p);
      } else {
        // même si fail, on peut scorer si scoreOnlyValid=false (mode hybride),
        // mais la progression dépend des hits valides.
        if (!config.scoreOnlyValid) p.score += visitScore;
        applyFail(p);
      }

      updated[currentPlayerIndex] = p;
      return updated;
    });

    setCurrentPlayerIndex((i) => (i + 1) % players.length);
  };

  const finished = React.useMemo(() => {
    if (config.winMode === "RACE_TO_FINISH") {
      return states.some((p: any) => p.finished);
    }
    return states.every((p: any) => p.finished);
  }, [states, config.winMode]);

  const winnerId = React.useMemo(() => {
    if (!finished) return null;
    // si race: le premier finished gagne. sinon score max.
    if (config.winMode === "RACE_TO_FINISH") {
      const first = states.find((p: any) => p.finished);
      return first?.id || null;
    }
    const best = [...states].sort((a: any, b: any) => (b.score || 0) - (a.score || 0))[0];
    return best?.id || null;
  }, [states, finished, config.winMode]);

  return {
    states,
    currentPlayerIndex,
    currentRound,
    submitVisit,
    finished,
    winnerId,
  };
}
