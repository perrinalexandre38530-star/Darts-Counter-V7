import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

const DURATIONS = [30, 60, 120] as const;

export default function TimeAttackConfig({
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
  const [seconds, setSeconds] = React.useState<(typeof DURATIONS)[number]>(60);

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="TIME ATTACK"
          tickerId="training_time_attack"
          onBack={onExit}
          rules={
            <>
              <p>Tu disposes d’un temps limité pour marquer le maximum de points.</p>
              <p>Le chrono démarre à la validation de ta première volée complète de 3 fléchettes.</p>
              <p>Toutes les zones comptent normalement. Il n’y a ni bust ni objectif imposé.</p>
            </>
          }
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
            solo
            allowBots={false}
            maxPlayers={1}
            maxBots={0}
          />

          <div style={{ margin: "4px 2px 9px", fontSize: 11, fontWeight: 950, letterSpacing: 0.85, opacity: 0.66 }}>
            DURÉE DE LA SESSION
          </div>

          {DURATIONS.map((value) => (
            <TrainingOptionCard
              key={value}
              title={`${value} secondes`}
              subtitle={value === 30 ? "Sprint — rythme maximal" : value === 60 ? "Standard — vitesse + régularité" : "Endurance — tenir le scoring"}
              active={seconds === value}
              onClick={() => setSeconds(value)}
            />
          ))}

          <TrainingStartButton
            disabled={!selectedPlayerIds.length}
            onClick={() =>
              onStart({
                seconds,
                selectedPlayerIds: selectedPlayerIds.slice(0, 1),
                selectedBotIds: [],
              })
            }
          />
        </div>
      }
    />
  );
}
