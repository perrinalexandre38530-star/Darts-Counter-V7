import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

const TARGETS = ["S20", "T20", "D20", "D16", "BULL", "DBULL"];

const sectionLabel: React.CSSProperties = {
  margin: "14px 2px 8px",
  color: "#27dcff",
  fontSize: 10.5,
  fontWeight: 950,
  letterSpacing: 1,
};

export default function RepeatMasterConfig({
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
  const [target, setTarget] = React.useState("T20");
  const [goal, setGoal] = React.useState(10);
  const [hardcore, setHardcore] = React.useState(false);
  const [maxDarts, setMaxDarts] = React.useState(60);

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="Repeat Master"
          tickerId="training_repeat_master"
          onBack={onExit}
          rules={
            <>
              <p>Choisis une cible exacte et construis une série de touches consécutives.</p>
              <p><b>SOFT</b> : un échec remet la série à zéro. <b>HARDCORE</b> : la première erreur termine la session.</p>
              <p>Le record de série, la précision et le nombre de resets sont enregistrés dans Training.</p>
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

          <div style={sectionLabel}>CIBLE</div>
          {TARGETS.map((value) => (
            <TrainingOptionCard
              key={value}
              title={value}
              active={target === value}
              onClick={() => setTarget(value)}
            />
          ))}

          <div style={sectionLabel}>SÉRIE À ATTEINDRE</div>
          {[5, 10, 15, 20].map((value) => (
            <TrainingOptionCard
              key={value}
              title={`${value} touches consécutives`}
              active={goal === value}
              onClick={() => setGoal(value)}
            />
          ))}

          <div style={sectionLabel}>RÈGLE D'ÉCHEC</div>
          <TrainingOptionCard
            title="SOFT"
            subtitle="Erreur = série remise à zéro, session continue."
            active={!hardcore}
            onClick={() => setHardcore(false)}
          />
          <TrainingOptionCard
            title="HARDCORE"
            subtitle="La première erreur termine immédiatement la session."
            active={hardcore}
            onClick={() => setHardcore(true)}
          />

          <div style={sectionLabel}>LIMITE</div>
          {[30, 60, 90].map((value) => (
            <TrainingOptionCard
              key={value}
              title={`${value} fléchettes max`}
              active={maxDarts === value}
              onClick={() => setMaxDarts(value)}
            />
          ))}

          <TrainingStartButton
            disabled={!selectedPlayerIds.length}
            onClick={() =>
              onStart({
                target,
                goal,
                hardcore,
                maxDarts,
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
