// RepeatMasterConfig — Config (participants + cible + objectif + difficulté)
import React, { useState } from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

const TARGETS = [
  { id: "S20", label: "S20" },
  { id: "T20", label: "T20" },
  { id: "D20", label: "D20" },
  { id: "BULL", label: "BULL" },
  { id: "DBULL", label: "DBULL" },
];

export default function RepeatMasterConfig({
  profiles,
  onStart,
  onExit,
}: {
  profiles?: Profile[];
  onStart: (cfg: any) => void;
  onExit: () => void;
}) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
    const first = profiles && profiles[0]?.id ? [profiles[0].id] : [];
    return first.length ? first : [];
  });
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [target, setTarget] = useState("T20");
  const [goal, setGoal] = useState(10);
  const [hardcore, setHardcore] = useState(true);

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="Repeat Master"
          onBack={onExit}
          rules={<p>Répète une cible. Objectif: streak. Hardcore = 1 erreur = fin.</p>}
        />
      }
      body={
        <div>
          <TrainingParticipantsBlock
            profiles={profiles}
            selectedPlayerIds={selectedPlayerIds}
            setSelectedPlayerIds={setSelectedPlayerIds}
            selectedBotIds={selectedBotIds}
            setSelectedBotIds={setSelectedBotIds}
          />

          <div style={{ fontWeight: 900, marginBottom: 6 }}>Cible</div>
          {TARGETS.map((t) => (
            <TrainingOptionCard key={t.id} title={t.label} active={target === t.id} onClick={() => setTarget(t.id)} />
          ))}

          <div style={{ fontWeight: 900, margin: "10px 0 6px" }}>Streak objectif</div>
          {[5, 10, 15, 20].map((v) => (
            <TrainingOptionCard key={v} title={`${v}`} active={goal === v} onClick={() => setGoal(v)} />
          ))}

          <div style={{ fontWeight: 900, margin: "10px 0 6px" }}>Difficulté</div>
          <TrainingOptionCard
            title="Hardcore"
            subtitle="1 erreur = fin"
            active={hardcore === true}
            onClick={() => setHardcore(true)}
          />
          <TrainingOptionCard
            title="Soft"
            subtitle="Erreur = reset"
            active={hardcore === false}
            onClick={() => setHardcore(false)}
          />

          <TrainingStartButton onClick={() => onStart({ target, goal, hardcore, selectedPlayerIds, selectedBotIds })} />
        </div>
      }
    />
  );
}
