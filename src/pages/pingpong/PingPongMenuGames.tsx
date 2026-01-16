// =============================================================
// src/pages/pingpong/PingPongMenuGames.tsx
// Ping-Pong — Menu "Games" (LOCAL ONLY)
// - Aligné sur l'esprit des menus Fléchettes/Pétanque/Baby-Foot
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

type Props = { go: (t: any, p?: any) => void };

export default function PingPongMenuGames({ go }: Props) {
  const { theme } = useTheme();

  return (
    <div style={wrap(theme)}>
      <div style={title(theme)}>PING-PONG</div>

      <div style={grid}>
        <button style={card(theme)} onClick={() => go("pingpong_config")}>
          <div style={cardTitle(theme)}>Jouer</div>
          <div style={cardSub(theme)}>Configurer une partie (sets, points, joueurs)</div>
        </button>

        <button style={card(theme)} onClick={() => go("stats")}>
          <div style={cardTitle(theme)}>Stats</div>
          <div style={cardSub(theme)}>Historique et résultats</div>
        </button>

        <button style={card(theme)} onClick={() => go("tournaments")}>
          <div style={cardTitle(theme)}>Tournois</div>
          <div style={cardSub(theme)}>Local (si activé dans l'app)</div>
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

function title(theme: any): React.CSSProperties {
  return { fontWeight: 1000 as any, fontSize: 18, letterSpacing: 1, marginBottom: 12 };
}

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

function cardTitle(theme: any): React.CSSProperties {
  return { fontWeight: 950, letterSpacing: 0.4, fontSize: 16 };
}

function cardSub(theme: any): React.CSSProperties {
  return { marginTop: 6, opacity: 0.8, fontWeight: 800, fontSize: 12, lineHeight: 1.35 };
}
