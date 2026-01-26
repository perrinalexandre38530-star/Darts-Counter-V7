// DoubleIOConfig — Config (participants + mode)
import React, { useState } from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

type Mode = "DI" | "DO" | "DIDO";

export default function DoubleIOConfig({
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
  const [mode, setMode] = useState<Mode>("DI");

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="Double In/Out"
          onBack={onExit}
          rules={<p>Travaille les doubles : entrée, sortie, ou les deux.</p>}
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

          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
            Sélectionne la variante.
          </div>

          <TrainingOptionCard
            title="Double In"
            subtitle="Commencer sur un double"
            active={mode === "DI"}
            onClick={() => setMode("DI")}
          />
          <TrainingOptionCard
            title="Double Out"
            subtitle="Finir sur un double"
            active={mode === "DO"}
            onClick={() => setMode("DO")}
          />
          <TrainingOptionCard
            title="Double In + Double Out"
            subtitle="Entrée et sortie en double"
            active={mode === "DIDO"}
            onClick={() => setMode("DIDO")}
          />

          <TrainingStartButton onClick={() => onStart({ mode, selectedPlayerIds, selectedBotIds })} />
        </div>
      }
    />
  );
}
