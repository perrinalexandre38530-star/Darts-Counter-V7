import { useState } from "react";
import {
  BatardConfig,
  BatardPlayerState,
  BatardRound
} from "../lib/batard/batardTypes";

export function useBatardEngine(
  players: string[],
  config: BatardConfig
) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  const [states, setStates] = useState<BatardPlayerState[]>(
    players.map((id) => ({
      id,
      score: 0,
      roundIndex: 0
    }))
  );

  const currentRound: BatardRound =
    config.rounds[states[currentPlayerIndex].roundIndex];

  const validate = (
    value: number,
    multiplier: number
  ): boolean => {
    if (!currentRound) return false;

    if (currentRound.bullOnly) {
      return value === 25 || value === 50;
    }

    if (currentRound.target && value !== currentRound.target) {
      return false;
    }

    switch (currentRound.multiplierRule) {
      case "SINGLE":
        return multiplier === 1;
      case "DOUBLE":
        return multiplier === 2;
      case "TRIPLE":
        return multiplier === 3;
      default:
        return true;
    }
  };

  const throwVisit = (darts: { value: number; multiplier: number }[]) => {
    setStates((prev) => {
      const updated = [...prev];
      const player = { ...updated[currentPlayerIndex] };

      let validHit = false;
      let visitScore = 0;

      darts.forEach((d) => {
        if (validate(d.value, d.multiplier)) {
          validHit = true;
          visitScore += d.value * d.multiplier;
        }
      });

      if (validHit) {
        player.score += visitScore;
        player.roundIndex++;
      } else {
        if (config.failPolicy === "MINUS_POINTS") {
          player.score -= config.failValue;
        }

        if (config.failPolicy === "BACK_ROUND") {
          player.roundIndex = Math.max(
            0,
            player.roundIndex - config.failValue
          );
        }
      }

      updated[currentPlayerIndex] = player;
      return updated;
    });

    setCurrentPlayerIndex((p) => (p + 1) % players.length);
  };

  const isFinished = () => {
    if (config.winMode === "RACE_TO_FINISH") {
      return states.some(
        (p) => p.roundIndex >= config.rounds.length
      );
    }
    return states.every(
      (p) => p.roundIndex >= config.rounds.length
    );
  };

  return {
    states,
    currentPlayerIndex,
    currentRound,
    throwVisit,
    isFinished
  };
}
