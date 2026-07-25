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

export default function SuperBullConfig({
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
  const [target, setTarget] = React.useState(100);
  const [maxDarts, setMaxDarts] = React.useState(30);

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="Super Bull"
          tickerId="training_super_bull"
          onBack={onExit}
          rules={
            <>
              <p>Seuls le BULL et le DBULL marquent : BULL = 25 points, DBULL = 50 points.</p>
              <p>Une fléchette ailleurs compte comme un raté Training mais ne termine pas la session.</p>
              <p>Atteins l'objectif de points avant la limite de fléchettes.</p>
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

          <div style={sectionLabel}>OBJECTIF BULL</div>
          {[50, 100, 150].map((value) => (
            <TrainingOptionCard
              key={value}
              title={`${value} points`}
              subtitle={value === 50 ? "Rapide" : value === 100 ? "Standard" : "Volume long"}
              active={target === value}
              onClick={() => setTarget(value)}
            />
          ))}

          <div style={sectionLabel}>LIMITE</div>
          {[15, 30, 60].map((value) => (
            <TrainingOptionCard
              key={value}
              title={`${value} fléchettes max`}
              active={maxDarts === value}
              onClick={() => setMaxDarts(value)}
            />
          ))}

          <TrainingStartButton
            disabled={!selectedPlayerIds.length}
            onClick={() => onStart({ target, maxDarts, selectedPlayerIds, selectedBotIds: [] })}
          />
        </div>
      }
    />
  );
}
