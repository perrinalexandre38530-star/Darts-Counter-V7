import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

const sectionLabel: React.CSSProperties = {
  margin: "14px 2px 8px",
  color: "#27dcff",
  fontSize: 10.5,
  fontWeight: 950,
  letterSpacing: 1,
};

export default function GhostConfig({
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
  const [avg, setAvg] = React.useState(60);
  const [visits, setVisits] = React.useState(10);

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="Ghost Mode"
          tickerId="training_ghost"
          onBack={onExit}
          rules={
            <>
              <p>Le Ghost maintient exactement la moyenne /3 choisie.</p>
              <p>Après chaque volée de trois fléchettes, son score théorique avance. Ton objectif est de finir avec une moyenne /3 au moins égale à la sienne.</p>
              <p>Le score, la moyenne, la meilleure volée et l'écart au Ghost sont enregistrés dans Training.</p>
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

          <div style={sectionLabel}>NIVEAU DU GHOST</div>
          {[45, 60, 75, 90].map((value) => (
            <TrainingOptionCard
              key={value}
              title={`${value} de moyenne /3`}
              subtitle={
                value === 45
                  ? "Accessible"
                  : value === 60
                  ? "Intermédiaire"
                  : value === 75
                  ? "Confirmé"
                  : "Expert"
              }
              active={avg === value}
              onClick={() => setAvg(value)}
            />
          ))}

          <div style={sectionLabel}>DURÉE</div>
          {[10, 20, 30].map((value) => (
            <TrainingOptionCard
              key={value}
              title={`${value} volées`}
              subtitle={`${value * 3} fléchettes`}
              active={visits === value}
              onClick={() => setVisits(value)}
            />
          ))}

          <TrainingStartButton
            disabled={!selectedPlayerIds.length}
            onClick={() => onStart({ avg, visits, selectedPlayerIds, selectedBotIds: [] })}
          />
        </div>
      }
    />
  );
}
