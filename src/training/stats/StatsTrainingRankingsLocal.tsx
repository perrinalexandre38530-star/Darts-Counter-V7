import React from "react";
import { getRankingByMode } from "../../training/stats/trainingStatsHub";

export default function StatsTrainingRankingsLocal({ modeId }: { modeId: string }) {
  const ranking = getRankingByMode(modeId);
  return (
    <div>
      <h3>Classement — {modeId}</h3>
      <ol>
        {ranking.map(r => (
          <li key={r.id}>{r.id} — {r.score}</li>
        ))}
      </ol>
    </div>
  );
}
