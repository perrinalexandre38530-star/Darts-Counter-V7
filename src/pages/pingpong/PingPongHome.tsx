// =============================================================
// src/pages/pingpong/PingPongHome.tsx
// HOME Ping-Pong (LOCAL ONLY)
// - Clone de l'esprit Pétanque/Baby-Foot: accès rapide + état de match
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { loadPingPongState } from "../../lib/pingpongStore";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
};

export default function PingPongHome({ go }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadPingPongState());

  React.useEffect(() => {
    const t = setInterval(() => setSt(loadPingPongState()), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={wrap(theme)}>
      <div style={card(theme)}>
        <div style={h1}>PING-PONG</div>
        <div style={sub}>Partie en cours</div>

        <div style={scoreLine}>
          <span style={chip(theme)}>{st.sideA}</span>
          <span style={score}>{st.setsA}</span>
          <span style={sep}>—</span>
          <span style={score}>{st.setsB}</span>
          <span style={chip(theme)}>{st.sideB}</span>
        </div>

        <div style={mini(theme)}>
          Set {st.setIndex} · Points : {st.pointsA}–{st.pointsB} · {st.setsToWin} sets gagnants · {st.pointsPerSet} pts
          {st.winByTwo ? " (écart 2)" : ""}
        </div>

        {st.finished && st.winner && (
          <div style={win(theme)}>Victoire : {st.winner === "A" ? st.sideA : st.sideB}</div>
        )}

        <div style={row}>
          <button style={primary(theme)} onClick={() => go("pingpong_play")}>Continuer</button>
          <button style={ghost(theme)} onClick={() => go("pingpong_config")}>Nouvelle partie</button>
        </div>
      </div>

      <div style={card(theme)}>
        <div style={sub}>Accès rapide</div>
        <div style={row}>
          <button style={ghost(theme)} onClick={() => go("pingpong_config")}>Configurer</button>
          <button style={ghost(theme)} onClick={() => go("pingpong_play")}>Jouer</button>
          <button style={ghost(theme)} onClick={() => go("stats")}>Stats</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- styles ----------------

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
    display: "flex",
    flexDirection: "column",
    gap: 12,
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
    gap: 10,
  };
}

const h1: React.CSSProperties = { fontWeight: 1000 as any, fontSize: 18, letterSpacing: 1 };
const sub: React.CSSProperties = { fontWeight: 900, opacity: 0.85 };

const row: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const scoreLine: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "10px 0",
};
const score: React.CSSProperties = { fontWeight: 1000 as any, fontSize: 28, letterSpacing: 1 };
const sep: React.CSSProperties = { opacity: 0.5, fontWeight: 900 };

function chip(theme: any): React.CSSProperties {
  return {
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    fontWeight: 900,
    opacity: 0.95,
  };
}

function mini(theme: any): React.CSSProperties {
  return {
    textAlign: "center",
    fontWeight: 850,
    opacity: 0.8,
    fontSize: 12,
    lineHeight: 1.35,
    padding: "8px 10px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.10)",
  };
}

function primary(theme: any): React.CSSProperties {
  return {
    flex: 1,
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 800,
    cursor: "pointer",
    opacity: 0.92,
  };
}

function win(theme: any): React.CSSProperties {
  return {
    textAlign: "center",
    fontWeight: 900,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,255,180,0.10)",
  };
}
