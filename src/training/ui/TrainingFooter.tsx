// ============================================
// TRAINING — Footer commun (stats rapides)
// ============================================

import React from "react";
import type { TrainingStats } from "../engine/trainingTypes";

type Props = {
  stats: TrainingStats;
};

export default function TrainingFooter({ stats }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.35)",
        marginTop: 10,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.85 }}>
        Darts: <b>{stats.dartsThrown}</b>
      </div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>
        Hits: <b>{stats.hits}</b>
      </div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>
        Précision: <b>{(stats.accuracy * 100).toFixed(1)}%</b>
      </div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>
        Score: <b>{stats.score}</b>
      </div>
    </div>
  );
}
