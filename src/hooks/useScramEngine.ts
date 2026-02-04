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
  const safePlayers = React.useMemo(() => {
    const clean = (players ?? []).filter((p: any) => p && typeof p.id === 'string' && p.id.length > 0);
    if (clean.length >= 2) return clean;
    return [
      { id: 'p1', name: clean[0]?.name ?? 'Joueur 1' },
      { id: 'p2', name: 'Joueur 2' },
    ] as Player[];
  }, [Array.isArray(players) ? players.map((p:any)=>p?.id).join('|') : '']);

  const init = React.useMemo(() => {
    return ScramEngine.initGame(safePlayers, {
      mode: "scram",
      objective: rules.objective,
      maxRounds: rules.maxRounds ?? 0,
      useBull: rules.useBull ?? true,
      marksToClose: rules.marksToClose ?? 3,
    } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePlayers.map((p) => p.id).join("|"), rules.objective, rules.maxRounds, rules.useBull, rules.marksToClose]);

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
