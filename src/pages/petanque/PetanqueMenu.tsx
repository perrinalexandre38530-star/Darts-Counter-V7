import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { loadPetanqueState, resetPetanque, setTeamNames, type PetanqueState } from "../../lib/petanqueStore";

type Props = { go: (route: any, params?: any) => void };

export default function PetanqueMenu({ go }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState<PetanqueState>(() => loadPetanqueState());
  const [teamA, setTeamA] = React.useState(st.teamA);
  const [teamB, setTeamB] = React.useState(st.teamB);

  const onSave = () => setSt(setTeamNames(st, teamA, teamB));
  const onNew = () => {
    const next = resetPetanque(st);
    setSt(next);
    go("petanque_play");
  };

  return (
    <div style={wrap(theme)}>
      <div style={card(theme)}>
        <div style={h1(theme)}>Pétanque</div>
        <div style={sub(theme)}>Équipes</div>

        <div style={row}>
          <label style={lbl(theme)}>A</label>
          <input style={inp(theme)} value={teamA} onChange={(e) => setTeamA(e.target.value)} />
        </div>
        <div style={row}>
          <label style={lbl(theme)}>B</label>
          <input style={inp(theme)} value={teamB} onChange={(e) => setTeamB(e.target.value)} />
        </div>

        <div style={row2}>
          <button style={primary(theme)} onClick={onSave}>Enregistrer</button>
          <button style={ghost(theme)} onClick={() => go("petanque_play")}>Jouer</button>
          <button style={danger(theme)} onClick={onNew}>Nouvelle partie</button>
        </div>
      </div>

      <div style={card(theme)}>
        <div style={sub(theme)}>Partie en cours</div>
        <div style={scoreLine(theme)}>
          <span style={chip(theme)}>{st.teamA}</span>
          <span style={score(theme)}>{st.scoreA}</span>
          <span style={sep(theme)}>—</span>
          <span style={score(theme)}>{st.scoreB}</span>
          <span style={chip(theme)}>{st.teamB}</span>
        </div>
      </div>
    </div>
  );
}

// styles (simples)
function wrap(theme: any): React.CSSProperties {
  const dark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  return {
    minHeight: "100vh",
    padding: 14,
    color: theme?.colors?.text ?? "#fff",
    background: dark
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}
function card(theme: any): React.CSSProperties {
  return { borderRadius: 18, padding: 14, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", boxShadow: "0 12px 30px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", gap: 10 };
}
function h1(theme: any): React.CSSProperties { return { fontWeight: 1000 as any, fontSize: 18, letterSpacing: 1 }; }
function sub(theme: any): React.CSSProperties { return { fontWeight: 900, opacity: 0.85 }; }

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const row2: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };

function lbl(theme: any): React.CSSProperties { return { width: 18, fontWeight: 900, opacity: 0.9 }; }
function inp(theme: any): React.CSSProperties {
  return { flex: 1, borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(0,0,0,0.22)", color: theme?.colors?.text ?? "#fff", outline: "none" };
}

function primary(theme: any): React.CSSProperties { return { flex: 1, borderRadius: 14, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.10)", color: theme?.colors?.text ?? "#fff", fontWeight: 900, cursor: "pointer" }; }
function ghost(theme: any): React.CSSProperties { return { borderRadius: 14, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.04)", color: theme?.colors?.text ?? "#fff", fontWeight: 800, cursor: "pointer", opacity: 0.92 }; }
function danger(theme: any): React.CSSProperties { return { borderRadius: 14, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,60,60,0.18)", color: theme?.colors?.text ?? "#fff", fontWeight: 900, cursor: "pointer" }; }

function scoreLine(theme: any): React.CSSProperties { return { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 0" }; }
function chip(theme: any): React.CSSProperties { return { maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.16)", fontWeight: 900, opacity: 0.95 }; }
function score(theme: any): React.CSSProperties { return { fontWeight: 1000 as any, fontSize: 28, letterSpacing: 1 }; }
function sep(theme: any): React.CSSProperties { return { opacity: 0.5, fontWeight: 900 }; }
