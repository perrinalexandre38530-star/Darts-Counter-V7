import * as React from "react";
import type { Player } from "../lib/types-game";
import { uiThrowToGameDarts } from "../lib/types-game";
import {
  BaseballEngine,
  type BaseballRules,
  type BaseballState,
  type BaseballTeamConfig,
} from "../lib/gameEngines/baseballEngine";

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
    bullTargetMode: rules.bullTargetMode,
    dbullRuns: rules.dbullRuns,
    participantMode: rules.participantMode,
  }), [rules.innings, rules.extraInnings, rules.maxExtraInnings, rules.seventhInningRule, rules.bullTargetMode, rules.dbullRuns, rules.participantMode]);

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
      const next = BaseballEngine.playTurn(current, uiThrowToGameDarts(uiThrow as any));
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

