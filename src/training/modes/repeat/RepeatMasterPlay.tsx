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

export default function RepeatMasterPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const target = String(config?.target || "T20").toUpperCase();
  const goal = Math.max(1, Math.floor(Number(config?.goal || 10)));
  const hardcore = !!config?.hardcore;
  const maxDarts = Math.max(goal, Math.floor(Number(config?.maxDarts || 60)));

  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const dataRef = React.useRef({
    darts: 0,
    hits: 0,
    points: 0,
    streak: 0,
    bestStreak: 0,
    resets: 0,
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
      const completionPct = Math.min(100, (data.bestStreak / goal) * 100);
      const stats = makeTrainingStats({
        darts: data.darts,
        hits: data.hits,
        points: data.points,
        startedAt: startedAtRef.current,
        endedAt,
      });
      const metrics = {
        target,
        goal,
        hardcore,
        maxDarts,
        bestStreak: data.bestStreak,
        resets: data.resets,
        accuracyPct,
        completionPct,
        score: completionPct,
      };

      recordSoloTrainingResult({
        modeId: "training_repeat_master",
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
    [config, goal, hardcore, maxDarts, target]
  );

  const onVisit = React.useCallback(
    (darts: TrainingDart[]) => {
      if (endedRef.current || !darts.length) return;
      const data = dataRef.current;

      for (const dart of darts) {
        if (endedRef.current || data.darts >= maxDarts) break;
        data.darts += 1;
        data.points += dart.score;

        if (trainingDartMatches(dart, target)) {
          data.hits += 1;
          data.streak += 1;
          data.bestStreak = Math.max(data.bestStreak, data.streak);
          if (data.streak >= goal) {
            rerender();
            finish(true);
            return;
          }
        } else {
          if (data.streak > 0 || hardcore) data.resets += 1;
          data.streak = 0;
          if (hardcore) {
            rerender();
            finish(false);
            return;
          }
        }

        if (data.darts >= maxDarts) {
          rerender();
          finish(false);
          return;
        }
      }

      rerender();
    },
    [finish, goal, hardcore, maxDarts, target]
  );

  const data = dataRef.current;
  const accuracy = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;

  return (
    <>
      <TrainingPlayLayout
        title="Repeat Master"
        tickerId="training_repeat_master"
        onExit={onExit}
        rules={
          <>
            <p>Répète <b>{target}</b> jusqu'à obtenir {goal} touches consécutives.</p>
            <p>{hardcore ? "HARDCORE : la première erreur termine la session." : "SOFT : une erreur remet seulement la série en cours à zéro."}</p>
            <p>Limite : {maxDarts} fléchettes.</p>
          </>
        }
        eyebrow="CIBLE UNIQUE"
        target={target}
        targetHint={`${hardcore ? "HARDCORE" : "SOFT"} • objectif ${goal} consécutifs`}
        progress={{ value: data.streak, max: goal, label: "SÉRIE EN COURS" }}
        kpis={[
          { label: "SÉRIE", value: data.streak },
          { label: "BEST", value: data.bestStreak },
          { label: "PRÉCISION", value: `${Math.round(accuracy)}%` },
          { label: "DARTS", value: `${data.darts}/${maxDarts}` },
        ]}
      >
        <TrainingDartPad
          disabled={!!result}
          onVisit={onVisit}
          notice={
            <div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.68 }}>
              Seule la zone exacte {target} prolonge la série.
            </div>
          }
        />
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title={result?.success ? "Série maîtrisée" : "Série interrompue"}
        stats={
          result?.stats ||
          makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })
        }
        metrics={
          result
            ? [
                { label: "MEILLEURE SÉRIE", value: `${result.metrics.bestStreak}/${result.metrics.goal}` },
                { label: "PRÉCISION", value: `${Math.round(result.metrics.accuracyPct)}%` },
                { label: "RESETS", value: result.metrics.resets },
                { label: "MODE", value: result.metrics.hardcore ? "HARDCORE" : "SOFT" },
              ]
            : []
        }
        onClose={onExit}
      />
    </>
  );
}
