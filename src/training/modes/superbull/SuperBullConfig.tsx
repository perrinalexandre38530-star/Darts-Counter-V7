import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";
import TrainingParticipantsSelector, { buildTrainingParticipantConfig, resolveTrainingParticipants, useTrainingParticipantSelection } from "../../ui/TrainingParticipantsSelector";

const sectionLabel: React.CSSProperties = { margin: "14px 2px 8px", color: "#27dcff", fontSize: 10.5, fontWeight: 950, letterSpacing: 1 };
const TRAINING_PRESETS = [
  { id: "sprint", label: "SPRINT", sub: "50 pts · 15 fléchettes", target: 50, maxDarts: 15 },
  { id: "standard", label: "STANDARD", sub: "100 pts · 30 fléchettes", target: 100, maxDarts: 30 },
  { id: "endurance", label: "ENDURANCE", sub: "200 pts · 45 fléchettes", target: 200, maxDarts: 45 },
  { id: "expert", label: "EXPERT", sub: "300 pts · 60 fléchettes", target: 300, maxDarts: 60 },
] as const;

export default function SuperBullConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart:(cfg:any)=>void; onExit:()=>void; }) {
  const [participants, setParticipants] = useTrainingParticipantSelection(profiles);
  const last = React.useMemo(() => { try { return JSON.parse(localStorage.getItem("msc.training.superbull.last.v2") || "{}"); } catch { return {}; } }, []);
  const [target, setTarget] = React.useState(Number(last?.target) || 100);
  const [maxDarts, setMaxDarts] = React.useState(Number(last?.maxDarts) || 30);
  const resolved = resolveTrainingParticipants(participants, profiles);

  return <TrainingShell
    header={<TrainingHeader title="Super Bull" tickerId="training_super_bull" onBack={onExit} rules={<><p>BULL25 = 25, BULL50 = 50. Atteins l'objectif avant la limite.</p><p>En multi ou équipes, tous les joueurs disposent du même objectif et du même nombre de fléchettes.</p></>} />}
    body={<div style={{ width: "min(760px,100%)", margin: "0 auto" }}>
      <TrainingParticipantsSelector profiles={profiles} value={participants} onChange={setParticipants} />
      <div style={sectionLabel}>PRÉRÉGLAGES</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:7 }}>
        {TRAINING_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => { setTarget(preset.target); setMaxDarts(preset.maxDarts); }} style={{ minHeight:58, borderRadius:15, border:`1px solid ${target===preset.target && maxDarts===preset.maxDarts ? "#27dcff" : "rgba(255,255,255,.11)"}`, background:target===preset.target && maxDarts===preset.maxDarts ? "linear-gradient(145deg,rgba(39,220,255,.18),rgba(255,255,255,.04))" : "rgba(6,16,27,.86)", color:"#fff", textAlign:"left", padding:"9px 11px", cursor:"pointer" }}><b style={{ display:"block", fontSize:11, color:target===preset.target && maxDarts===preset.maxDarts ? "#27dcff" : "#fff" }}>{preset.label}</b><span style={{ display:"block", marginTop:3, fontSize:9, opacity:.62 }}>{preset.sub}</span></button>)}
      </div>
      <div style={sectionLabel}>OBJECTIF BULL</div>
      {[50,100,150,200,300,500].map((value) => <TrainingOptionCard key={value} title={`${value} points`} subtitle={value===50?"Sprint centre":value===100?"Standard":value===200?"Endurance Bull":value>=300?"Expert / gros volume":undefined} active={target===value} onClick={() => setTarget(value)} />)}
      <div style={sectionLabel}>LIMITE</div>
      {[9,15,30,45,60,90].map((value) => <TrainingOptionCard key={value} title={`${value} fléchettes max`} active={maxDarts===value} onClick={() => setMaxDarts(value)} />)}
      <div style={{ margin:"10px 0", borderRadius:14, padding:10, border:"1px solid rgba(39,220,255,.16)", background:"rgba(39,220,255,.05)", fontSize:10.5, opacity:.82 }}>BULL25 · BULL50 · MISS uniquement • objectif {target} pts en {maxDarts} fléchettes maximum. La saisie du Training reprend maintenant le même principe direct que le mode Jeu.</div>
      <TrainingStartButton disabled={!resolved.length} label={resolved.length > 1 ? `LANCER — ${resolved.length} JOUEURS` : undefined} onClick={() => { const cfg={ target, maxDarts, ...buildTrainingParticipantConfig(participants, profiles) }; try { localStorage.setItem("msc.training.superbull.last.v2", JSON.stringify({target,maxDarts})); } catch {} onStart(cfg); }} />
    </div>}
  />;
}
