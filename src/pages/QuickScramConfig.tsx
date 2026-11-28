import React from "react";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import { MssQuickPlayers, MssQuickPanel, MssQuickChoices, MssQuickRecap, MssQuickStart } from "../components/config/MssQuickClassicControls";
import MssKillerBooleanToggle from "../components/config/MssKillerBooleanToggle";
import MssScramAwenaTip from "../components/config/MssScramAwenaTip";

export default function QuickScramConfig({ go, onBack }: { go: (route: string, params?: any) => void; onBack: () => void }) {
  const [session] = React.useState(() => `scram-quick-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const [count, setCount] = React.useState(2);
  const [step, setStep] = React.useState(0);
  const steps = ["Participants", "Règles", "Récapitulatif"];
  const [names, setNames] = React.useState(Array.from({ length: 8 }, (_, i) => `J${i + 1}`));
  const [useBull, setUseBull] = React.useState(true);
  const [maxRoundsPerPhase, setMaxRounds] = React.useState(20);
  const [firstStopper, setFirstStopper] = React.useState("random");
  function start() {
    const players = names.slice(0, count).map((name, i) => ({
      id: `${session}-p${i + 1}`, temporaryPlayerId: `${session}-p${i + 1}`, profileId: null, isTemporary: true, isBot: false,
      name: name.trim() || `J${i + 1}`, avatarDataUrl: quickPartyAvatar(i, session), avatarUrl: quickPartyAvatar(i, session),
    }));
    const a = players.filter((_, i) => i % 2 === 0), b = players.filter((_, i) => i % 2 === 1);
    const teams = [{ id: `${session}-a`, name: "ÉQUIPE A", side: "A", playerIds: a.map(p => p.id) },
      { id: `${session}-b`, name: "ÉQUIPE B", side: "B", playerIds: b.map(p => p.id) }];
    const chosen = firstStopper === "random" ? Math.random() < .5 ? "A" : "B" : firstStopper;
    go("scram_play", { players: count, selectedIds: players.map(p => p.id), playersList: players,
      teamConfigs: teams, botIds: [], botsEnabled: false, botLevel: "normal", useBull, maxRoundsPerPhase, firstStopper: chosen,
      participantMode: "players", inputMethod: "keypad", quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true });
  }
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ minHeight: "100dvh", padding: "0 12px 100px", background: "#050710", color: "#fff" }}>
    <DartsQuickHeader modeId="scram" title="SCRAM" onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title="SCRAM" />
      <section aria-label="Étapes Partie rapide SCRAM" style={{border:"1px solid #f6c25655",borderRadius:18,background:"#0b0d19",padding:14,display:"grid",gap:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><strong style={{color:"#f6c256"}}>PARTIE RAPIDE · SCRAM</strong><span style={{color:"#b8c4df",fontSize:12}}>Étape {step+1}/3 · {steps[step]}</span></div>
        <div style={{display:"flex",justifyContent:"center",gap:10}}>{steps.map((name,i)=><button key={name} type="button" aria-label={`Étape ${i+1} : ${name}`} aria-current={step===i?"step":undefined} onClick={()=>setStep(i)} style={{minWidth:42,height:42,borderRadius:13,border:`1px solid ${step===i?"#f6c256":"#ffffff29"}`,background:step===i?"#f6c25622":"#ffffff07",color:step===i?"#f6c256":"#b9c6dd",fontWeight:900,cursor:"pointer"}}>{i+1}</button>)}</div>
        <div style={{height:5,borderRadius:99,background:"#ffffff19",overflow:"hidden"}}><div style={{width:`${((step+1)/3)*100}%`,height:"100%",background:"linear-gradient(90deg,#f6c256,#f58aca)"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}><button type="button" disabled={step===0} onClick={()=>setStep(n=>Math.max(0,n-1))} style={{padding:13,borderRadius:14,background:"#111521",border:"1px solid #ffffff30",color:step===0?"#768197":"#fff",fontWeight:900}}>← Précédent</button><button type="button" disabled={step===2} onClick={()=>setStep(n=>Math.min(2,n+1))} style={{padding:13,borderRadius:14,background:"#f6c25619",border:"1px solid #f6c256",color:step===2?"#768197":"#f6c256",fontWeight:900}}>Suivant →</button></div>
      </section>
      {step===0 && <MssQuickPlayers count={count} choices={[2, 4, 6, 8]} onCount={setCount} names={names} onNames={setNames}
        label="Participants · 2 camps" info="Camps A et B composés en alternance, avec le même nombre de joueurs." sessionId={session} />}
      {step===1 && <MssQuickPanel title="RÈGLES · SCRAM">
        <MssKillerBooleanToggle label="BULL INCLUS" checked={useBull} onChange={setUseBull} accent="#f6c256" />
        <MssQuickChoices label="Tours maximum par phase" options={[10, 20, 30].map(n => ({ value: n, label: String(n) }))} value={maxRoundsPerPhase} onChange={setMaxRounds} compact />
        <MssQuickChoices label="Premier bloqueur" options={[{ value: "random", label: "ALÉATOIRE" }, { value: "A", label: "ÉQUIPE A" }, { value: "B", label: "ÉQUIPE B" }]} value={firstStopper} onChange={setFirstStopper} />
      </MssQuickPanel>}
      {step===2 && <MssQuickRecap entries={[["Camps", `2 × ${count / 2} joueurs`], ["Bull", useBull ? "Inclus" : "Exclu"],
        ["Tours par phase", maxRoundsPerPhase], ["Premier bloqueur", firstStopper === "random" ? "Aléatoire" : `Équipe ${firstStopper}`]]} />}
      {step===2 && <><MssScramAwenaTip step={3} quick /><MssQuickStart onClick={start} /></>}
    </main>
  </div>;
}
