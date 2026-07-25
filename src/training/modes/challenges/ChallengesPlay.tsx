import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import {
  countNonMisses,
  isDoubleDart,
  makeTrainingStats,
  trainingDartMatches,
  visitScore,
  type TrainingDart,
} from "../../lib/trainingDarts";
import { recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";

export default function ChallengesPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const challengeId = String(config?.challengeId || config?.id || "3_DOUBLES_9");
  const maxDarts = Math.max(1, Math.floor(Number(config?.darts || (challengeId === "CHECKOUT_40_3" ? 3 : 9))));
  const sequence = Array.isArray(config?.seq) ? config.seq.map(String) : ["BULL", "T20", "D20"];
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const dataRef = React.useRef({
    darts: 0,
    hits: 0,
    points: 0,
    doubles: 0,
    sequenceIndex: 0,
  });
  const [, rerender] = React.useReducer((value) => value + 1, 0);
  const [result, setResult] = React.useState<any>(null);

  const title =
    challengeId === "BULL_T20_D20"
      ? "BULL → T20 → D20"
      : challengeId === "CHECKOUT_40_3"
      ? "CHECKOUT 40"
      : "3 DOUBLES / 9";

  const finish = React.useCallback(
    (success: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const endedAt = Date.now();
      const data = dataRef.current;
      const accuracyPct = data.darts > 0 ? (data.hits / data.darts) * 100 : 0;
      const completion =
        challengeId === "3_DOUBLES_9"
          ? Math.min(1, data.doubles / 3)
          : challengeId === "BULL_T20_D20"
          ? Math.min(1, data.sequenceIndex / Math.max(1, sequence.length))
          : success
          ? 1
          : 0;
      const stats = makeTrainingStats({
        darts: data.darts,
        hits: data.hits,
        points: data.points,
        startedAt: startedAtRef.current,
        endedAt,
      });
      const metrics = {
        challengeId,
        title,
        maxDarts,
        doubles: data.doubles,
        sequenceCompleted: data.sequenceIndex,
        sequenceLength: sequence.length,
        accuracyPct,
        completionPct: completion * 100,
        dartsUsed: data.darts,
        score: success ? 100 : completion * 100,
      };

      recordSoloTrainingResult({
        modeId: "training_challenges",
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
    [challengeId, config, maxDarts, sequence.length, title]
  );

  const onVisit = React.useCallback(
    (visit: TrainingDart[]) => {
      if (endedRef.current || !visit.length) return;
      const data = dataRef.current;
      const remaining = Math.max(0, maxDarts - data.darts);
      const darts = visit.slice(0, remaining);
      if (!darts.length) return;

      if (challengeId === "CHECKOUT_40_3") {
        data.darts += darts.length;
        data.hits += countNonMisses(darts);
        const score = visitScore(darts);
        data.points += score;
        const last = darts[darts.length - 1];
        const success = score === 40 && isDoubleDart(last);
        rerender();
        finish(success);
        return;
      }

      for (const dart of darts) {
        if (endedRef.current) break;
        data.darts += 1;
        data.points += dart.score;

        if (challengeId === "3_DOUBLES_9") {
          if (isDoubleDart(dart)) {
            data.hits += 1;
            data.doubles += 1;
            if (data.doubles >= 3) {
              rerender();
              finish(true);
              return;
            }
          }
        } else {
          const expected = sequence[data.sequenceIndex];
          if (expected && trainingDartMatches(dart, expected)) {
            data.hits += 1;
            data.sequenceIndex += 1;
            if (data.sequenceIndex >= sequence.length) {
              rerender();
              finish(true);
              return;
            }
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
    [challengeId, finish, maxDarts, sequence]
  );

  const data = dataRef.current;
  const currentTarget =
    challengeId === "3_DOUBLES_9"
      ? "DOUBLE"
      : challengeId === "CHECKOUT_40_3"
      ? "40"
      : sequence[Math.min(data.sequenceIndex, sequence.length - 1)] || "—";
  const progressValue =
    challengeId === "3_DOUBLES_9"
      ? data.doubles
      : challengeId === "BULL_T20_D20"
      ? data.sequenceIndex
      : result?.success
      ? 1
      : 0;
  const progressMax =
    challengeId === "3_DOUBLES_9" ? 3 : challengeId === "BULL_T20_D20" ? sequence.length : 1;

  return (
    <>
      <TrainingPlayLayout
        title="Challenges"
        tickerId="training_challenges"
        onExit={onExit}
        rules={
          <>
            <p><b>{title}</b></p>
            <p>
              {challengeId === "3_DOUBLES_9"
                ? "Touche trois doubles quelconques en neuf fléchettes maximum."
                : challengeId === "BULL_T20_D20"
                ? "Valide BULL, puis T20, puis D20 dans cet ordre en douze fléchettes maximum."
                : "Fais exactement 40 en trois fléchettes maximum et termine sur un double."}
            </p>
          </>
        }
        eyebrow={title}
        target={currentTarget}
        targetHint={`${data.darts} / ${maxDarts} fléchettes utilisées`}
        progress={{ value: progressValue, max: progressMax, label: "OBJECTIF" }}
        kpis={[
          { label: "DARTS", value: `${data.darts}/${maxDarts}` },
          { label: "VALIDÉS", value: data.hits },
          { label: "POINTS", value: data.points },
          { label: "RESTE", value: Math.max(0, maxDarts - data.darts) },
        ]}
      >
        <TrainingDartPad
          disabled={!!result}
          onVisit={onVisit}
          notice={
            <div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.68 }}>
              {challengeId === "CHECKOUT_40_3"
                ? "Saisis ta tentative puis valide la volée : le défi s'arrête immédiatement."
                : "Le défi s'arrête dès que l'objectif est atteint ou la limite de fléchettes consommée."}
            </div>
          }
        />
      </TrainingPlayLayout>

      <TrainingResultModal
        open={!!result}
        success={!!result?.success}
        title={result?.success ? "Défi réussi" : "Défi manqué"}
        stats={
          result?.stats ||
          makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })
        }
        metrics={
          result
            ? [
                { label: "DÉFI", value: result.metrics.title },
                { label: "DARTS UTILISÉES", value: `${result.metrics.dartsUsed}/${result.metrics.maxDarts}` },
                { label: "PROGRESSION", value: `${Math.round(result.metrics.completionPct)}%` },
                { label: "PRÉCISION", value: `${Math.round(result.metrics.accuracyPct)}%` },
              ]
            : []
        }
        onClose={onExit}
      />
    </>
  );
}
