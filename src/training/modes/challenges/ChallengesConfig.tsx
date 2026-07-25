import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

export const TRAINING_CHALLENGES = [
  {
    id: "3_DOUBLES_9",
    title: "3 DOUBLES / 9 FLÉCHETTES",
    subtitle: "Touche trois doubles quelconques avant la neuvième fléchette.",
    kind: "doubles",
    goal: 3,
    darts: 9,
  },
  {
    id: "BULL_T20_D20",
    title: "BULL → T20 → D20",
    subtitle: "Valide cette séquence exacte, dans l'ordre, en douze fléchettes maximum.",
    kind: "sequence",
    seq: ["BULL", "T20", "D20"],
    darts: 12,
  },
  {
    id: "CHECKOUT_40_3",
    title: "CHECKOUT 40 / 3 FLÉCHETTES",
    subtitle: "Fais exactement 40 et termine obligatoirement sur un double.",
    kind: "checkout40",
    darts: 3,
  },
] as const;

export default function ChallengesConfig({
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
  const [selected, setSelected] = React.useState<(typeof TRAINING_CHALLENGES)[number]>(
    TRAINING_CHALLENGES[0]
  );

  return (
    <TrainingShell
      header={
        <TrainingHeader
          title="Challenges"
          tickerId="training_challenges"
          onBack={onExit}
          rules={
            <>
              <p>Choisis un défi court. Chaque défi a une condition de réussite et une limite de fléchettes.</p>
              <p>Le résultat, la progression et la précision sont enregistrés dans les statistiques Training.</p>
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

          <div style={{ margin: "14px 2px 8px", color: "#27dcff", fontSize: 10.5, fontWeight: 950, letterSpacing: 1 }}>
            DÉFI
          </div>
          {TRAINING_CHALLENGES.map((challenge) => (
            <TrainingOptionCard
              key={challenge.id}
              title={challenge.title}
              subtitle={challenge.subtitle}
              active={selected.id === challenge.id}
              onClick={() => setSelected(challenge)}
            />
          ))}

          <TrainingStartButton
            label="LANCER LE DÉFI"
            disabled={!selectedPlayerIds.length}
            onClick={() =>
              onStart({
                ...selected,
                challengeId: selected.id,
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
