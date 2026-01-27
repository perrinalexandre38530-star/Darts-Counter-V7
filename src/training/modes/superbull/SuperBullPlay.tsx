// ============================================
// TRAINING — Super Bull
// Objectif : Bull / DBull uniquement, avec streak
// ============================================

import React, { useMemo, useState } from "react";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import type { TrainingTarget } from "../../engine/trainingTypes";
import ScoreInputHub from "../../../components/ScoreInputHub";
import { recordTrainingSession, recordTrainingParticipantSession } from "../../stats/trainingStatsHub";


export default function SuperBullPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const engine = useMemo(
    () =>
      new TrainingEngine({
        mode: "SUPER_BULL",
      }),
    []
  );

  const [ended, setEnded] = useState(false);

  function onThrow(target: TrainingTarget | null, hit: boolean, score: number) {
    if (!hit || (target?.value !== "BULL" && target?.value !== "DBULL")) {
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

    recordTrainingSession("training_super_bull", darts, points);

    const pIds: string[] = Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [];
    const bIds: string[] = Array.isArray(config?.selectedBotIds) ? config.selectedBotIds : [];

    for (const pid of pIds) recordTrainingParticipantSession("training_super_bull", pid, "player", darts, points);
    for (const bid of bIds) recordTrainingParticipantSession("training_super_bull", bid, "bot", darts, points);
  }, [ended]);
return (
    <>
      <TrainingHeader onBack={onExit} 
        title="ticker_superbull"
        rules={
          <>
            <p>Seuls le Bull et le Double Bull comptent.</p>
            <p>Une flèche ailleurs termine la session.</p>
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
