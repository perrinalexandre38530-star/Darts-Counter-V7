import React from "react";
import BackDot from "../../components/BackDot";

type Props = { go: (route: any, params?: any) => void; params?: any; store?: any };

export default function FootConfig({ go }: Props) {
  const [teamA, setTeamA] = React.useState("Équipe A");
  const [teamB, setTeamB] = React.useState("Équipe B");
  const [minutes, setMinutes] = React.useState(20);
  const [periods, setPeriods] = React.useState(2);
  const start = () => go("foot_play", { config: { teamA, teamB, minutes, periods, sport: "foot", mode: "foot_match" } });
  return (
    <div style={{ minHeight: "100vh", padding: "18px 14px 92px", color: "#fff", background: "linear-gradient(180deg, #06140b, #020604)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <BackDot onClick={() => go("foot_menu")} />
        <h1 style={{ textAlign: "center", margin: "8px 0 16px", fontSize: 30 }}>CONFIG MATCH FOOT</h1>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Équipe domicile" value={teamA} onChange={setTeamA} />
          <Field label="Équipe extérieur" value={teamB} onChange={setTeamB} />
          <Select label="Durée par mi-temps" value={minutes} onChange={setMinutes} options={[5, 10, 15, 20, 25, 30, 35, 40, 45]} suffix=" min" />
          <Select label="Périodes" value={periods} onChange={setPeriods} options={[1, 2]} />
          <button onClick={start} style={{ marginTop: 6, border: 0, borderRadius: 18, padding: "15px 16px", background: "linear-gradient(135deg, #35d86f, #087535)", color: "#fff", fontWeight: 1000, fontSize: 15, cursor: "pointer" }}>DÉMARRER LE MATCH</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: any) {
  return <label style={{ display: "grid", gap: 7, fontWeight: 900, fontSize: 12, letterSpacing: .6 }}>{label}<input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>;
}
function Select({ label, value, onChange, options, suffix = "" }: any) {
  return <label style={{ display: "grid", gap: 7, fontWeight: 900, fontSize: 12, letterSpacing: .6 }}>{label}<select value={value} onChange={(e) => onChange(Number(e.target.value))} style={inputStyle}>{options.map((o: number) => <option key={o} value={o}>{o}{suffix}</option>)}</select></label>;
}
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 16, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)", color: "#fff", padding: "13px 14px", fontWeight: 900, outline: "none" };
