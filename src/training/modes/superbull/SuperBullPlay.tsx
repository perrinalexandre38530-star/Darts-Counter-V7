import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { makeTrainingStats, type TrainingDart } from "../../lib/trainingDarts";
import { recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";

export default function SuperBullPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const target = Math.max(25, Math.floor(Number(config?.target || 100)));
  const maxDarts = Math.max(3, Math.floor(Number(config?.maxDarts || 30)));
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const dataRef = React.useRef({
    darts: 0,
    hits: 0,
    points: 0,
    bulls: 0,
    dbulls: 0,
    streak: 0,
    bestStreak: 0,
  });
  const [, rerender] = React.useReducer((value) => value + 1, 0);
  const [result, setResult] = React.useState<any>(null);

  const finish = React.useCallback(
    (success: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const endedAt = Date.now();
      const data = dataRef.current;
      const accuracyPct = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;
      const completionPct = Math.min(100, (data.points / target) * 100);
      const stats = makeTrainingStats({
        darts: data.darts,
        hits: data.hits,
        points: data.points,
        startedAt: startedAtRef.current,
        endedAt,
      });
      const metrics = {
        target,
        maxDarts,
        bulls: data.bulls,
        dbulls: data.dbulls,
        bestStreak: data.bestStreak,
        accuracyPct,
        completionPct,
        score: completionPct,
      };

      recordSoloTrainingResult({
        modeId: "training_super_bull",
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
    },
    [config, maxDarts, target]
  );

  const onVisit = React.useCallback(
    (darts: TrainingDart[]) => {
      if (endedRef.current || !darts.length) return;
      const data = dataRef.current;

      for (const dart of darts) {
        if (endedRef.current || data.darts >= maxDarts) break;
        data.darts += 1;

        if (dart.bull || dart.dbull) {
          data.hits += 1;
          data.points += dart.dbull ? 50 : 25;
          if (dart.dbull) data.dbulls += 1;
          else data.bulls += 1;
          data.streak += 1;
          data.bestStreak = Math.max(data.bestStreak, data.streak);
        } else {
          data.streak = 0;
        }

        if (data.points >= target) {
          rerender();
          finish(true);
          return;
        }
        if (data.darts >= maxDarts) {
          rerender();
          finish(false);
          return;
        }
      }

      rerender();
    },
    [finish, maxDarts, target]
  );

  const data = dataRef.current;
  const accuracy = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;

  return (
    <>
      <TrainingPlayLayout
        title="Super Bull"
        tickerId="training_super_bull"
        onExit={onExit}
        rules={
          <>
            <p>BULL = 25 points, DBULL = 50 points. Toute autre zone vaut 0 dans ce drill.</p>
            <p>Atteins {target} points avant la limite de {maxDarts} fléchettes.</p>
          </>
        }
        eyebrow="CENTRE DE CIBLE"
        target={`${data.points} / ${target}`}
        targetHint="BULL 25 • DBULL 50 • autre zone = raté Training"
        progress={{ value: data.points, max: target, label: "POINTS BULL" }}
        kpis={[
          { label: "BULL", value: data.bulls },
          { label: "DBULL", value: data.dbulls },
          { label: "PRÉCISION", value: `${Math.round(accuracy)}%` },
          { label: "DARTS", value: `${data.darts}/${maxDarts}` },
        ]}
      >
        <TrainingDartPad
          disabled={!!result}
          onVisit={onVisit}
          notice={
            <div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.68 }}>
              Pour saisir DBULL : sélectionne DOUBLE puis BULL.
            </div>
          }
        />
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title={result?.success ? "Objectif Bull atteint" : "Limite atteinte"}
        stats={
          result?.stats ||
          makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })
        }
        metrics={
          result
            ? [
                { label: "BULL", value: result.metrics.bulls },
                { label: "DBULL", value: result.metrics.dbulls },
                { label: "PRÉCISION CENTRE", value: `${Math.round(result.metrics.accuracyPct)}%` },
                { label: "MEILLEURE SÉRIE", value: result.metrics.bestStreak },
              ]
            : []
        }
        onClose={onExit}
      />
    </>
  );
}
