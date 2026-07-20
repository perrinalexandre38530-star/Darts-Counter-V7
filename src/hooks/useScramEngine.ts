// ============================================
// src/hooks/useScramEngine.ts
// State stack + undo pour le moteur SCRAM
// ============================================

import * as React from "react";
import type { Player } from "../lib/types-game";
import { uiThrowToGameDarts } from "../lib/types-game";
import {
  ScramEngine,
  type ScramRules,
  type ScramState,
  type ScramTeam,
} from "../lib/gameEngines/scramEngine";

export type UseScramEngineRules = {
  maxRoundsPerPhase?: number;
  useBull?: boolean;
  firstStopper?: ScramTeam;
};

function normalizePlayers(players: Player[]): Player[] {
  const clean = (players || []).filter((p: any) => p && String(p.id || "").trim());
  if (clean.length >= 2) return clean;
  return [
    { id: "p1", name: clean[0]?.name || "Joueur 1" },
    { id: "p2", name: "Joueur 2" },
  ];
}

export function useScramEngine(players: Player[], rules: UseScramEngineRules) {
  const playerKey = (players || []).map((p: any) => String(p?.id || "")).join("|");
  const safePlayers = React.useMemo(() => normalizePlayers(players), [playerKey]);

  const engineRules = React.useMemo<Partial<ScramRules>>(() => ({
      mode: "scram",
      useBull: rules.useBull !== false,
      marksToClose: 3,
      maxRoundsPerPhase: rules.maxRoundsPerPhase || 0,
      firstStopper: rules.firstStopper === "B" ? "B" : "A",
  }), [rules.maxRoundsPerPhase, rules.useBull, rules.firstStopper]);

  const init = React.useMemo(
    () => ScramEngine.initGame(safePlayers, engineRules),
    [playerKey, engineRules]
  );

  const [stack, setStack] = React.useState<ScramState[]>([init]);

  React.useEffect(() => {
    setStack([init]);
  }, [init]);

  const state = stack[stack.length - 1];

  const play = React.useCallback((uiThrow: any) => {
    setStack((previous) => {
      const current = previous[previous.length - 1];
      if (!current || current.finished) return previous;
      const next = ScramEngine.playTurn(current, uiThrowToGameDarts(uiThrow as any));
      return next === current ? previous : [...previous, next];
    });
  }, []);

  const undo = React.useCallback(() => {
    setStack((previous) => (previous.length <= 1 ? previous : previous.slice(0, -1)));
  }, []);

  const reset = React.useCallback(
    () => setStack([ScramEngine.initGame(safePlayers, engineRules)]),
    [safePlayers, engineRules]
  );

  return {
    state,
    play,
    undo,
    reset,
    canUndo: stack.length > 1,
    isFinished: ScramEngine.isGameOver(state),
    winner: ScramEngine.getWinner(state),
  };
}
