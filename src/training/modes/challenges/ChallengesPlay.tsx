// ============================================
// TRAINING — Challenges
// Objectif : scénarios à objectifs
// ============================================

import React, { useMemo, useState } from "react";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import type { TrainingTarget } from "../../engine/trainingTypes";
import ScoreInputHub from "../../../components/ScoreInputHub";

type Challenge = {
  title: string;
  description: string;
  target: TrainingTarget;
  darts: number;
};

const CHALLENGES: Challenge[] = [
  {
    title: "Triple 20",
    description: "Touche le T20 en 6 flèches",
    target: { label: "T20", value: 20, multiplier: 3 },
    darts: 6,
  },
  {
    title: "Double Bull",
    description: "Touche le DBULL en 9 flèches",
    target: { label: "DBULL", value: "DBULL" },
    darts: 9,
  },
];
import { recordTrainingSession, recordTrainingParticipantSession } from "../../stats/trainingStatsHub";


export default function ChallengesPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const challenge = CHALLENGES[0];

  const engine = useMemo(
    () =>
      new TrainingEngine({
        mode: "CHALLENGES",
        maxDarts: challenge.darts,
      }),
    []
  );

  const [ended, setEnded] = useState(false);

  function onThrow(target: TrainingTarget | null, hit: boolean, score: number) {
    engine.throw(target, hit, score);

    if (
      hit &&
      target?.value === challenge.target.value &&
      target?.multiplier === challenge.target.multiplier
    ) {
      engine.finish(true);
      setEnded(true);
      return;
    }

    if (engine.state.darts.length >= challenge.darts) {
      engine.finish(false);
      setEnded(true);
    }
  }

  const stats = computeTrainingStats(engine.state);

  
  const recordedRef = React.useRef(false);
  React.useEffect(() => {
    if (!ended) return;
    if (recordedRef.current) return;
    recordedRef.current = true;

    const darts = (stats as any)?.dartsThrown ?? 0;
    const points = (stats as any)?.score ?? 0;

    recordTrainingSession("training_challenges", darts, points);

    const pIds: string[] = Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [];
    const bIds: string[] = Array.isArray(config?.selectedBotIds) ? config.selectedBotIds : [];

    for (const pid of pIds) recordTrainingParticipantSession("training_challenges", pid, "player", darts, points);
    for (const bid of bIds) recordTrainingParticipantSession("training_challenges", bid, "bot", darts, points);
  }, [ended]);
return (
    <>
      <TrainingHeader onBack={onExit} 
        title="ticker_challenges"
        rules={
          <>
            <p>{challenge.title}</p>
            <p>{challenge.description}</p>
          </>
        }
      />

      <ScoreInputHub
        onThrow={(t, hit, score) => onThrow(t, hit, score)}
      />

      <TrainingFooter stats={stats} />

      <TrainingResultModal
        open={ended}
        stats={stats}
        success={engine.state.success === true}
        onClose={onExit}
      />
    </>
  );
}
