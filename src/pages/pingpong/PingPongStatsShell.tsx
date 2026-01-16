// =============================================================
// src/pages/pingpong/PingPongStatsShell.tsx
// Stats Ping-Pong (LOCAL ONLY)
// - Shell simple: accès historique
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
};

export default function PingPongStatsShell({ go }: Props) {
  const { theme } = useTheme();

  return (
    <div style={wrap(theme)}>
      <div style={title}>STATS — PING-PONG</div>

      <div style={grid}>
        <button style={card(theme)} onClick={() => go("pingpong_stats_history")}>
          <div style={cardTitle}>Historique</div>
          <div style={cardSub}>Tous les matchs (local)</div>
        </button>

        <button style={card(theme)} onClick={() => go("home")}>
          <div style={cardTitle}>Retour</div>
          <div style={cardSub}>Accueil ping-pong</div>
        </button>
      </div>
    </div>
  );
}

function isDark(theme: any) {
  return theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
}

function wrap(theme: any): React.CSSProperties {
  return {
    minHeight: "100vh",
    padding: 14,
    color: theme?.colors?.text ?? "#fff",
    background: isDark(theme)
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
  };
}

const title: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 0.7, marginBottom: 12 };

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
  gap: 12,
};

function card(theme: any): React.CSSProperties {
  return {
    textAlign: "left",
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    cursor: "pointer",
  };
}

const cardTitle: React.CSSProperties = { fontWeight: 950, letterSpacing: 0.4, fontSize: 16 };
const cardSub: React.CSSProperties = { marginTop: 6, opacity: 0.8, fontWeight: 800, fontSize: 12, lineHeight: 1.35 };
