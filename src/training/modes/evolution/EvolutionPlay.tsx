// ============================================
// TRAINING — Evolution
// Objectif : difficulté adaptative
// ============================================

import React, { useMemo, useState } from "react";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import type { TrainingTarget } from "../../engine/trainingTypes";
import ScoreInputHub from "../../../components/ScoreInputHub";

const LEVELS: TrainingTarget[][] = [
  [{ label: "20", value: 20 }],
  [{ label: "T20", value: 20, multiplier: 3 }],
  [{ label: "D20", value: 20, multiplier: 2 }],
  [{ label: "BULL", value: "BULL" }],
];
import { recordTrainingSession, recordTrainingParticipantSession } from "../../stats/trainingStatsHub";


export default function EvolutionPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const engine = useMemo(
    () =>
      new TrainingEngine({
        mode: "EVOLUTION",
      }),
    []
  );

  const [level, setLevel] = useState(0);
  const [ended, setEnded] = useState(false);

  const target = LEVELS[level][0];

  function onThrow(targetHit: TrainingTarget | null, hit: boolean, score: number) {
    if (
      hit &&
      targetHit?.value === target.value &&
      targetHit?.multiplier === target.multiplier
    ) {
      engine.throw(targetHit, hit, score);
      if (level + 1 < LEVELS.length) {
        setLevel(level + 1);
      } else {
        engine.finish(true);
        setEnded(true);
      }
    } else {
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

    recordTrainingSession("training_evolution", darts, points);

    const pIds: string[] = Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [];
    const bIds: string[] = Array.isArray(config?.selectedBotIds) ? config.selectedBotIds : [];

    for (const pid of pIds) recordTrainingParticipantSession("training_evolution", pid, "player", darts, points);
    for (const bid of bIds) recordTrainingParticipantSession("training_evolution", bid, "bot", darts, points);
  }, [ended]);
return (
    <>
      <TrainingHeader onBack={onExit} 
        title="ticker_evolution"
        rules={
          <>
            <p>La difficulté augmente à chaque réussite.</p>
            <p>Une erreur met fin à la session.</p>
          </>
        }
      />

      <div className="training-target">
        Niveau {level + 1} — Cible : {target.label}
      </div>

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
