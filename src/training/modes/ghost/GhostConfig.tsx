import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";
import TrainingParticipantsSelector, { buildTrainingParticipantConfig, resolveTrainingParticipants, useTrainingParticipantSelection } from "../../ui/TrainingParticipantsSelector";

const sectionLabel: React.CSSProperties = { margin: "14px 2px 8px", color: "#27dcff", fontSize: 10.5, fontWeight: 950, letterSpacing: 1 };

export default function GhostConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart: (cfg: any) => void; onExit: () => void; }) {
  const [participants, setParticipants] = useTrainingParticipantSelection(profiles);
  const [avg, setAvg] = React.useState(60);
  const [visits, setVisits] = React.useState(10);
  const resolved = resolveTrainingParticipants(participants, profiles);

  return (
    <TrainingShell
      header={<TrainingHeader title="Ghost Mode" tickerId="training_ghost" onBack={onExit} rules={<><p>Le Ghost maintient la moyenne /3 choisie.</p><p>En multi ou en équipes, tous les joueurs affrontent exactement le même Ghost et le même nombre de volées.</p></>} />}
      body={<div style={{ width: "min(760px,100%)", margin: "0 auto" }}>
        <TrainingParticipantsSelector profiles={profiles} value={participants} onChange={setParticipants} />
        <div style={sectionLabel}>NIVEAU DU GHOST</div>
        {[45,60,75,90].map((value) => <TrainingOptionCard key={value} title={`${value} de moyenne /3`} subtitle={value===45?"Accessible":value===60?"Intermédiaire":value===75?"Confirmé":"Expert"} active={avg===value} onClick={() => setAvg(value)} />)}
        <div style={sectionLabel}>DURÉE</div>
        {[10,20,30].map((value) => <TrainingOptionCard key={value} title={`${value} volées`} subtitle={`${value*3} fléchettes`} active={visits===value} onClick={() => setVisits(value)} />)}
        <TrainingStartButton disabled={!resolved.length} label={resolved.length > 1 ? `AFFRONTER LE GHOST — ${resolved.length} JOUEURS` : "AFFRONTER LE GHOST"} onClick={() => onStart({ avg, visits, ...buildTrainingParticipantConfig(participants, profiles) })} />
      </div>}
    />
  );
}
