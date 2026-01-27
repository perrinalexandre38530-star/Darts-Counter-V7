// ============================================
// TRAINING — Double In / Double Out
// Objectif : enchaîner les doubles
// ============================================

import React, { useMemo, useState } from "react";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import type { TrainingTarget } from "../../engine/trainingTypes";
import ScoreInputHub from "../../../components/ScoreInputHub";

const DOUBLES: TrainingTarget[] = Array.from({ length: 20 }).map(
  (_, i) => ({
    label: `D${i + 1}`,
    value: i + 1,
    multiplier: 2,
  })
);
import { recordTrainingSession, recordTrainingParticipantSession } from "../../stats/trainingStatsHub";


export default function DoubleInOutPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const engine = useMemo(
    () =>
      new TrainingEngine({
        mode: "DOUBLE",
      }),
    []
  );

  const [index, setIndex] = useState(0);
  const [ended, setEnded] = useState(false);

  const current = DOUBLES[index];

  function onThrow(target: TrainingTarget | null, hit: boolean, score: number) {
    if (
      hit &&
      target?.value === current.value &&
      target?.multiplier === 2
    ) {
      engine.throw(target, hit, score);
      if (index + 1 >= DOUBLES.length) {
        engine.finish(true);
        setEnded(true);
      } else {
        setIndex(index + 1);
      }
    } else {
      engine.throw(target, false, 0);
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

    recordTrainingSession("training_doubleio", darts, points);

    const pIds: string[] = Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [];
    const bIds: string[] = Array.isArray(config?.selectedBotIds) ? config.selectedBotIds : [];

    for (const pid of pIds) recordTrainingParticipantSession("training_doubleio", pid, "player", darts, points);
    for (const bid of bIds) recordTrainingParticipantSession("training_doubleio", bid, "bot", darts, points);
  }, [ended]);
return (
    <>
      <TrainingHeader onBack={onExit} 
        title="ticker_double"
        rules={
          <>
            <p>Touche chaque double dans l’ordre.</p>
            <p>Les ratés sont comptabilisés.</p>
          </>
        }
      />

      <div className="training-target">
        Double cible : {current.label}
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
