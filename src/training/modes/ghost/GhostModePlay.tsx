import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import {
  calcAvg3,
  countNonMisses,
  makeTrainingStats,
  visitScore,
  type TrainingDart,
} from "../../lib/trainingDarts";
import { recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";

export default function GhostModePlay({ config, onExit }: { config: any; onExit: () => void }) {
  const ghostAvg = Math.max(1, Number(config?.avg || 60));
  const maxVisits = Math.max(1, Math.floor(Number(config?.visits || 10)));
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const dataRef = React.useRef({
    darts: 0,
    hits: 0,
    points: 0,
    visits: [] as number[],
  });
  const [, rerender] = React.useReducer((value) => value + 1, 0);
  const [result, setResult] = React.useState<any>(null);

  const finish = React.useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    const endedAt = Date.now();
    const data = dataRef.current;
    const avg3 = calcAvg3(data.points, data.darts);
    const bestVisit = data.visits.length ? Math.max(...data.visits) : 0;
    const ghostScore = ghostAvg * data.visits.length;
    const delta = data.points - ghostScore;
    const success = avg3 >= ghostAvg;
    const accuracyPct = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;
    const stats = makeTrainingStats({
      darts: data.darts,
      hits: data.hits,
      points: data.points,
      startedAt: startedAtRef.current,
      endedAt,
    });
    const metrics = {
      ghostAvg,
      avg3,
      bestVisit,
      visits: data.visits.length,
      ghostScore,
      playerScore: data.points,
      delta,
      accuracyPct,
      score: avg3,
    };

    recordSoloTrainingResult({
      modeId: "training_ghost",
      config,
      participantIds: config?.selectedPlayerIds,
      startedAt: startedAtRef.current,
      endedAt,
      darts: data.darts,
      hits: data.hits,
      points: data.points,
      success,
      metrics: { ...metrics, accuracyPercent: accuracyPct },
    });
    setResult({ success, stats, metrics });
  }, [config, ghostAvg]);

  const onVisit = React.useCallback(
    (darts: TrainingDart[]) => {
      if (endedRef.current || darts.length !== 3) return;
      const data = dataRef.current;
      data.darts += darts.length;
      data.hits += countNonMisses(darts);
      const score = visitScore(darts);
      data.points += score;
      data.visits.push(score);
      rerender();

      if (data.visits.length >= maxVisits) finish();
    },
    [finish, maxVisits]
  );

  const data = dataRef.current;
  const completedVisits = data.visits.length;
  const avg3 = calcAvg3(data.points, data.darts);
  const ghostScore = ghostAvg * completedVisits;
  const delta = data.points - ghostScore;
  const bestVisit = completedVisits ? Math.max(...data.visits) : 0;

  return (
    <>
      <TrainingPlayLayout
        title="Ghost Mode"
        tickerId="training_ghost"
        onExit={onExit}
        rules={
          <>
            <p>Joue {maxVisits} volées complètes de trois fléchettes.</p>
            <p>Le Ghost marque virtuellement {ghostAvg} points par volée. Termine avec une moyenne /3 au moins égale à {ghostAvg}.</p>
          </>
        }
        eyebrow={`GHOST ${ghostAvg}`}
        target={`${delta >= 0 ? "+" : ""}${Math.round(delta)} pts`}
        targetHint={`Toi ${data.points} • Ghost ${Math.round(ghostScore)} • volée ${Math.min(maxVisits, completedVisits + 1)}/${maxVisits}`}
        progress={{ value: completedVisits, max: maxVisits, label: "VOLÉES" }}
        kpis={[
          { label: "MOY./3", value: avg3.toFixed(1) },
          { label: "GHOST", value: ghostAvg.toFixed(0) },
          { label: "BEST", value: bestVisit },
          { label: "SCORE", value: data.points },
        ]}
      >
        <TrainingDartPad
          disabled={!!result}
          onVisit={onVisit}
          requireFullVisit
          notice={
            <div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.68 }}>
              Chaque volée doit contenir exactement 3 fléchettes avant validation.
            </div>
          }
        />
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title={result?.success ? "Ghost battu" : "Ghost devant"}
        stats={
          result?.stats ||
          makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })
        }
        metrics={
          result
            ? [
                { label: "MOYENNE /3", value: result.metrics.avg3.toFixed(1) },
                { label: "GHOST /3", value: result.metrics.ghostAvg.toFixed(0) },
                { label: "ÉCART FINAL", value: `${result.metrics.delta >= 0 ? "+" : ""}${Math.round(result.metrics.delta)} pts` },
                { label: "MEILLEURE VOLÉE", value: result.metrics.bestVisit },
              ]
            : []
        }
        onClose={onExit}
      />
    </>
  );
}
