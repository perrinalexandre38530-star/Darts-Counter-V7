// ============================================
// TRAINING — Evolution
// Objectif : difficulté adaptative
// Exact S/D/T/BULL/DBULL/MISS telemetry is persisted for every dart.
// ============================================

import React, { useMemo, useState } from "react";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingFooter from "../../ui/TrainingFooter";
import TrainingResultModal from "../../ui/TrainingResultModal";
import TrainingScoreInput from "../../ui/TrainingScoreInput";
import { TrainingEngine } from "../../engine/trainingEngine";
import { computeTrainingStats } from "../../engine/trainingStats";
import type { TrainingTarget } from "../../engine/trainingTypes";
import { appendTrainingVisit, recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";

const LEVELS: TrainingTarget[][] = [
  [{ label: "20", value: 20 }],
  [{ label: "T20", value: 20, multiplier: 3 }],
  [{ label: "D20", value: 20, multiplier: 2 }],
  [{ label: "BULL", value: "BULL" }],
];

function exactDartFromTrainingThrow(target: TrainingTarget | null, score: number) {
  if (!target) return "MISS";
  const label = String(target.label || "").trim().toUpperCase();
  if (label) return label;
  if (target.value === "BULL") return "BULL";
  if (target.value === "DBULL") return "DBULL";
  const value = Number(target.value || 0);
  const mult = Number(target.multiplier || 1);
  if (value >= 1 && value <= 20) return `${mult === 3 ? "T" : mult === 2 ? "D" : "S"}${value}`;
  if (score === 50) return "DBULL";
  if (score === 25) return "BULL";
  return "MISS";
}

export default function EvolutionPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const engine = useMemo(() => new TrainingEngine({ mode: "EVOLUTION" }), []);
  const [level, setLevel] = useState(0);
  const [ended, setEnded] = useState(false);
  const startedAtRef = React.useRef(Date.now());
  const visitHistoryRef = React.useRef<any[]>([]);
  const recordedRef = React.useRef(false);

  const target = LEVELS[level][0];

  function onThrow(actualTarget: TrainingTarget | null, hit: boolean, score: number) {
    if (ended) return;
    appendTrainingVisit(visitHistoryRef.current, [exactDartFromTrainingThrow(actualTarget, score)], {
      roundIndex: level,
      result: target.label,
    });

    const exactTargetHit =
      hit &&
      actualTarget?.value === target.value &&
      Number(actualTarget?.multiplier || 1) === Number(target.multiplier || 1);

    engine.throw(actualTarget, exactTargetHit, score);
    if (exactTargetHit) {
      if (level + 1 < LEVELS.length) setLevel((value) => value + 1);
      else {
        engine.finish(true);
        setEnded(true);
      }
    } else {
      engine.finish(false);
      setEnded(true);
    }
  }

  const stats = computeTrainingStats(engine.state);

  React.useEffect(() => {
    if (!ended || recordedRef.current) return;
    recordedRef.current = true;
    const endedAt = Number(engine.state.endedAt || Date.now()) || Date.now();
    recordSoloTrainingResult({
      modeId: "training_evolution",
      config,
      participantIds: Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : [],
      startedAt: startedAtRef.current,
      endedAt,
      darts: Number(stats.dartsThrown || 0),
      hits: Number(stats.hits || 0),
      points: Number(stats.score || 0),
      success: engine.state.success === true,
      visitHistory: visitHistoryRef.current,
      metrics: {
        score: Number(stats.score || 0),
        accuracyPercent: Number(stats.accuracy || 0),
        levelReached: Math.min(LEVELS.length, level + 1),
        levelsTotal: LEVELS.length,
        durationMs: Number(stats.durationMs || 0),
      },
    });
  }, [config, ended, engine.state.endedAt, engine.state.success, level, stats]);

  return (
    <>
      <TrainingHeader
        onBack={onExit}
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

      <TrainingScoreInput
        targetLabel={target.label}
        disabled={ended}
        onThrow={onThrow}
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
