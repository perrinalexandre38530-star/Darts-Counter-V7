import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import {
  makeTrainingStats,
  trainingDartMatches,
  type TrainingDart,
} from "../../lib/trainingDarts";
import { recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";

const ALL_DOUBLES = Array.from({ length: 20 }, (_, index) => `D${index + 1}`);
const CHECKOUT_DOUBLES = [
  "D20",
  "D16",
  "D18",
  "D12",
  "D10",
  "D8",
  "D6",
  "D4",
  "D2",
  "DBULL",
  "D14",
  "D15",
  "D7",
  "D9",
  "D5",
];

function targetFor(mode: string, round: number, phase: "IN" | "OUT") {
  if (mode === "DI" || phase === "IN") {
    return ALL_DOUBLES[round % ALL_DOUBLES.length];
  }
  return CHECKOUT_DOUBLES[round % CHECKOUT_DOUBLES.length];
}

export default function DoubleInOutPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const mode = ["DI", "DO", "DIDO"].includes(String(config?.mode || "").toUpperCase())
    ? String(config.mode).toUpperCase()
    : "DO";
  const rounds = Math.max(1, Math.floor(Number(config?.rounds || 20)));
  const totalObjectives = mode === "DIDO" ? rounds * 2 : rounds;
  const initialPhase: "IN" | "OUT" = mode === "DO" ? "OUT" : "IN";

  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const dataRef = React.useRef({
    darts: 0,
    points: 0,
    objectivesDone: 0,
    objectivesHit: 0,
    round: 0,
    phase: initialPhase,
    streak: 0,
    bestStreak: 0,
  });
  const [, rerender] = React.useReducer((value) => value + 1, 0);
  const [result, setResult] = React.useState<any>(null);

  const finish = React.useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;

    const endedAt = Date.now();
    const data = dataRef.current;
    const objectiveRate = totalObjectives > 0 ? (data.objectivesHit / totalObjectives) * 100 : 0;
    const accuracyPct = data.darts > 0 ? (data.objectivesHit / data.darts) * 100 : 0;
    const success = objectiveRate >= 50;
    const stats = makeTrainingStats({
      darts: data.darts,
      hits: data.objectivesHit,
      points: data.points,
      startedAt: startedAtRef.current,
      endedAt,
    });
    const metrics = {
      mode,
      rounds,
      totalObjectives,
      objectivesHit: data.objectivesHit,
      objectiveRate,
      accuracyPct,
      bestStreak: data.bestStreak,
      score: objectiveRate,
    };

    recordSoloTrainingResult({
      modeId: "training_doubleio",
      config,
      participantIds: config?.selectedPlayerIds,
      startedAt: startedAtRef.current,
      endedAt,
      darts: data.darts,
      hits: data.objectivesHit,
      points: data.points,
      success,
      metrics: { ...metrics, accuracyPercent: accuracyPct },
    });
    setResult({ success, stats, metrics });
  }, [config, mode, rounds, totalObjectives]);

  const advanceObjective = React.useCallback(
    (hit: boolean) => {
      const data = dataRef.current;
      data.objectivesDone += 1;
      if (hit) {
        data.objectivesHit += 1;
        data.streak += 1;
        data.bestStreak = Math.max(data.bestStreak, data.streak);
      } else {
        data.streak = 0;
      }

      if (mode === "DIDO") {
        if (data.phase === "IN") {
          data.phase = "OUT";
        } else {
          data.phase = "IN";
          data.round += 1;
        }
      } else {
        data.round += 1;
      }

      rerender();
      if (data.objectivesDone >= totalObjectives) finish();
    },
    [finish, mode, totalObjectives]
  );

  const onVisit = React.useCallback(
    (darts: TrainingDart[]) => {
      if (endedRef.current || !darts.length) return;
      const data = dataRef.current;
      const target = targetFor(mode, data.round, data.phase);
      let hit = false;

      for (const dart of darts.slice(0, 3)) {
        if (hit) break;
        data.darts += 1;
        data.points += dart.score;
        if (trainingDartMatches(dart, target)) hit = true;
      }

      advanceObjective(hit);
    },
    [advanceObjective, mode]
  );

  const data = dataRef.current;
  const target = targetFor(mode, data.round, data.phase);
  const liveObjectiveRate =
    data.objectivesDone > 0 ? (data.objectivesHit / data.objectivesDone) * 100 : 0;
  const phaseLabel =
    mode === "DIDO" ? (data.phase === "IN" ? "DOUBLE IN" : "DOUBLE OUT") : mode === "DI" ? "DOUBLE IN" : "DOUBLE OUT";

  return (
    <>
      <TrainingPlayLayout
        title="Double In / Double Out"
        tickerId="training_doubleio"
        onExit={onExit}
        participant={config?.activeParticipant}
        participantIndex={Number(config?.activeParticipantIndex || 0) + 1}
        participantTotal={Number(config?.activeParticipantTotal || 1)}
        rules={
          <>
            <p>Tu as jusqu'à trois fléchettes pour toucher le double affiché.</p>
            <p>Une fois la volée validée, l'objectif suivant apparaît. Seul le double exact compte comme réussite.</p>
          </>
        }
        eyebrow={phaseLabel}
        target={target}
        targetHint={`Round ${Math.min(rounds, data.round + 1)} / ${rounds} • ${data.objectivesDone}/${totalObjectives} objectifs joués`}
        progress={{ value: data.objectivesDone, max: totalObjectives, label: "OBJECTIFS" }}
        kpis={[
          { label: "RÉUSSITE", value: `${Math.round(liveObjectiveRate)}%` },
          { label: "TOUCHÉS", value: `${data.objectivesHit}/${data.objectivesDone}` },
          { label: "SÉRIE", value: data.streak },
          { label: "BEST", value: data.bestStreak },
        ]}
      >
        <TrainingDartPad
          disabled={!!result}
          onVisit={onVisit}
          notice={
            <div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.68 }}>
              Sélectionne DOUBLE puis le numéro exact. Pour DBULL : DOUBLE puis BULL.
            </div>
          }
        />
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title="Session Doubles terminée"
        stats={
          result?.stats ||
          makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })
        }
        metrics={
          result
            ? [
                { label: "OBJECTIFS TOUCHÉS", value: `${result.metrics.objectivesHit}/${result.metrics.totalObjectives}` },
                { label: "TAUX OBJECTIFS", value: `${Math.round(result.metrics.objectiveRate)}%` },
                { label: "PRÉCISION / DART", value: `${Math.round(result.metrics.accuracyPct)}%` },
                { label: "MEILLEURE SÉRIE", value: result.metrics.bestStreak },
              ]
            : []
        }
        onClose={onExit}
      />
    </>
  );
}
