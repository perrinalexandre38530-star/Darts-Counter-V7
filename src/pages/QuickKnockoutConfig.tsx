import React from "react";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";

const panel: React.CSSProperties = { padding: 16, borderRadius: 18, display: "grid", gap: 12, background: "#0d101d", border: "1px solid #ffffff25" };
const chip = (active: boolean): React.CSSProperties => ({ padding: "11px 15px", borderRadius: 12, cursor: "pointer", fontWeight: 900, color: active ? "#aafbeb" : "#f5f5fa", background: active ? "#17473f" : "#161924", border: `1px solid ${active ? "#36eab0" : "#ffffff30"}` });

export default function QuickKnockoutConfig({ onBack, onStart }: { onBack: () => void; onStart: (params: any) => void }) {
  const [count, setCount] = React.useState(2);
  const [rounds, setRounds] = React.useState(10);
  const [names, setNames] = React.useState(["J1", "J2", "J3", "J4"]);
  function start() {
    const session = `quick-knockout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const players = names.slice(0, count).map((n, i) => ({ id: `${session}-p${i + 1}`, name: n.trim() || `J${i + 1}`, profileId: null, isTemporary: true, isBot: false }));
    onStart({ config: { players: count, botsEnabled: false, botLevel: "normal", rounds, objective: 0, quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true }, players, quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true });
  }
  return <div className="screen x01-config-v3-screen" style={{ minHeight: "100dvh", color: "white", background: "#050710", padding: "0 12px 98px" }}>
    <DartsQuickHeader modeId="knockout" title="KNOCKOUT" onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title="KNOCKOUT" />
      <section style={panel}>
        <strong style={{ color: "#65dfff" }}>JOUEURS</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{[2, 3, 4].map(n => <button key={n} type="button" style={chip(count === n)} onClick={() => setCount(n)}>{n === 2 ? "DUEL" : `${n} JOUEURS`}</button>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 10 }}>{names.slice(0, count).map((name, i) => <label key={i} style={{ display: "grid", gap: 5, fontSize: 12, color: "#9eaac3" }}>JOUEUR {i + 1}<input value={name} maxLength={32} aria-label={`Nom du joueur ${i + 1}`} onFocus={e => e.currentTarget.select()} onChange={e => setNames(previous => previous.map((old, j) => i === j ? e.target.value : old))} style={{ padding: 12, borderRadius: 10, background: "#171b2a", color: "white", border: "1px solid #ffffff30", fontSize: 16 }} /></label>)}</div>
      </section>
      <section style={panel}>
        <strong style={{ color: "#65dfff" }}>RÈGLE · KNOCKOUT</strong>
        <span style={{ fontSize: 13, color: "#aebbd3" }}>NOMBRE MAXIMUM DE MANCHES</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{[5, 8, 10, 12, 15].map(n => <button key={n} type="button" style={chip(rounds === n)} onClick={() => setRounds(n)}>{n}</button>)}</div>
        <span style={{ fontSize: 12, color: "#aebbd3" }}>À chaque manche, le score le plus faible est éliminé. Le dernier joueur en lice gagne.</span>
      </section>
      <button type="button" onClick={start} style={{ background: "linear-gradient(#12553e,#103329)", border: "1px solid #36eab0", borderRadius: 15, padding: 18, color: "#b6ffe0", fontWeight: 950, fontSize: 19 }}>JOUER</button>
    </main>
  </div>;
}
