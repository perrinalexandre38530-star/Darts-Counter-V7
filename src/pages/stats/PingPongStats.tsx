// ============================================
// src/pages/stats/PingPongStats.tsx
// StatHub — Ping-Pong
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { loadPingPongHistory } from "../../lib/pingpongHistory";

export default function PingPongStats() {
  const { theme } = useTheme();
  const history = loadPingPongHistory();

  const matches = history.filter(h => h.mode !== "training");
  const wins = matches.filter(h => h.winnerId).length;

  return (
    <div style={{ padding: 16, color: theme.text }}>
      <h2 style={{ marginBottom: 12 }}>PING-PONG</h2>

      <div style={{ display: "grid", gap: 10 }}>
        <div>Matchs joués : <b>{matches.length}</b></div>
        <div>Victoires enregistrées : <b>{wins}</b></div>
        <div>Sessions training : <b>{history.filter(h => h.mode === "training").length}</b></div>
      </div>
    </div>
  );
}
