// =============================================================
// src/pages/babyfoot/BabyFootConfig.tsx
// Config Baby-Foot (LOCAL ONLY)
// - Minimal v1: noms équipes + score cible
// - Démarre une nouvelle partie en réinitialisant le state local
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { loadBabyFootState, resetBabyFoot, setTeams } from "../../lib/babyfootStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store: any;
};

export default function BabyFootConfig({ go }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadBabyFootState());

  const [teamA, setTeamA] = React.useState(st.teamA);
  const [teamB, setTeamB] = React.useState(st.teamB);
  const [target, setTarget] = React.useState(String(st.target || 10));

  const onStart = () => {
    const base = resetBabyFoot(st);
    const next = setTeams(base, teamA, teamB, Number(target) || 10);
    setSt(next);
    go("babyfoot_play", { matchId: next.matchId });
  };

  return (
    <div style={wrap(theme)}>
      <div style={head}>
        <button style={back(theme)} onClick={() => go("games")}>
          ← Retour
        </button>
        <div style={title}>CONFIG — BABY-FOOT</div>
      </div>

      <div style={card(theme)}>
        <div style={label}>Équipe A</div>
        <input value={teamA} onChange={(e) => setTeamA(e.target.value)} style={input(theme)} />

        <div style={{ height: 10 }} />

        <div style={label}>Équipe B</div>
        <input value={teamB} onChange={(e) => setTeamB(e.target.value)} style={input(theme)} />

        <div style={{ height: 10 }} />

        <div style={label}>Score cible</div>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={input(theme)}
          inputMode="numeric"
        />

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
