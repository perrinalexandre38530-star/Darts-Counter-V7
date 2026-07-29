import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";
import TrainingParticipantsSelector, { buildTrainingParticipantConfig, resolveTrainingParticipants, useTrainingParticipantSelection } from "../../ui/TrainingParticipantsSelector";

const sectionLabel: React.CSSProperties = { margin: "14px 2px 8px", color: "#27dcff", fontSize: 10.5, fontWeight: 950, letterSpacing: 1 };

export default function SuperBullConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart:(cfg:any)=>void; onExit:()=>void; }) {
  const [participants, setParticipants] = useTrainingParticipantSelection(profiles);
  const [target, setTarget] = React.useState(100);
  const [maxDarts, setMaxDarts] = React.useState(30);
  const resolved = resolveTrainingParticipants(participants, profiles);

  return <TrainingShell
    header={<TrainingHeader title="Super Bull" tickerId="training_super_bull" onBack={onExit} rules={<><p>BULL = 25, DBULL = 50. Atteins l'objectif avant la limite.</p><p>En multi ou équipes, tous les joueurs disposent du même objectif et du même nombre de fléchettes.</p></>} />}
    body={<div style={{ width: "min(760px,100%)", margin: "0 auto" }}>
      <TrainingParticipantsSelector profiles={profiles} value={participants} onChange={setParticipants} />
      <div style={sectionLabel}>OBJECTIF BULL</div>
      {[50,100,150].map((value) => <TrainingOptionCard key={value} title={`${value} points`} subtitle={value===50?"Rapide":value===100?"Standard":"Volume long"} active={target===value} onClick={() => setTarget(value)} />)}
      <div style={sectionLabel}>LIMITE</div>
      {[15,30,60].map((value) => <TrainingOptionCard key={value} title={`${value} fléchettes max`} active={maxDarts===value} onClick={() => setMaxDarts(value)} />)}
      <TrainingStartButton disabled={!resolved.length} label={resolved.length > 1 ? `LANCER — ${resolved.length} JOUEURS` : undefined} onClick={() => onStart({ target, maxDarts, ...buildTrainingParticipantConfig(participants, profiles) })} />
    </div>}
  />;
}
