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

const FALLBACK_TARGETS = ["T20", "T19", "D18", "T17", "D16", "DBULL"];

export default function PrecisionGauntletPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const targets = (Array.isArray(config?.targets) && config.targets.length
    ? config.targets
    : FALLBACK_TARGETS
  ).map(String);
  const mistakesAllowed = Math.max(0, Math.floor(Number(config?.mistakesAllowed ?? 3)));

  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const dataRef = React.useRef({
    darts: 0,
    hits: 0,
    points: 0,
    targetIndex: 0,
    mistakes: 0,
    currentStreak: 0,
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
      const completionPct = targets.length > 0 ? (data.targetIndex / targets.length) * 100 : 0;
      const stats = makeTrainingStats({
        darts: data.darts,
        hits: data.hits,
        points: data.points,
        startedAt: startedAtRef.current,
        endedAt,
      });
      const metrics = {
        preset: String(config?.preset || "custom"),
        targetsTotal: targets.length,
        targetsCompleted: data.targetIndex,
        mistakes: data.mistakes,
        mistakesAllowed,
        bestStreak: data.bestStreak,
        accuracyPct,
        completionPct,
        dartsPerTarget: data.targetIndex > 0 ? data.darts / data.targetIndex : 0,
        score: success ? 100 : completionPct,
      };

      recordSoloTrainingResult({
        modeId: "training_precision_gauntlet",
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
    [config, mistakesAllowed, targets.length]
  );

  const onVisit = React.useCallback(
    (darts: TrainingDart[]) => {
      if (endedRef.current || !darts.length) return;
      const data = dataRef.current;

      for (const dart of darts) {
        if (endedRef.current || data.targetIndex >= targets.length) break;
        const expected = targets[data.targetIndex];
        data.darts += 1;
        data.points += dart.score;

        if (trainingDartMatches(dart, expected)) {
          data.hits += 1;
          data.targetIndex += 1;
          data.currentStreak += 1;
          data.bestStreak = Math.max(data.bestStreak, data.currentStreak);

          if (data.targetIndex >= targets.length) {
            rerender();
            finish(true);
            return;
          }
        } else {
          data.mistakes += 1;
          data.currentStreak = 0;
          if (data.mistakes > mistakesAllowed) {
            rerender();
            finish(false);
            return;
          }
        }
      }

      rerender();
    },
    [finish, mistakesAllowed, targets]
  );

  const data = dataRef.current;
  const currentTarget = targets[Math.min(data.targetIndex, Math.max(0, targets.length - 1))] || "—";
  const accuracy = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;

  return (
    <>
      <TrainingPlayLayout
        title="Precision Gauntlet"
        tickerId="training_precision_gauntlet"
        onExit={onExit}
        participant={config?.activeParticipant}
        participantIndex={Number(config?.activeParticipantIndex || 0) + 1}
        participantTotal={Number(config?.activeParticipantTotal || 1)}
        rules={
          <>
            <p>Touche la cible exacte affichée pour avancer au prochain obstacle.</p>
            <p>Tu peux commettre {mistakesAllowed} erreur{mistakesAllowed > 1 ? "s" : ""}. La suivante termine le parcours.</p>
          </>
        }
        eyebrow={`CIBLE ${Math.min(data.targetIndex + 1, targets.length)} / ${targets.length}`}
        target={currentTarget}
        targetHint={`Erreurs ${data.mistakes}/${mistakesAllowed} • zone exacte obligatoire`}
        progress={{ value: data.targetIndex, max: targets.length, label: "PARCOURS" }}
        kpis={[
          { label: "VALIDÉS", value: `${data.targetIndex}/${targets.length}` },
          { label: "PRÉCISION", value: `${Math.round(accuracy)}%` },
          { label: "ERREURS", value: data.mistakes },
          { label: "DARTS", value: data.darts },
        ]}
      >
        <TrainingDartPad
          disabled={!!result}
          onVisit={onVisit}
          notice={
            <div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.68 }}>
              Le numéro et le multiplicateur doivent correspondre exactement à la cible affichée.
            </div>
          }
        />
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title={result?.success ? "Gauntlet terminé" : "Parcours interrompu"}
        stats={
          result?.stats ||
          makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })
        }
        metrics={
          result
            ? [
                { label: "CIBLES VALIDÉES", value: `${result.metrics.targetsCompleted}/${result.metrics.targetsTotal}` },
                { label: "PRÉCISION", value: `${Math.round(result.metrics.accuracyPct)}%` },
                { label: "ERREURS", value: `${result.metrics.mistakes}/${result.metrics.mistakesAllowed}` },
                { label: "DARTS / CIBLE", value: result.metrics.dartsPerTarget ? result.metrics.dartsPerTarget.toFixed(2) : "—" },
              ]
            : []
        }
        onClose={onExit}
      />
    </>
  );
}
