// ChallengesConfig — Config (participants + choix challenge)
import React, { useState } from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingParticipantsBlock from "../../ui/TrainingParticipantsBlock";
import TrainingOptionCard from "../../ui/TrainingOptionCard";
import TrainingStartButton from "../../ui/TrainingStartButton";

const CHALLENGES = [
  {
    id: "3_DOUBLES_9",
    title: "3 Doubles en 9 flèches",
    subtitle: "Touche 3 doubles (n’importe lesquels) en 9 darts",
    config: { kind: "doubles", goal: 3, darts: 9 },
  },
  {
    id: "BULL_T20_D20",
    title: "Bull → T20 → D20",
    subtitle: "Séquence stricte en 12 darts",
    config: { kind: "sequence", seq: ["BULL", "T20", "D20"], darts: 12 },
  },
  {
    id: "CHECKOUT_40_3",
    title: "Checkout 40 en 3 flèches",
    subtitle: "Sortie 40 (D20) en 3 darts",
    config: { kind: "checkout40", darts: 3 },
  },
];

export default function ChallengesConfig({
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
  const [pick, setPick] = useState(CHALLENGES[0]);

  return (
    <TrainingShell
      header={<TrainingHeader title="Challenges" onBack={onExit} rules={<p>Défis courts : objectif clair, darts limités.</p>} />}
      body={
        <div>
          <TrainingParticipantsBlock
            profiles={profiles}
            selectedPlayerIds={selectedPlayerIds}
            setSelectedPlayerIds={setSelectedPlayerIds}
            selectedBotIds={selectedBotIds}
            setSelectedBotIds={setSelectedBotIds}
          />

          {CHALLENGES.map((c) => (
            <TrainingOptionCard
              key={c.id}
              title={c.title}
              subtitle={c.subtitle}
              active={pick.id === c.id}
              onClick={() => setPick(c)}
            />
          ))}

          <TrainingStartButton
            label="LANCER LE DÉFI"
            onClick={() => onStart({ challengeId: pick.id, ...pick.config, selectedPlayerIds, selectedBotIds })}
          />
        </div>
      }
    />
  );
}
