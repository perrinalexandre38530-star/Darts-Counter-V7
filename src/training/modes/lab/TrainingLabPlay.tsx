import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { appendTrainingVisit, recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";
import { getTrainingExercise } from "../../catalog/trainingExerciseCatalog";
import { isDoubleDart, makeTrainingStats, trainingDartMatches, type TrainingDart } from "../../lib/trainingDarts";

type RunState = { darts: number; hits: number; points: number; progress: number; checkoutTotal: number };
const emptyRun = (): RunState => ({ darts: 0, hits: 0, points: 0, progress: 0, checkoutTotal: 0 });

export default function TrainingLabPlay({ config, onExit }: { config: any; onExit: () => void }) {
  const programIds = React.useMemo(() => {
    const ids = Array.isArray(config?.programExerciseIds) ? config.programExerciseIds.map(String).filter(Boolean) : [];
    return ids.length ? ids : [String(config?.exerciseId || "")].filter(Boolean);
  }, [config?.exerciseId, config?.programExerciseIds]);
  const [stepIndex, setStepIndex] = React.useState(0);
  const exercise = React.useMemo(() => getTrainingExercise(programIds[Math.min(stepIndex, programIds.length - 1)] || config?.exerciseId), [config?.exerciseId, programIds, stepIndex]);
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const visitHistoryRef = React.useRef<any[]>([]);
  const stateRef = React.useRef<RunState>(emptyRun());
  const [, force] = React.useReducer((n) => n + 1, 0);
  const [result, setResult] = React.useState<any>(null);

  const isProgram = programIds.length > 1;
  const totalSteps = programIds.length;
  const sequence = exercise.sequence || [];
  const goal = exercise.engine === "target_hits" ? Math.max(1, exercise.hitsGoal || 1) : exercise.engine === "sequence" ? Math.max(1, sequence.length) : exercise.engine === "score_darts" ? Math.max(1, exercise.scoreGoal || 1) : Math.max(1, exercise.checkoutScore || 1);

  const resetForNextExercise = React.useCallback(() => {
    stateRef.current = emptyRun();
    visitHistoryRef.current = [];
    startedAtRef.current = Date.now();
    endedRef.current = false;
    setResult(null);
    force();
  }, []);

  const finish = React.useCallback((success: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const endedAt = Date.now();
    const s = stateRef.current;
    const completionPct = exercise.engine === "score_darts" ? Math.min(100, (s.points / goal) * 100) : exercise.engine === "checkout" ? (success ? 100 : Math.min(99, (s.checkoutTotal / goal) * 100)) : Math.min(100, (s.progress / goal) * 100);
    const accuracyPct = s.darts ? (s.hits / s.darts) * 100 : 0;
    const performanceScore = Math.round(completionPct * .65 + accuracyPct * .35);
    const metrics = {
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
      family: exercise.family,
      difficulty: exercise.difficulty,
      completionPct,
      accuracyPct,
      performanceScore,
      score: performanceScore,
      goal,
      maxDarts: exercise.maxDarts,
      programId: isProgram ? String(config?.programId || "program") : null,
      programTitle: isProgram ? String(config?.programTitle || "Programme") : null,
      programStep: stepIndex + 1,
      programSteps: totalSteps,
    };
    recordSoloTrainingResult({
      modeId: "training_lab",
      config: { ...config, exerciseId: exercise.id, family: exercise.family, programStep: stepIndex + 1 },
      participantIds: config?.selectedPlayerIds,
      startedAt: startedAtRef.current,
      endedAt,
      darts: s.darts,
      hits: s.hits,
      points: s.points,
      success,
      metrics,
      visitHistory: visitHistoryRef.current,
    });
    setResult({ success, metrics, stats: makeTrainingStats({ darts: s.darts, hits: s.hits, points: s.points, startedAt: startedAtRef.current, endedAt }) });
  }, [config, exercise, goal, isProgram, stepIndex, totalSteps]);

  const onVisit = React.useCallback((rawVisit: TrainingDart[]) => {
    if (endedRef.current || !rawVisit.length) return;
    const s = stateRef.current;
    const allowed = Math.max(0, exercise.maxDarts - s.darts);
    const visit = rawVisit.slice(0, allowed);
    if (!visit.length) return;
    appendTrainingVisit(visitHistoryRef.current, visit, { roundIndex: visitHistoryRef.current.length, exerciseId: exercise.id, programStep: stepIndex + 1 });

    for (const dart of visit) {
      if (endedRef.current) break;
      s.darts += 1;
      s.points += dart.score;

      if (exercise.engine === "target_hits") {
        if (trainingDartMatches(dart, exercise.target)) { s.hits += 1; s.progress += 1; }
        if (s.progress >= goal) { force(); finish(true); return; }
      } else if (exercise.engine === "sequence") {
        const expected = sequence[s.progress];
        if (expected && trainingDartMatches(dart, expected)) { s.hits += 1; s.progress += 1; }
        if (s.progress >= goal) { force(); finish(true); return; }
      } else if (exercise.engine === "score_darts") {
        if (!dart.miss) s.hits += 1;
        if (s.points >= goal) { s.progress = goal; force(); finish(true); return; }
      } else if (exercise.engine === "checkout") {
        s.checkoutTotal += dart.score;
        if (!dart.miss) s.hits += 1;
        if (s.checkoutTotal === goal && isDoubleDart(dart)) { s.progress = goal; force(); finish(true); return; }
        if (s.checkoutTotal >= goal) { force(); finish(false); return; }
      }

      if (s.darts >= exercise.maxDarts) { force(); finish(false); return; }
    }
    force();
  }, [exercise, finish, goal, sequence, stepIndex]);

  const closeResult = React.useCallback(() => {
    if (isProgram && stepIndex + 1 < totalSteps) {
      setStepIndex((index) => index + 1);
      resetForNextExercise();
      return;
    }
    onExit();
  }, [isProgram, onExit, resetForNextExercise, stepIndex, totalSteps]);

  const s = stateRef.current;
  const target = exercise.engine === "target_hits" ? exercise.target || "—" : exercise.engine === "sequence" ? sequence[Math.min(s.progress, Math.max(0, sequence.length - 1))] || "—" : exercise.engine === "checkout" ? String(Math.max(0, goal - s.checkoutTotal)) : String(Math.max(0, goal - s.points));
  const progressValue = exercise.engine === "score_darts" ? Math.min(s.points, goal) : exercise.engine === "checkout" ? Math.min(s.checkoutTotal, goal) : Math.min(s.progress, goal);
  const title = isProgram ? String(config?.programTitle || "Programme Training") : "Centre d'entraînement";

  return <>
    <TrainingPlayLayout
      title={title}
      tickerId="training_challenges"
      onExit={onExit}
      participant={config?.activeParticipant}
      participantIndex={Number(config?.activeParticipantIndex || 0) + 1}
      participantTotal={Number(config?.activeParticipantTotal || 1)}
      rules={<><p><b>{exercise.title}</b></p><p>{exercise.subtitle}</p>{isProgram && <p>Étape {stepIndex + 1} sur {totalSteps} du programme {config?.programTitle || "Training"}.</p>}</>}
      eyebrow={isProgram ? `ÉTAPE ${stepIndex + 1}/${totalSteps} • ${exercise.title}` : exercise.title}
      target={target}
      targetHint={`${s.darts} / ${exercise.maxDarts} fléchettes utilisées${isProgram ? ` • programme ${stepIndex + 1}/${totalSteps}` : ""}`}
      progress={{ value: progressValue, max: goal, label: exercise.family.toUpperCase() }}
      kpis={[
        { label: "DARTS", value: `${s.darts}/${exercise.maxDarts}` },
        { label: "VALIDÉS", value: s.hits },
        { label: "POINTS", value: s.points },
        { label: isProgram ? "ÉTAPE" : "RESTE", value: isProgram ? `${stepIndex + 1}/${totalSteps}` : Math.max(0, exercise.maxDarts - s.darts) },
      ]}
    >
      <TrainingDartPad disabled={!!result} onVisit={onVisit} notice={<div style={{ fontSize: 10.5, textAlign: "center", opacity: .68 }}>{isProgram ? "Chaque étape est enregistrée séparément pour affiner le diagnostic Awena." : "Chaque volée est enregistrée avec sa télémétrie exacte pour alimenter Diagnostic et Progression."}</div>} />
    </TrainingPlayLayout>
    <TrainingResultModal
      open={!!result}
      success={!!result?.success}
      title={isProgram ? `${result?.success ? "Étape réussie" : "Étape terminée"} — ${stepIndex + 1}/${totalSteps}` : result?.success ? "Exercice réussi" : "Objectif non atteint"}
      stats={result?.stats || makeTrainingStats({ darts: 0, hits: 0, points: 0, startedAt: Date.now() })}
      metrics={result ? [
        { label: "EXERCICE", value: exercise.title },
        { label: "PROGRESSION", value: `${Math.round(result.metrics.completionPct)}%` },
        { label: "PRÉCISION", value: `${Math.round(result.metrics.accuracyPct)}%` },
        { label: "PERFORMANCE", value: `${result.metrics.performanceScore}/100` },
      ] : []}
      onClose={closeResult}
    />
  </>;
}
