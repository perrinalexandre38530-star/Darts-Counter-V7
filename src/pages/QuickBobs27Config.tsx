import React from "react";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import type { Bobs27ConfigPayload } from "../lib/gameEngines/bobs27Engine";

type Props = { onBack: () => void; onStart: (payload: Bobs27ConfigPayload) => void };
const panel: React.CSSProperties = { borderRadius: 18, background: "rgba(10,12,24,.94)", border: "1px solid rgba(85,230,255,.20)", padding: 14, display: "grid", gap: 12 };
const choices = (active: boolean): React.CSSProperties => ({ borderRadius: 12, border: `1px solid ${active ? "#55e6ff" : "#ffffff35"}`, background: active ? "#55e6ff25" : "#ffffff09", color: active ? "#b8f7ff" : "#ffffff", minHeight: 42, padding: "8px 13px", fontWeight: 900, cursor: "pointer" });

export default function QuickBobs27Config({ onBack, onStart }: Props) {
  const [count, setCount] = React.useState(2);
  const [names, setNames] = React.useState(() => Array.from({ length: 12 }, (_, i) => `J${i + 1}`));
  const [includeBull, setIncludeBull] = React.useState(true);
  const [negativeRule, setNegativeRule] = React.useState<"eliminate" | "continue">("eliminate");
  const [randomOrder, setRandomOrder] = React.useState(false);
  function start() {
    const sessionId = `quick-bobs27-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const playersList = names.slice(0, count).map((value, i) => ({
      id: `${sessionId}-p${i + 1}`, profileId: null, temporaryPlayerId: `${sessionId}-p${i + 1}`,
      isTemporary: true, isBot: false, name: value.trim() || `J${i + 1}`,
      avatarDataUrl: null, dartSetId: null,
    }));
    const ordered = randomOrder ? [...playersList].sort(() => Math.random() - .5) : playersList;
    onStart({
      mode: "bobs_27", participantMode: "players", players: count,
      selectedIds: ordered.map(p => p.id), playersList: ordered,
      teamConfigs: [], playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal",
      startingScore: 27, startTarget: 1, endTarget: 20, includeBull,
      negativeRule, randomOrder: false, scoreInputMethod: "keypad",
      quickParty: true, temporaryParticipants: true, profileStatsDeferred: true,
    } as Bobs27ConfigPayload);
  }
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ color: "white", minHeight: "100dvh", padding: "12px 12px 96px", background: "radial-gradient(circle at top,#15192c 0,#05060c 50%,#020308 100%)" }}>
    <DartsQuickHeader modeId="bobs_27" title="BOB'S 27" onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title="BOB'S 27" />
      <section style={panel}>
        <strong style={{ color: "#55e6ff" }}>JOUEURS</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[1,2,3,4].map(n => <button type="button" key={n} style={choices(n === count)} onClick={() => setCount(n)}>{n === 1 ? "SOLO" : n === 2 ? "DUEL" : `${n} JOUEURS`}</button>)}
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>MULTI <select aria-label="Nombre de joueurs" value={count} onChange={e => setCount(Number(e.target.value))} style={{ ...choices(true), color: "white" }}>{Array.from({length: 12}, (_,i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 9 }}>
          {names.slice(0, count).map((name, i) => <label key={i} style={{ display: "grid", gap: 5, fontSize: 12, color: "#b5bdd5", fontWeight: 800 }}>JOUEUR {i + 1}<input aria-label={`Nom du joueur ${i + 1}`} value={name} maxLength={32} onFocus={e => e.currentTarget.select()} onChange={e => setNames(prev => prev.map((v,j) => i === j ? e.target.value : v))} style={{ background: "#181b29", color: "white", border: "1px solid #ffffff30", borderRadius: 12, padding: 12, fontSize: 16 }} /></label>)}
        </div>
      </section>
      <section style={panel}>
        <strong style={{ color: "#55e6ff" }}>RÈGLES · BOB'S 27</strong>
        <small style={{ color: "#b5bdd5" }}>Départ à 27 points · D1 à D20 · 3 fléchettes par cible.</small>
        <div style={{ display: "grid", gap: 6 }}>FIN DU PARCOURS<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button type="button" style={choices(!includeBull)} onClick={() => setIncludeBull(false)}>D20</button><button type="button" style={choices(includeBull)} onClick={() => setIncludeBull(true)}>D20 + DBULL</button></div></div>
        <div style={{ display: "grid", gap: 6 }}>SCORE NÉGATIF<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button type="button" style={choices(negativeRule === "eliminate")} onClick={() => setNegativeRule("eliminate")}>ÉLIMINATION</button><button type="button" style={choices(negativeRule === "continue")} onClick={() => setNegativeRule("continue")}>CONTINUER</button></div></div>
      </section>
      <section style={panel}><strong style={{ color: "#55e6ff" }}>ORDRE DE DÉPART</strong><div style={{ display: "flex", gap: 8 }}><button type="button" style={choices(!randomOrder)} onClick={() => setRandomOrder(false)}>DANS L’ORDRE</button><button type="button" style={choices(randomOrder)} onClick={() => setRandomOrder(true)}>ALÉATOIRE</button></div></section>
      <button type="button" onClick={start} style={{ minHeight: 58, borderRadius: 16, color: "#baffdf", background: "linear-gradient(180deg,#52f5b23a,#52f5b214)", border: "1px solid #52f5b2aa", fontSize: 19, fontWeight: 950 }}>JOUER</button>
    </main>
  </div>;
}
