// ============================================
// src/hooks/useScramEngine.ts
// Hook minimal pour piloter ScramEngine (state stack + undo)
// ============================================

import * as React from "react";
import type { Player } from "../lib/types-game";
import { uiThrowToGameDarts } from "../lib/types-game";
import { ScramEngine, type ScramState } from "../lib/gameEngines/scramEngine";

export type UseScramEngineRules = {
  objective: number;
  maxRounds?: number; // 0 = illimité
  useBull?: boolean;
  marksToClose?: 1 | 2 | 3;
};

export function useScramEngine(players: Player[], rules: UseScramEngineRules) {
  const init = React.useMemo(() => {
    return ScramEngine.initGame(players, {
      mode: "scram",
      objective: rules.objective,
      maxRounds: rules.maxRounds ?? 0,
      useBull: rules.useBull ?? true,
      marksToClose: rules.marksToClose ?? 3,
    } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.map((p) => p.id).join("|"), rules.objective, rules.maxRounds, rules.useBull, rules.marksToClose]);

  const [stack, setStack] = React.useState<ScramState[]>([init]);

  const state = stack[stack.length - 1];

  const play = React.useCallback((uiThrow: any) => {
    setStack((prev) => {
      const cur = prev[prev.length - 1];
      const darts = uiThrowToGameDarts(uiThrow as any);
      const next = ScramEngine.playTurn(cur, darts);
      return [...prev, next];
    });
  }, []);

  const undo = React.useCallback(() => {
    setStack((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)));
  }, []);

  const reset = React.useCallback(() => {
    setStack([init]);
  }, [init]);

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
