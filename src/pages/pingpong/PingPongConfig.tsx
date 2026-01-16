// =============================================================
// src/pages/pingpong/PingPongConfig.tsx
// Config Ping-Pong (LOCAL ONLY)
// - Minimal v1: noms joueurs/équipes + sets gagnants + points par set
// - Démarre une nouvelle partie en réinitialisant le state local
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { loadPingPongState, resetPingPong, setConfig } from "../../lib/pingpongStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store: any;
};

export default function PingPongConfig({ go }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadPingPongState());

  const [sideA, setSideA] = React.useState(st.sideA);
  const [sideB, setSideB] = React.useState(st.sideB);
  const [pointsPerSet, setPointsPerSet] = React.useState(String(st.pointsPerSet || 11));
  const [setsToWin, setSetsToWin] = React.useState(String(st.setsToWin || 3));
  const [winByTwo, setWinByTwo] = React.useState(st.winByTwo !== false);

  const onStart = () => {
    const base = resetPingPong(st);
    const next = setConfig(base, sideA, sideB, Number(pointsPerSet) || 11, Number(setsToWin) || 3, winByTwo);
    setSt(next);
    go("pingpong_play", { matchId: next.matchId });
  };

  return (
    <div style={wrap(theme)}>
      <div style={head}>
        <button style={back(theme)} onClick={() => go("games")}>
          ← Retour
        </button>
        <div style={title}>CONFIG — PING-PONG</div>
      </div>

      <div style={card(theme)}>
        <div style={label}>Joueur / Équipe A</div>
        <input value={sideA} onChange={(e) => setSideA(e.target.value)} style={input(theme)} />

        <div style={{ height: 10 }} />

        <div style={label}>Joueur / Équipe B</div>
        <input value={sideB} onChange={(e) => setSideB(e.target.value)} style={input(theme)} />

        <div style={{ height: 10 }} />

        <div style={label}>Points par set</div>
        <input value={pointsPerSet} onChange={(e) => setPointsPerSet(e.target.value)} style={input(theme)} inputMode="numeric" />

        <div style={{ height: 10 }} />

        <div style={label}>Sets gagnants</div>
        <input value={setsToWin} onChange={(e) => setSetsToWin(e.target.value)} style={input(theme)} inputMode="numeric" />

        <div style={{ height: 10 }} />

        <label style={checkRow}>
          <input type="checkbox" checked={winByTwo} onChange={(e) => setWinByTwo(e.target.checked)} />
          <span style={{ fontWeight: 900, opacity: 0.9 }}>Écart de 2 (règle standard)</span>
        </label>

        <div style={{ height: 14 }} />

        <button style={primary(theme)} onClick={onStart}>
          Lancer la partie
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

const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 };
const title: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 0.7 };
const checkRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };

function back(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function card(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
  };
}

const label: React.CSSProperties = { fontWeight: 900, opacity: 0.9, marginBottom: 6 };

function input(theme: any): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: theme?.colors?.text ?? "#fff",
    outline: "none",
    fontWeight: 800,
  };
}

function primary(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 950,
    cursor: "pointer",
  };
}
