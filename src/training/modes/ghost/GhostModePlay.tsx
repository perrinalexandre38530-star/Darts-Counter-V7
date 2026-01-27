// ============================================
// TRAINING — Ghost Mode
// Objectif : jouer contre une moyenne cible (ghost)
// ============================================

import React, { useMemo, useState } from "react";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import type { TrainingTarget } from "../../engine/trainingTypes";
import ScoreInputHub from "../../../components/ScoreInputHub";

const GHOST_AVG = 60;
const MAX_DARTS = 30;
import { recordTrainingSession, recordTrainingParticipantSession } from "../../stats/trainingStatsHub";


export default function GhostModePlay({ config, onExit }: { config: any; onExit: () => void }) {
  const engine = useMemo(
    () =>
      new TrainingEngine({
        mode: "GHOST",
        maxDarts: MAX_DARTS,
      }),
    []
  );

  const [ended, setEnded] = useState(false);

  function onThrow(target: TrainingTarget | null, hit: boolean, score: number) {
    engine.throw(target, hit, score);

    if (engine.state.darts.length >= MAX_DARTS) {
      const avg =
        engine.state.score / (engine.state.darts.length / 3);
      engine.finish(avg >= GHOST_AVG);
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

    recordTrainingSession("training_ghost", darts, points);

    const pIds: string[] = Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [];
    const bIds: string[] = Array.isArray(config?.selectedBotIds) ? config.selectedBotIds : [];

    for (const pid of pIds) recordTrainingParticipantSession("training_ghost", pid, "player", darts, points);
    for (const bid of bIds) recordTrainingParticipantSession("training_ghost", bid, "bot", darts, points);
  }, [ended]);
return (
    <>
      <TrainingHeader onBack={onExit} 
        title="ticker_ghost"
        rules={
          <>
            <p>Affronte un ghost à {GHOST_AVG} de moyenne.</p>
            <p>30 flèches pour faire mieux.</p>
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
