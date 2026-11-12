import React from "react";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";

type ModeId = "count_up" | "happy_mille" | "game_170" | "enculette";
const chip = (active: boolean): React.CSSProperties => ({
  padding: "11px 15px", borderRadius: 12, cursor: "pointer", fontWeight: 900,
  color: active ? "#aafbeb" : "#f5f5fa", background: active ? "#17473f" : "#161924",
  border: `1px solid ${active ? "#36eab0" : "#ffffff30"}`,
});
const panel: React.CSSProperties = {
  padding: 16, borderRadius: 18, display: "grid", gap: 12,
  background: "#0d101d", border: "1px solid #ffffff25",
};

export default function QuickSimpleRoundsConfig({ modeId, onBack, onStart }: {
  modeId: ModeId;
  onBack: () => void;
  onStart: (params: any) => void;
}) {
  const spec = SIMPLE_ROUND_VARIANTS[modeId];
  const [count, setCount] = React.useState(spec.defaults.players);
  const [names, setNames] = React.useState(Array.from({ length: 12 }, (_, i) => `J${i + 1}`));
  const [rounds, setRounds] = React.useState(spec.defaults.rounds);
  const [objective, setObjective] = React.useState(spec.defaults.objective);
  const numbers = spec.playersOptions.map(Number);
  const countChoices = numbers.length ? numbers : [1, 2, 3, 4];
  const launch = () => {
    const session = `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const players = names.slice(0, count).map((name, index) => ({
      id: `${session}-p${index + 1}`,
      name: name.trim() || `J${index + 1}`,
      profileId: null, isTemporary: true, isBot: false, avatarDataUrl: null,
    }));
    onStart({
      config: {
        players: count, humansCount: count, botsEnabled: false, botLevel: "normal",
        rounds, objective, quickParty: true, partyMode: "quick",
        temporaryParticipants: true, profileStatsDeferred: true,
      },
      players, quickParty: true, partyMode: "quick",
      temporaryParticipants: true, profileStatsDeferred: true,
    });
  };
  return <div className="screen x01-config-v3-screen" style={{minHeight:"100dvh",color:"white",background:"#050710",padding:"0 12px 98px"}}>
    <DartsQuickHeader modeId={modeId} title={spec.title} onBack={onBack} />
    <main style={{maxWidth:760,margin:"auto",display:"grid",gap:14}}>
      <DartsQuickIntro title={spec.title} />
      <section style={panel}>
        <strong style={{color:"#65dfff"}}>JOUEURS</strong>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{countChoices.map(n => <button type="button" key={n} style={chip(n === count)} onClick={() => setCount(n)}>{n === 1 ? "SOLO" : n === 2 ? "DUEL" : `${n} JOUEURS`}</button>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:10}}>{names.slice(0,count).map((name,i) => <label key={i} style={{display:"grid",gap:5,fontSize:12,color:"#9eaac3"}}>JOUEUR {i + 1}<input aria-label={`Nom du joueur ${i + 1}`} value={name} maxLength={32} onFocus={e => e.currentTarget.select()} onChange={e => setNames(v => v.map((old,j) => i === j ? e.target.value : old))} style={{padding:12,borderRadius:10,background:"#171b2a",color:"white",border:"1px solid #ffffff30",fontSize:16}} /></label>)}</div>
      </section>
      <section style={panel}>
        <strong style={{color:"#65dfff"}}>RÈGLES · {spec.title}</strong>
        <span style={{fontSize:13,color:"#aebbd3"}}>MANCHES</span>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{spec.roundsOptions.map(Number).map(n => <button type="button" key={n} style={chip(n === rounds)} onClick={() => setRounds(n)}>{n}</button>)}</div>
        <span style={{fontSize:13,color:"#aebbd3"}}>OBJECTIF</span>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{spec.objectiveOptions.map(Number).map(n => <button type="button" key={n} style={chip(n === objective)} onClick={() => setObjective(n)}>{n === 0 ? "SANS OBJECTIF" : n}</button>)}</div>
      </section>
      <button type="button" onClick={launch} style={{background:"linear-gradient(#12553e,#103329)",border:"1px solid #36eab0",borderRadius:15,padding:18,color:"#b6ffe0",fontWeight:950,fontSize:19}}>JOUER</button>
    </main>
  </div>;
}
