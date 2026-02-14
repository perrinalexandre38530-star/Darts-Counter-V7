import React from "react";
import { useBatardEngine } from "../../hooks/useBatardEngine";
import { BatardConfig } from "../../lib/batard/batardTypes";

interface Props {
  players: string[];
  config: BatardConfig;
}

export default function BatardPlay({
  players,
  config
}: Props) {
  const {
    states,
    currentPlayerIndex,
    currentRound,
    throwVisit,
    isFinished
  } = useBatardEngine(players, config);

  if (isFinished()) {
    return <div>🏁 GAME OVER</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>🎯 BATARD</h2>

      <h3>
        Player: {states[currentPlayerIndex].id}
      </h3>

      <div>
        Round: {currentRound?.label}
      </div>

      <button
        onClick={() =>
          throwVisit([
            { value: 20, multiplier: 1 },
            { value: 20, multiplier: 1 },
            { value: 20, multiplier: 1 }
          ])
        }
      >
        Simulate 60
      </button>

      <ul>
        {states.map((p) => (
          <li key={p.id}>
            {p.id} — Score: {p.score}
          </li>
        ))}
      </ul>
    </div>
  );
}
