import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

const PRESETS = {
  standard: {
    label: "STANDARD",
    subtitle: "S20 • S19 • S18 • S17 • S16 • BULL",
    targets: ["S20", "S19", "S18", "S17", "S16", "BULL"],
  },
  pro: {
    label: "PRO",
    subtitle: "T20 • T19 • D18 • T17 • D16 • DBULL",
    targets: ["T20", "T19", "D18", "T17", "D16", "DBULL"],
  },
  finish: {
    label: "FINISH",
    subtitle: "D20 • D16 • D10 • D8 • D4 • DBULL",
    targets: ["D20", "D16", "D10", "D8", "D4", "DBULL"],
  },
} as const;

type PresetKey = keyof typeof PRESETS;

const sectionLabel: React.CSSProperties = {
  margin: "14px 2px 8px",
  color: "#27dcff",
  fontSize: 10.5,
  fontWeight: 950,
  letterSpacing: 1,
};

export default function PrecisionConfig({
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
  const [preset, setPreset] = React.useState<PresetKey>("pro");
  const [mistakesAllowed, setMistakesAllowed] = React.useState(3);

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="Precision Gauntlet"
          tickerId="training_precision_gauntlet"
          onBack={onExit}
          rules={
            <>
              <p>Le parcours impose une cible exacte à chaque étape : numéro et multiplicateur doivent être corrects.</p>
              <p>Une touche valide fait avancer. Une erreur consomme ta tolérance ; quand elle est dépassée, la session s'arrête.</p>
              <p>Objectif : terminer tout le parcours avec le moins de fléchettes possible.</p>
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

          <div style={sectionLabel}>PARCOURS</div>
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <TrainingOptionCard
              key={key}
              title={PRESETS[key].label}
              subtitle={PRESETS[key].subtitle}
              active={preset === key}
              onClick={() => setPreset(key)}
            />
          ))}

          <div style={sectionLabel}>TOLÉRANCE</div>
          {[
            { value: 0, title: "HARDCORE", subtitle: "La première erreur termine la session." },
            { value: 3, title: "STANDARD — 3 erreurs", subtitle: "La 4e erreur termine la session." },
            { value: 6, title: "RELAX — 6 erreurs", subtitle: "Plus de volume pour travailler les cibles difficiles." },
          ].map((option) => (
            <TrainingOptionCard
              key={option.value}
              title={option.title}
              subtitle={option.subtitle}
              active={mistakesAllowed === option.value}
              onClick={() => setMistakesAllowed(option.value)}
            />
          ))}

          <TrainingStartButton
            disabled={!selectedPlayerIds.length}
            onClick={() =>
              onStart({
                preset,
                targets: [...PRESETS[preset].targets],
                mistakesAllowed,
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
