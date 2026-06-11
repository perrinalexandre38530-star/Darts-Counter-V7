import React from "react";
import BackDot from "../../components/BackDot";
import { getFootFormat } from "./footFormats";

type Props = { go: (route: any, params?: any) => void; params?: any; store?: any };

function makePlayers(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
}

export default function FootConfig({ go, params }: Props) {
  const spec = getFootFormat(params?.format || params?.config?.format);
  const [teamA, setTeamA] = React.useState(spec.kind === "duel" ? "Joueur A" : "Équipe A");
  const [teamB, setTeamB] = React.useState(spec.kind === "duel" ? "Joueur B" : "Équipe B");
  const [minutes, setMinutes] = React.useState(spec.minutesPerPeriod);
  const [periods, setPeriods] = React.useState(spec.periods);
  const [shoots, setShoots] = React.useState(5);
  const [playersA, setPlayersA] = React.useState<string[]>(makePlayers("A", spec.playersPerSide));
  const [playersB, setPlayersB] = React.useState<string[]>(makePlayers("B", spec.playersPerSide));

  React.useEffect(() => {
    setMinutes(spec.minutesPerPeriod);
    setPeriods(spec.periods);
    setTeamA(spec.kind === "duel" ? "Joueur A" : "Équipe A");
    setTeamB(spec.kind === "duel" ? "Joueur B" : "Équipe B");
    setPlayersA(makePlayers("A", spec.playersPerSide));
    setPlayersB(makePlayers("B", spec.playersPerSide));
  }, [spec.id]);

  const updatePlayer = (side: "A" | "B", idx: number, value: string) => {
    const setter = side === "A" ? setPlayersA : setPlayersB;
    setter((prev) => prev.map((p, i) => (i === idx ? value : p)));
  };

  const start = () => go("foot_play", { config: { sport: "foot", mode: `foot_${spec.id}`, format: spec.id, formatLabel: spec.label, kind: spec.kind, teamA, teamB, playersA, playersB, minutes, periods, shoots } });

  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 92px", color: "#fff", background: "linear-gradient(180deg, #06140b, #020604)" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <BackDot onClick={() => go("foot_menu")} />
        <h1 style={{ textAlign: "center", margin: "8px 0 6px", fontSize: 30 }}>CONFIG {spec.label}</h1>
        <p style={{ textAlign: "center", margin: "0 0 16px", opacity: .72, fontWeight: 800 }}>{spec.kind === "duel" ? "Duel" : "Match par équipes"} · {spec.maxPlayersHint}</p>

        <div style={cardStyle}>
          <h2 style={sectionTitle}>RÈGLES DU FORMAT</h2>
          <div style={{ display: "grid", gap: 7 }}>{spec.rules.map((r) => <div key={r} style={{ opacity: .82, fontWeight: 750 }}>• {r}</div>)}</div>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <Field label={spec.kind === "duel" ? "Joueur / camp A" : "Équipe domicile"} value={teamA} onChange={setTeamA} />
          <Field label={spec.kind === "duel" ? "Joueur / camp B" : "Équipe extérieur"} value={teamB} onChange={setTeamB} />
          {spec.id === "penalty" ? (
            <Select label="Tirs par camp" value={shoots} onChange={setShoots} options={[3, 5, 7, 10]} suffix=" tirs" />
          ) : (
            <>
              <Select label="Durée par période" value={minutes} onChange={setMinutes} options={[5, 7, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45]} suffix=" min" />
              <Select label="Périodes" value={periods} onChange={setPeriods} options={[1, 2]} />
            </>
          )}
        </div>

        {spec.kind === "team" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <Roster title={teamA || "Équipe A"} players={playersA} onChange={(i: number, v: string) => updatePlayer("A", i, v)} />
            <Roster title={teamB || "Équipe B"} players={playersB} onChange={(i: number, v: string) => updatePlayer("B", i, v)} />
          </div>
        )}

        <button onClick={start} style={{ marginTop: 14, width: "100%", border: 0, borderRadius: 18, padding: "15px 16px", background: "linear-gradient(135deg, #35d86f, #087535)", color: "#fff", fontWeight: 1000, fontSize: 15, cursor: "pointer" }}>DÉMARRER {spec.label}</button>
      </div>
    </div>
  );
}

function Roster({ title, players, onChange }: any) {
  return <div style={cardStyle}><h2 style={sectionTitle}>{title}</h2><div style={{ display: "grid", gap: 8 }}>{players.map((p: string, i: number) => <input key={i} value={p} onChange={(e) => onChange(i, e.target.value)} style={inputStyle} />)}</div></div>;
}
function Field({ label, value, onChange }: any) { return <label style={labelStyle}>{label}<input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>; }
function Select({ label, value, onChange, options, suffix = "" }: any) { return <label style={labelStyle}>{label}<select value={value} onChange={(e) => onChange(Number(e.target.value))} style={inputStyle}>{options.map((o: number) => <option key={o} value={o}>{o}{suffix}</option>)}</select></label>; }
const labelStyle: React.CSSProperties = { display: "grid", gap: 7, fontWeight: 900, fontSize: 12, letterSpacing: .6 };
const cardStyle: React.CSSProperties = { borderRadius: 20, padding: 14, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.10)" };
const sectionTitle: React.CSSProperties = { margin: "0 0 10px", color: "#39f083", fontSize: 14, letterSpacing: .9 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 16, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)", color: "#fff", padding: "13px 14px", fontWeight: 900, outline: "none" };
