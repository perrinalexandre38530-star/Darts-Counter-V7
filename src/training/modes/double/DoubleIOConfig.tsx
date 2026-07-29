import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";
import TrainingParticipantsSelector, {
  buildTrainingParticipantConfig,
  resolveTrainingParticipants,
  useTrainingParticipantSelection,
} from "../../ui/TrainingParticipantsSelector";

type Mode = "DI" | "DO" | "DIDO";

const sectionLabel: React.CSSProperties = { margin: "14px 2px 8px", color: "#27dcff", fontSize: 10.5, fontWeight: 950, letterSpacing: 1 };

export default function DoubleIOConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart: (cfg: any) => void; onExit: () => void; }) {
  const [participants, setParticipants] = useTrainingParticipantSelection(profiles);
  const [mode, setMode] = React.useState<Mode>("DO");
  const [rounds, setRounds] = React.useState(20);
  const resolved = resolveTrainingParticipants(participants, profiles);

  return (
    <TrainingShell
      header={<TrainingHeader title="Double In / Double Out" tickerId="training_doubleio" onBack={onExit} rules={<><p>Travaille les doubles exacts en DI, DO ou DI+DO.</p><p>En groupe ou en équipes, chaque joueur réalise le même volume afin de rendre les résultats comparables.</p></>} />}
      body={
        <div style={{ width: "min(760px,100%)", margin: "0 auto" }}>
          <TrainingParticipantsSelector profiles={profiles} value={participants} onChange={setParticipants} />

          <div style={sectionLabel}>DRILL</div>
          <TrainingOptionCard title="DOUBLE IN" subtitle="D1 → D20 : précision sur toute la couronne des doubles." active={mode === "DI"} onClick={() => setMode("DI")} />
          <TrainingOptionCard title="DOUBLE OUT" subtitle="D20, D16, D18, D12, D10, D8… : doubles de finition prioritaires." active={mode === "DO"} onClick={() => setMode("DO")} />
          <TrainingOptionCard title="DOUBLE IN + DOUBLE OUT" subtitle="Deux objectifs par round : une entrée puis une sortie." active={mode === "DIDO"} onClick={() => setMode("DIDO")} />

          <div style={sectionLabel}>VOLUME</div>
          {[10, 20, 40].map((value) => <TrainingOptionCard key={value} title={`${value} rounds`} subtitle={value === 10 ? "Session courte" : value === 20 ? "Session standard" : "Volume intensif"} active={rounds === value} onClick={() => setRounds(value)} />)}

          <TrainingStartButton disabled={!resolved.length} label={resolved.length > 1 ? `LANCER — ${resolved.length} JOUEURS` : undefined} onClick={() => onStart({ mode, rounds, ...buildTrainingParticipantConfig(participants, profiles) })} />
        </div>
      }
    />
  );
}
