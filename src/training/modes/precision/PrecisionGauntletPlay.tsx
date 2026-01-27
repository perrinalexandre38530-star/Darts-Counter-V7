// ============================================
// TRAINING — Precision Gauntlet
// Objectif : suite de cibles, une erreur = fin
// ============================================

import React, { useMemo, useState } from "react";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import type { TrainingTarget } from "../../engine/trainingTypes";
import ScoreInputHub from "../../../components/ScoreInputHub";

const GAUNTLET: TrainingTarget[] = [
  { label: "20", value: 20 },
  { label: "T19", value: 19, multiplier: 3 },
  { label: "D18", value: 18, multiplier: 2 },
  { label: "BULL", value: "BULL" },
  { label: "DBULL", value: "DBULL" },
];
import { recordTrainingSession, recordTrainingParticipantSession } from "../../stats/trainingStatsHub";


export default function PrecisionGauntletPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const engine = useMemo(
    () =>
      new TrainingEngine({
        mode: "PRECISION",
      }),
    []
  );

  const [index, setIndex] = useState(0);
  const [ended, setEnded] = useState(false);

  const current = GAUNTLET[index];

  function onThrow(target: TrainingTarget | null, hit: boolean, score: number) {
    if (
      !hit ||
      !target ||
      target.value !== current.value ||
      target.multiplier !== current.multiplier
    ) {
      engine.finish(false);
      setEnded(true);
      return;
    }

    engine.throw(target, hit, score);

    if (index + 1 >= GAUNTLET.length) {
      engine.finish(true);
      setEnded(true);
    } else {
      setIndex(index + 1);
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

    recordTrainingSession("training_precision_gauntlet", darts, points);

    const pIds: string[] = Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [];
    const bIds: string[] = Array.isArray(config?.selectedBotIds) ? config.selectedBotIds : [];

    for (const pid of pIds) recordTrainingParticipantSession("training_precision_gauntlet", pid, "player", darts, points);
    for (const bid of bIds) recordTrainingParticipantSession("training_precision_gauntlet", bid, "bot", darts, points);
  }, [ended]);
return (
    <>
      <TrainingHeader onBack={onExit} 
        title="ticker_precision"
        rules={
          <>
            <p>Enchaîne les cibles imposées.</p>
            <p>Une seule erreur met fin à la session.</p>
          </>
        }
      />

      <div className="training-target">
        Cible : {current.label}
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
