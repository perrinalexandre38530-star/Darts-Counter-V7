import * as React from "react";
import type { GameDart, Player } from "../lib/types-game";
import {
  BaseballEngine,
  type BaseballRules,
  type BaseballState,
  type BaseballTeamConfig,
} from "../lib/gameEngines/baseballEngine";

function baseballUiThrowToGameDarts(uiThrow: any[]): GameDart[] {
  return (uiThrow || []).slice(0, 3).map((dart: any): GameDart => {
    const value = Number(dart?.v || 0);
    const mult = Number(dart?.mult || 1);
    if (value <= 0) return { bed: "MISS" };
    // Le Keypad représente BULL/DBULL avec v=25 + mult=1/2.
    if (value === 25 || value === 50) return { bed: mult === 2 || value === 50 ? "IB" : "OB" };
    const number = Math.max(1, Math.min(20, Math.floor(value)));
    return { bed: mult === 3 ? "T" : mult === 2 ? "D" : "S", number };
  });
}

export function useBaseballEngine(
  players: Player[],
  rules: Partial<BaseballRules>,
  teams: BaseballTeamConfig[] = []
) {
  const playerKey = (players || []).map((player: any) => String(player?.id || "")).join("|");
  const teamKey = (teams || []).map((team) => `${team.id}:${team.playerIds.join(",")}`).join("|");
  const safePlayers = React.useMemo(
    () => (players || []).filter((player: any) => player && String(player.id || "").trim()),
    [playerKey]
  );
  const stableRules = React.useMemo<Partial<BaseballRules>>(() => ({
    mode: "baseball",
    innings: rules.innings,
    extraInnings: rules.extraInnings,
    maxExtraInnings: rules.maxExtraInnings,
    seventhInningRule: rules.seventhInningRule,
    gameVariant: rules.gameVariant,
    bullTargetMode: rules.bullTargetMode,
    bullBonusPoints: rules.bullBonusPoints,
    missEndsTurn: rules.missEndsTurn,
    participantMode: rules.participantMode,
  }), [
    rules.innings,
    rules.extraInnings,
    rules.maxExtraInnings,
    rules.seventhInningRule,
    rules.gameVariant,
    rules.bullTargetMode,
    rules.bullBonusPoints,
    rules.missEndsTurn,
    rules.participantMode,
  ]);

  const initial = React.useMemo(
    () => BaseballEngine.initGame(safePlayers, stableRules, teams),
    [playerKey, teamKey, stableRules]
  );
  const [stack, setStack] = React.useState<BaseballState[]>([initial]);

  React.useEffect(() => setStack([initial]), [initial]);

  const state = stack[stack.length - 1];
  const play = React.useCallback((uiThrow: any[]) => {
    setStack((previous) => {
      const current = previous[previous.length - 1];
      if (!current || current.finished) return previous;
      const next = BaseballEngine.playTurn(current, baseballUiThrowToGameDarts(uiThrow));
      return next === current ? previous : [...previous, next];
    });
  }, []);
  const undo = React.useCallback(() => {
    setStack((previous) => previous.length > 1 ? previous.slice(0, -1) : previous);
  }, []);
  const reset = React.useCallback(() => {
    setStack([BaseballEngine.initGame(safePlayers, stableRules, teams)]);
  }, [safePlayers, stableRules, teams]);

  return {
    state,
    play,
    undo,
    reset,
    canUndo: stack.length > 1,
    isFinished: BaseballEngine.isGameOver(state),
  };
}
