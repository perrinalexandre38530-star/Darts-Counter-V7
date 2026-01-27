// ============================================
// TRAINING — Time Attack
// Objectif : score maximum en temps limité
// ============================================

import React, { useEffect, useMemo, useState } from "react";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import type { TrainingTarget } from "../../engine/trainingTypes";
import ScoreInputHub from "../../../components/ScoreInputHub";

const TIME_LIMIT = 60_000;
import { recordTrainingSession, recordTrainingParticipantSession } from "../../stats/trainingStatsHub";


export default function TimeAttackPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const engine = useMemo(
    () =>
      new TrainingEngine({
        mode: "TIME_ATTACK",
        timeLimitMs: TIME_LIMIT,
      }),
    []
  );

  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      engine.finish(true);
      setEnded(true);
    }, TIME_LIMIT);

    
  const recordedRef = React.useRef(false);
  React.useEffect(() => {
    if (!ended) return;
    if (recordedRef.current) return;
    recordedRef.current = true;

    const darts = (stats as any)?.dartsThrown ?? 0;
    const points = (stats as any)?.score ?? 0;

    recordTrainingSession("training_time_attack", darts, points);

    const pIds: string[] = Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [];
    const bIds: string[] = Array.isArray(config?.selectedBotIds) ? config.selectedBotIds : [];

    for (const pid of pIds) recordTrainingParticipantSession("training_time_attack", pid, "player", darts, points);
    for (const bid of bIds) recordTrainingParticipantSession("training_time_attack", bid, "bot", darts, points);
  }, [ended]);
return () => clearTimeout(t);
  }, [engine]);

  function onThrow(target: TrainingTarget | null, hit: boolean, score: number) {
    engine.throw(target, hit, score);
  }

  const stats = computeTrainingStats(engine.state);

  return (
    <>
      <TrainingHeader onBack={onExit} 
        title="ticker_timeattack"
        rules={
          <>
            <p>Marque le maximum de points en 60 secondes.</p>
            <p>Aucune pénalité, vitesse et prise de risque encouragées.</p>
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
        success={true}
        onClose={onExit}
      />
    </>
  );
}
