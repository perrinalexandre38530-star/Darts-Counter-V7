import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { appendTrainingVisit, recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";
import { getTrainingExercise } from "../../catalog/trainingExerciseCatalog";
import { isDoubleDart, makeTrainingStats, trainingDartMatches, type TrainingDart } from "../../lib/trainingDarts";

type RunState = { darts: number; hits: number; points: number; progress: number; checkoutTotal: number };
type ProgramStepResult = {
  exerciseId: string;
  exerciseTitle: string;
  family: string;
  success: boolean;
  darts: number;
  hits: number;
  points: number;
  completionPct: number;
  accuracyPct: number;
  performanceScore: number;
};
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
  const [programResults, setProgramResults] = React.useState<ProgramStepResult[]>([]);
  const [programSummaryOpen, setProgramSummaryOpen] = React.useState(false);

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
    const stepResult: ProgramStepResult = {
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
      family: exercise.family,
      success,
      darts: s.darts,
      hits: s.hits,
      points: s.points,
      completionPct,
      accuracyPct,
      performanceScore,
    };
    if (isProgram) {
      setProgramResults((rows) => {
        const next = rows.filter((_, index) => index !== stepIndex);
        next[stepIndex] = stepResult;
        return next;
      });
    }

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
    if (isProgram) {
      setResult(null);
      setProgramSummaryOpen(true);
      return;
    }
    onExit();
  }, [isProgram, onExit, resetForNextExercise, stepIndex, totalSteps]);

  const programSummary = React.useMemo(() => {
    const rows = programResults.filter(Boolean);
    const steps = rows.length;
    const successes = rows.filter((row) => row.success).length;
    const darts = rows.reduce((sum, row) => sum + row.darts, 0);
    const hits = rows.reduce((sum, row) => sum + row.hits, 0);
    const performance = steps ? rows.reduce((sum, row) => sum + row.performanceScore, 0) / steps : 0;
    const accuracy = darts ? (hits / darts) * 100 : 0;
    const best = rows.reduce<ProgramStepResult | null>((winner, row) => !winner || row.performanceScore > winner.performanceScore ? row : winner, null);
    return { rows, steps, successes, darts, accuracy, performance, best };
  }, [programResults]);

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

    {programSummaryOpen && <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.82)", backdropFilter: "blur(8px)" }}>
      <div style={{ width: "min(680px,100%)", maxHeight: "90vh", overflowY: "auto", borderRadius: 20, border: "1px solid rgba(39,220,255,.34)", background: "linear-gradient(155deg,rgba(15,22,34,.98),rgba(8,10,18,.98))", boxShadow: "0 24px 80px rgba(0,0,0,.55)", padding: 16 }}>
        <div style={{ fontSize: 9.5, color: "#27dcff", fontWeight: 950, letterSpacing: 1.2 }}>BILAN DE SÉANCE</div>
        <div style={{ marginTop: 5, fontSize: 18, fontWeight: 950 }}>{config?.programTitle || "Programme Training"}</div>
        <div style={{ marginTop: 5, fontSize: 10.5, opacity: .62 }}>Toutes les étapes ont été enregistrées séparément dans ta progression.</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginTop: 14 }}>
          {[
            ["RÉUSSIES", `${programSummary.successes}/${programSummary.steps}`],
            ["PERF.", `${Math.round(programSummary.performance)}/100`],
            ["PRÉCISION", `${Math.round(programSummary.accuracy)}%`],
            ["DARTS", programSummary.darts],
          ].map(([label, value]) => <div key={String(label)} style={{ padding: "10px 5px", borderRadius: 12, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.07)", textAlign: "center" }}><b style={{ fontSize: 13 }}>{value}</b><div style={{ marginTop: 3, fontSize: 7.5, opacity: .45 }}>{label}</div></div>)}
        </div>

        {programSummary.best && <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(39,220,255,.07)", border: "1px solid rgba(39,220,255,.16)", fontSize: 10 }}>
          <b>Meilleure étape :</b> {programSummary.best.exerciseTitle} • {programSummary.best.performanceScore}/100
        </div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          {programSummary.rows.map((row, index) => <div key={`${row.exerciseId}-${index}`} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: row.success ? "rgba(80,255,174,.13)" : "rgba(255,255,255,.06)", fontSize: 9, fontWeight: 950 }}>{index + 1}</div>
            <div><b style={{ fontSize: 9.5 }}>{row.exerciseTitle}</b><div style={{ marginTop: 2, fontSize: 7.5, opacity: .46 }}>{row.family.toUpperCase()} • {row.darts} darts</div></div>
            <div style={{ textAlign: "right" }}><b style={{ fontSize: 10 }}>{Math.round(row.accuracyPct)}%</b><div style={{ fontSize: 7, opacity: .42 }}>PRÉC.</div></div>
            <div style={{ minWidth: 38, textAlign: "right" }}><b style={{ fontSize: 11, color: row.success ? "#8cffcb" : "inherit" }}>{row.performanceScore}</b><div style={{ fontSize: 7, opacity: .42 }}>PERF.</div></div>
          </div>)}
        </div>

        <button type="button" onClick={onExit} style={{ width: "100%", marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(39,220,255,.45)", background: "linear-gradient(135deg,rgba(39,220,255,.20),rgba(140,90,255,.18))", color: "inherit", fontWeight: 950, cursor: "pointer" }}>TERMINER LA SÉANCE</button>
      </div>
    </div>}
  </>;
}
