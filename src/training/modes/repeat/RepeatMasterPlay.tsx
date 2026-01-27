// ============================================
// TRAINING — Repeat Master
// Objectif : répéter la même cible le plus longtemps possible
// ============================================

import React, { useMemo, useState } from "react";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import type { TrainingTarget } from "../../engine/trainingTypes";
import ScoreInputHub from "../../../components/ScoreInputHub";

const TARGET: TrainingTarget = {
  label: "T20",
  value: 20,
  multiplier: 3,
};
import { recordTrainingSession, recordTrainingParticipantSession } from "../../stats/trainingStatsHub";


export default function RepeatMasterPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const engine = useMemo(
    () =>
      new TrainingEngine({
        mode: "REPEAT",
      }),
    []
  );

  const [ended, setEnded] = useState(false);

  function onThrow(target: TrainingTarget | null, hit: boolean, score: number) {
    if (!hit || target?.value !== TARGET.value || target?.multiplier !== TARGET.multiplier) {
      engine.finish(false);
      setEnded(true);
      return;
    }
    engine.throw(target, hit, score);
  }

  const stats = computeTrainingStats(engine.state);

  
  const recordedRef = React.useRef(false);
  React.useEffect(() => {
    if (!ended) return;
    if (recordedRef.current) return;
    recordedRef.current = true;

    const darts = (stats as any)?.dartsThrown ?? 0;
    const points = (stats as any)?.score ?? 0;

    recordTrainingSession("training_repeat_master", darts, points);

    const pIds: string[] = Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [];
    const bIds: string[] = Array.isArray(config?.selectedBotIds) ? config.selectedBotIds : [];

    for (const pid of pIds) recordTrainingParticipantSession("training_repeat_master", pid, "player", darts, points);
    for (const bid of bIds) recordTrainingParticipantSession("training_repeat_master", bid, "bot", darts, points);
  }, [ended]);
return (
    <>
      <TrainingHeader onBack={onExit} 
        title="ticker_repeat"
        rules={
          <>
            <p>Répète la même cible sans erreur.</p>
            <p>Une erreur met fin immédiatement à la session.</p>
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
