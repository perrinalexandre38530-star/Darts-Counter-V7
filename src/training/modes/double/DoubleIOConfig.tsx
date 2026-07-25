import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

type Mode = "DI" | "DO" | "DIDO";

const sectionLabel: React.CSSProperties = {
  margin: "14px 2px 8px",
  color: "#27dcff",
  fontSize: 10.5,
  fontWeight: 950,
  letterSpacing: 1,
};

export default function DoubleIOConfig({
  profiles,
  onStart,
  onExit,
}: {
  profiles?: Profile[];
  onStart: (cfg: any) => void;
  onExit: () => void;
}) {
  const [selectedPlayerIds, setSelectedPlayerIds] = React.useState<string[]>(() =>
    profiles?.[0]?.id ? [profiles[0].id] : []
  );
  const [selectedBotIds, setSelectedBotIds] = React.useState<string[]>([]);
  const [mode, setMode] = React.useState<Mode>("DO");
  const [rounds, setRounds] = React.useState(20);

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="Double In / Double Out"
          tickerId="training_doubleio"
          onBack={onExit}
          rules={
            <>
              <p>Chaque objectif est un double exact à toucher en trois fléchettes maximum.</p>
              <p>
                <b>DI</b> parcourt de nombreux doubles. <b>DO</b> privilégie les doubles courants de checkout.
                <b> DI+DO</b> alterne une cible d'entrée puis une cible de sortie.
              </p>
              <p>Les résultats sont enregistrés uniquement dans les statistiques Training du profil sélectionné.</p>
            </>
          }
        />
      }
      body={
        <div style={{ width: "min(680px,100%)", margin: "0 auto" }}>
          <TrainingParticipantsBlock
            profiles={profiles}
            selectedPlayerIds={selectedPlayerIds}
            setSelectedPlayerIds={setSelectedPlayerIds}
            selectedBotIds={selectedBotIds}
            setSelectedBotIds={setSelectedBotIds}
            solo
            allowBots={false}
          />

          <div style={sectionLabel}>DRILL</div>
          <TrainingOptionCard
            title="DOUBLE IN"
            subtitle="D1 → D20 : précision sur toute la couronne des doubles."
            active={mode === "DI"}
            onClick={() => setMode("DI")}
          />
          <TrainingOptionCard
            title="DOUBLE OUT"
            subtitle="D20, D16, D18, D12, D10, D8… : doubles de finition prioritaires."
            active={mode === "DO"}
            onClick={() => setMode("DO")}
          />
          <TrainingOptionCard
            title="DOUBLE IN + DOUBLE OUT"
            subtitle="Deux objectifs par round : une entrée puis une sortie."
            active={mode === "DIDO"}
            onClick={() => setMode("DIDO")}
          />

          <div style={sectionLabel}>VOLUME</div>
          {[10, 20, 40].map((value) => (
            <TrainingOptionCard
              key={value}
              title={`${value} rounds`}
              subtitle={value === 10 ? "Session courte" : value === 20 ? "Session standard" : "Volume intensif"}
              active={rounds === value}
              onClick={() => setRounds(value)}
            />
          ))}

          <TrainingStartButton
            disabled={!selectedPlayerIds.length}
            onClick={() =>
              onStart({
                mode,
                rounds,
                selectedPlayerIds,
                selectedBotIds: [],
              })
            }
          />
        </div>
      }
    />
  );
}
