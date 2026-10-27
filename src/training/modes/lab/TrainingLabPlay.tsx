import React from "react";
import TrainingPlayLayout from "../../ui/TrainingPlayLayout";
import TrainingDartPad from "../../ui/TrainingDartPad";
import TrainingResultModal from "../../ui/TrainingResultModal";
import { appendTrainingVisit, recordSoloTrainingResult } from "../../stats/trainingSessionRecorder";
import { getTrainingExercise } from "../../catalog/trainingExerciseCatalog";
import { buildTrainingLiveAdaptation, buildTrainingLiveStepCoach, type TrainingLiveAdaptation } from "../../profile/trainingLiveCoach";
import { buildTrainingSessionReview } from "../../profile/trainingSessionReview";
import { chooseHistoryAwareNextFamily } from "../../profile/trainingSessionHistoryCoach";
import { buildTrainingCoachingEffectiveness, chooseCoachingEffectiveNextFamily } from "../../profile/trainingCoachingEffectiveness";
import { isDoubleDart, makeTrainingStats, trainingDartMatches, type TrainingDart } from "../../lib/trainingDarts";
import { clearTrainingProgramDraft, loadTrainingProgramSessions, recordTrainingProgramSession, saveTrainingProgramDraft } from "../../profile/trainingPlanTracker";
import type { TrainingExerciseFamily } from "../../catalog/trainingExerciseCatalog";
import { buildTrainingLoadSummary } from "../../profile/trainingLoadCoach";
import { buildPostSessionCoach, saveTrainingNextRecommendation } from "../../profile/trainingWeeklyCoach";
import { loadTrainingLabPreferences } from "../../preferences/trainingLabPreferences";
import { buildTrainingCareer, trainingProgramXp } from "../../profile/trainingCareer";
import { buildTrainingProgression } from "../../coach/trainingDiagnosis";
import { getTrainingDetailedSessions } from "../../stats/trainingStatsHub";

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
  const initialProgramIds = React.useMemo(() => {
    const ids = Array.isArray(config?.programExerciseIds) ? config.programExerciseIds.map(String).filter(Boolean) : [];
    return ids.length ? ids : [String(config?.exerciseId || "")].filter(Boolean);
  }, [config?.exerciseId, config?.programExerciseIds]);
  const [programIds, setProgramIds] = React.useState<string[]>(initialProgramIds);
  const initialStepIndex = Math.max(0, Math.min(programIds.length - 1, Number(config?.resumeStepIndex) || 0));
  const [stepIndex, setStepIndex] = React.useState(initialStepIndex);
  const exercise = React.useMemo(() => getTrainingExercise(programIds[Math.min(stepIndex, programIds.length - 1)] || config?.exerciseId), [config?.exerciseId, programIds, stepIndex]);
  const startedAtRef = React.useRef(Date.now());
  const endedRef = React.useRef(false);
  const visitHistoryRef = React.useRef<any[]>([]);
  const stateRef = React.useRef<RunState>(emptyRun());
  const [, force] = React.useReducer((n) => n + 1, 0);
  const [result, setResult] = React.useState<any>(null);
  const [programResults, setProgramResults] = React.useState<ProgramStepResult[]>(() => Array.isArray(config?.resumeProgramResults) ? config.resumeProgramResults : []);
  const [programSummaryOpen, setProgramSummaryOpen] = React.useState(false);
  const [programRecordMessage, setProgramRecordMessage] = React.useState<string | null>(null);
  const [postSessionCoach, setPostSessionCoach] = React.useState<ReturnType<typeof buildPostSessionCoach> | null>(null);
  const [careerMessage, setCareerMessage] = React.useState<{ xp: number; text: string } | null>(null);
  const [liveAdaptation, setLiveAdaptation] = React.useState<TrainingLiveAdaptation | null>(null);
  const programTrackedRef = React.useRef(false);
  const plannedProgramIdsRef = React.useRef<string[]>(initialProgramIds.slice());

  const isProgram = programIds.length > 1;
  const totalSteps = programIds.length;
  const sequence = exercise.sequence || [];
  const liveStepCoach = React.useMemo(() => buildTrainingLiveStepCoach(exercise, stepIndex, totalSteps), [exercise, stepIndex, totalSteps]);
  const goal = exercise.engine === "target_hits" ? Math.max(1, exercise.hitsGoal || 1) : exercise.engine === "sequence" ? Math.max(1, sequence.length) : exercise.engine === "score_darts" ? Math.max(1, exercise.scoreGoal || 1) : Math.max(1, exercise.checkoutScore || 1);

  const resetForNextExercise = React.useCallback(() => {
    stateRef.current = emptyRun();
    visitHistoryRef.current = [];
    startedAtRef.current = Date.now();
    endedRef.current = false;
    setResult(null);
    setLiveAdaptation(null);
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
    const certificationMode = config?.sessionKind === "certification";
    const certificationRequiredScore = Math.max(0, Math.min(100, Math.round(Number(config?.certificationRequiredScore) || 0)));
    const certificationPassed = certificationMode ? success && performanceScore >= certificationRequiredScore : success;
    const dailyChallengeMode = config?.sessionKind === "daily_challenge";
    const dailyChallengeRequiredScore = Math.max(0, Math.min(100, Math.round(Number(config?.dailyChallengeRequiredScore) || 0)));
    const dailyChallengePassed = dailyChallengeMode ? success && performanceScore >= dailyChallengeRequiredScore : certificationPassed;
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
      certificationFamily: certificationMode ? String(config?.certificationFamily || exercise.family) : null,
      certificationTargetLevel: certificationMode ? Math.max(1, Math.min(5, Math.round(Number(config?.certificationTargetLevel) || 1))) : null,
      certificationRequiredScore: certificationMode ? certificationRequiredScore : null,
      certificationPassed: certificationMode ? certificationPassed : null,
      dailyChallengeDateKey: dailyChallengeMode ? String(config?.dailyChallengeDateKey || "") : null,
      dailyChallengeRequiredScore: dailyChallengeMode ? dailyChallengeRequiredScore : null,
      dailyChallengePassed: dailyChallengeMode ? dailyChallengePassed : null,
    };
    const stepResult: ProgramStepResult = {
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
      family: exercise.family,
      success: dailyChallengePassed,
      darts: s.darts,
      hits: s.hits,
      points: s.points,
      completionPct,
      accuracyPct,
      performanceScore,
    };
    let adaptation: TrainingLiveAdaptation | null = null;
    if (isProgram) {
      const nextId = programIds[stepIndex + 1];
      const nextExercise = nextId ? getTrainingExercise(nextId) : null;
      adaptation = buildTrainingLiveAdaptation({
        exercise,
        result: { success, performanceScore, accuracyPct, completionPct },
        stepIndex,
        totalSteps,
        nextExercise,
        usedExerciseIds: programIds.slice(0, stepIndex + 1),
        adaptive: !!config?.adaptiveDailyPlan,
      });
      setLiveAdaptation(adaptation);
      if (adaptation.replacementExerciseId && stepIndex + 1 < programIds.length) {
        setProgramIds((ids) => ids.map((id, index) => index === stepIndex + 1 ? adaptation!.replacementExerciseId! : id));
      }
    }
    if (isProgram) {
      const adaptedProgramIds = adaptation?.replacementExerciseId && stepIndex + 1 < programIds.length
        ? programIds.map((id, index) => index === stepIndex + 1 ? adaptation!.replacementExerciseId! : id)
        : programIds;
      setProgramResults((rows) => {
        const next = [...rows];
        next[stepIndex] = stepResult;
        saveTrainingProgramDraft({
          programId: String(config?.programId || "program"),
          programTitle: String(config?.programTitle || "Programme Training"),
          durationMin: Math.max(0, Number(config?.programDurationMin) || 0),
          exerciseIds: adaptedProgramIds,
          focusFamily: (config?.programFocusFamily || config?.family || "balanced") as TrainingExerciseFamily | "balanced",
          nextStepIndex: Math.min(totalSteps - 1, stepIndex + 1),
          completedSteps: next.filter(Boolean) as any,
        });
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
      success: dailyChallengePassed,
      metrics,
      visitHistory: visitHistoryRef.current,
    });
    setResult({ success: dailyChallengePassed, metrics, stats: makeTrainingStats({ darts: s.darts, hits: s.hits, points: s.points, startedAt: startedAtRef.current, endedAt }) });
  }, [config, exercise, goal, isProgram, programIds, stepIndex, totalSteps]);

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

  const handleExit = React.useCallback(() => {
    if (isProgram && !programSummaryOpen) {
      saveTrainingProgramDraft({
        programId: String(config?.programId || "program"),
        programTitle: String(config?.programTitle || "Programme Training"),
        durationMin: Math.max(0, Number(config?.programDurationMin) || 0),
        exerciseIds: programIds,
        focusFamily: (config?.programFocusFamily || config?.family || "balanced") as TrainingExerciseFamily | "balanced",
        nextStepIndex: result ? Math.min(totalSteps - 1, stepIndex + 1) : stepIndex,
        completedSteps: programResults.filter(Boolean) as any,
      });
    }
    onExit();
  }, [config, isProgram, onExit, programIds, programResults, programSummaryOpen, result, stepIndex, totalSteps]);

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

  const sessionReview = React.useMemo(() => buildTrainingSessionReview({
    plannedExerciseIds: plannedProgramIdsRef.current,
    actualExerciseIds: programIds,
    rows: programSummary.rows as any,
  }), [programIds, programSummary.rows]);

  React.useEffect(() => {
    if (!programSummaryOpen || programTrackedRef.current || !isProgram || programSummary.steps < totalSteps) return;
    programTrackedRef.current = true;
    clearTrainingProgramDraft();
    const previous = loadTrainingProgramSessions();
    const previousBest = previous.reduce((best, row) => Math.max(best, row.performanceScore), 0);
    const currentRecord = recordTrainingProgramSession({
      programId: String(config?.programId || "program"),
      programTitle: String(config?.programTitle || "Programme Training"),
      durationMin: Math.max(0, Number(config?.programDurationMin) || 0),
      exerciseIds: programSummary.rows.map((row) => row.exerciseId),
      plannedExerciseIds: plannedProgramIdsRef.current,
      adaptationCount: sessionReview.adaptations.length,
      targetHitCount: sessionReview.targetMet,
      targetTotalCount: sessionReview.targetTotal,
      adherencePct: sessionReview.adherencePct,
      warmupPerformance: sessionReview.phases.find((phase) => phase.phase === "warmup")?.averagePerformance || 0,
      corePerformance: sessionReview.phases.find((phase) => phase.phase === "core")?.averagePerformance || 0,
      finishPerformance: sessionReview.phases.find((phase) => phase.phase === "finish")?.averagePerformance || 0,
      nextFamily: sessionReview.nextFamily,
      families: Array.from(new Set(programSummary.rows.map((row) => row.family))) as TrainingExerciseFamily[],
      steps: programSummary.steps,
      successes: programSummary.successes,
      darts: programSummary.darts,
      accuracyPct: programSummary.accuracy,
      performanceScore: programSummary.performance,
    });
    if (currentRecord) {
      const beforeProgression = buildTrainingProgression(getTrainingDetailedSessions({ limit: 300 }));
      const beforeCareer = buildTrainingCareer(previous, beforeProgression);
      const afterCareer = buildTrainingCareer([currentRecord, ...previous], beforeProgression);
      const gainedXp = trainingProgramXp(currentRecord);
      const levelUp = afterCareer.level.level > beforeCareer.level.level;
      setCareerMessage({ xp: gainedXp, text: levelUp ? `NIVEAU ${afterCareer.level.level} DÉBLOQUÉ • ${afterCareer.level.title}` : `${afterCareer.xp} XP CARRIÈRE` });
      const prefs = loadTrainingLabPreferences();
      const immediateFamily = (sessionReview.nextFamily || currentRecord.families[0] || "precision") as TrainingExerciseFamily;
      const historyAwareFamily = chooseHistoryAwareNextFamily(immediateFamily, [currentRecord, ...previous]);
      const coachingEffectiveness = buildTrainingCoachingEffectiveness([currentRecord, ...previous], 10);
      const nextFamily = chooseCoachingEffectiveNextFamily(historyAwareFamily, coachingEffectiveness);
      const loadAfter = buildTrainingLoadSummary([currentRecord, ...previous], prefs.weeklySessionTarget);
      const advice = buildPostSessionCoach(previous, currentRecord, nextFamily, loadAfter);
      setPostSessionCoach(advice);
      saveTrainingNextRecommendation(advice);
    }
    if (programSummary.performance > previousBest && programSummary.performance > 0) {
      setProgramRecordMessage(previous.length ? `NOUVEAU RECORD DE SÉANCE • ${Math.round(programSummary.performance)}/100` : `PREMIÈRE RÉFÉRENCE • ${Math.round(programSummary.performance)}/100`);
    }
  }, [config?.programDurationMin, config?.programId, config?.programTitle, isProgram, programSummary, programSummaryOpen, sessionReview, totalSteps]);

  const s = stateRef.current;
  const target = exercise.engine === "target_hits" ? exercise.target || "—" : exercise.engine === "sequence" ? sequence[Math.min(s.progress, Math.max(0, sequence.length - 1))] || "—" : exercise.engine === "checkout" ? String(Math.max(0, goal - s.checkoutTotal)) : String(Math.max(0, goal - s.points));
  const progressValue = exercise.engine === "score_darts" ? Math.min(s.points, goal) : exercise.engine === "checkout" ? Math.min(s.checkoutTotal, goal) : Math.min(s.progress, goal);
  const title = isProgram ? String(config?.programTitle || "Programme Training") : "Centre d'entraînement";

  return <>
    <TrainingPlayLayout
      title={title}
      tickerId="training_center"
      onExit={handleExit}
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
      {isProgram && <div style={{ marginBottom: 10, padding: 11, borderRadius: 14, border: "1px solid rgba(39,220,255,.18)", background: "linear-gradient(135deg,rgba(39,220,255,.075),rgba(140,90,255,.05))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 8.5, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>AWENA • {liveStepCoach.phaseLabel}</div>
          <div style={{ fontSize: 8, fontWeight: 900, opacity: .55 }}>CIBLE PERF. {liveStepCoach.targetScore}/100</div>
        </div>
        <div style={{ marginTop: 5, fontSize: 10.5, fontWeight: 900 }}>{liveStepCoach.objective}</div>
        <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .68 }}>{liveStepCoach.cue}</div>
      </div>}
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
        ...(isProgram && liveAdaptation ? [{ label: "AWENA", value: liveAdaptation.headline }] : []),
      ] : []}
      note={isProgram && liveAdaptation ? <div style={{ padding: 10, borderRadius: 12, background: liveAdaptation.tone === "positive" ? "rgba(80,255,174,.07)" : liveAdaptation.tone === "caution" ? "rgba(255,184,76,.07)" : "rgba(39,220,255,.06)", border: liveAdaptation.tone === "positive" ? "1px solid rgba(80,255,174,.20)" : liveAdaptation.tone === "caution" ? "1px solid rgba(255,184,76,.20)" : "1px solid rgba(39,220,255,.18)" }}><div style={{ fontSize: 8, fontWeight: 950, letterSpacing: 1, opacity: .58 }}>FEEDBACK AWENA</div><div style={{ marginTop: 3, fontSize: 11, fontWeight: 950 }}>{liveAdaptation.headline}</div><div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .7 }}>{liveAdaptation.body}</div><div style={{ marginTop: 6, fontSize: 8, fontWeight: 900, color: "#27dcff" }}>{liveAdaptation.nextLabel}</div></div> : null}
      actionLabel={isProgram ? (stepIndex + 1 < totalSteps ? "ÉTAPE SUIVANTE" : "VOIR LE BILAN") : "TERMINER"}
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

        <div style={{ marginTop: 10, padding: 11, borderRadius: 13, background: "linear-gradient(135deg,rgba(39,220,255,.055),rgba(140,90,255,.045))", border: "1px solid rgba(39,220,255,.17)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 8, fontWeight: 950, letterSpacing: 1, opacity: .55 }}>PLAN PRÉVU → RÉALISÉ</div><div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 950 }}>{sessionReview.headline}</div></div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.045)", fontSize: 8, fontWeight: 900 }}>STABLE • {Math.round(sessionReview.adherencePct)}%</span>
              <span style={{ padding: "4px 7px", borderRadius: 999, background: sessionReview.adaptations.length ? "rgba(255,184,76,.08)" : "rgba(80,255,174,.07)", fontSize: 8, fontWeight: 900 }}>ADAPT. • {sessionReview.adaptations.length}</span>
              <span style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.045)", fontSize: 8, fontWeight: 900 }}>CIBLES • {sessionReview.targetMet}/{sessionReview.targetTotal}</span>
            </div>
          </div>
          <div style={{ marginTop: 5, fontSize: 9.3, lineHeight: 1.42, opacity: .68 }}>{sessionReview.body}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, sessionReview.phases.length)},minmax(0,1fr))`, gap: 6, marginTop: 9 }}>
            {sessionReview.phases.map((phase) => <div key={phase.phase} style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.055)", textAlign: "center" }}>
              <div style={{ fontSize: 7, fontWeight: 950, opacity: .48 }}>{phase.label}</div>
              <div style={{ marginTop: 3, fontSize: 12, fontWeight: 950 }}>{Math.round(phase.averagePerformance)}<span style={{ fontSize: 7, opacity: .45 }}>/100</span></div>
              <div style={{ marginTop: 2, fontSize: 7.5, opacity: .5 }}>{phase.targetMet}/{phase.steps} cibles • {Math.round(phase.averageAccuracy)}% préc.</div>
            </div>)}
          </div>
          {sessionReview.adaptations.length > 0 && <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {sessionReview.adaptations.map((adaptation) => { const planned = getTrainingExercise(adaptation.plannedExerciseId); const actual = getTrainingExercise(adaptation.actualExerciseId); return <div key={`${adaptation.stepIndex}-${adaptation.actualExerciseId}`} style={{ fontSize: 8.3, opacity: .62 }}>Étape {adaptation.stepIndex + 1} • <span style={{ textDecoration: "line-through", opacity: .62 }}>{planned?.title || adaptation.plannedExerciseId}</span> → <b style={{ color: "#ffd86b" }}>{actual?.title || adaptation.actualExerciseId}</b></div>; })}
          </div>}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 8.7, lineHeight: 1.4, opacity: .65 }}><b style={{ color: "#27dcff" }}>SUITE AWENA :</b> {sessionReview.nextReason}</div>
        </div>

        {programRecordMessage && <div style={{ marginTop: 8, padding: 10, borderRadius: 12, background: "rgba(255,216,107,.08)", border: "1px solid rgba(255,216,107,.24)", color: "#ffd86b", fontSize: 9.5, fontWeight: 950, textAlign: "center", letterSpacing: .5 }}>{programRecordMessage}</div>}

        {careerMessage && <div style={{ marginTop: 8, padding: 10, borderRadius: 12, background: "linear-gradient(135deg,rgba(255,216,107,.075),rgba(140,90,255,.065))", border: "1px solid rgba(185,156,255,.20)", textAlign: "center" }}>
          <b style={{ fontSize: 11, color: "#ffd86b" }}>+{careerMessage.xp} XP</b><div style={{ marginTop: 3, fontSize: 8.5, fontWeight: 900, opacity: .7 }}>{careerMessage.text}</div>
        </div>}

        {postSessionCoach && <div style={{ marginTop: 10, padding: 11, borderRadius: 13, background: postSessionCoach.tone === "positive" ? "rgba(80,255,174,.07)" : postSessionCoach.tone === "caution" ? "rgba(255,184,76,.07)" : "rgba(39,220,255,.06)", border: postSessionCoach.tone === "positive" ? "1px solid rgba(80,255,174,.20)" : postSessionCoach.tone === "caution" ? "1px solid rgba(255,184,76,.20)" : "1px solid rgba(39,220,255,.18)" }}>
          <div style={{ fontSize: 8, fontWeight: 950, letterSpacing: 1, opacity: .58 }}>BILAN COACH AWENA</div>
          <div style={{ marginTop: 4, fontSize: 11.5, fontWeight: 950 }}>{postSessionCoach.headline}</div>
          <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.42, opacity: .68 }}>{postSessionCoach.body}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <span style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.045)", fontSize: 8, fontWeight: 900 }}>PROCHAINE • {postSessionCoach.nextDurationMin} MIN</span>
            <span style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.045)", fontSize: 8, fontWeight: 900 }}>FOCUS • {postSessionCoach.nextFamilyLabel.toUpperCase()}</span>
            {Math.abs(postSessionCoach.delta) >= 1 && <span style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.045)", fontSize: 8, fontWeight: 900 }}>FORME • {postSessionCoach.delta > 0 ? "+" : ""}{Math.round(postSessionCoach.delta)} PTS</span>}
          </div>
        </div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          {programSummary.rows.map((row, index) => <div key={`${row.exerciseId}-${index}`} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: row.success ? "rgba(80,255,174,.13)" : "rgba(255,255,255,.06)", fontSize: 9, fontWeight: 950 }}>{index + 1}</div>
            <div><b style={{ fontSize: 9.5 }}>{row.exerciseTitle}</b><div style={{ marginTop: 2, fontSize: 7.5, opacity: .46 }}>{row.family.toUpperCase()} • {row.darts} darts</div></div>
            <div style={{ textAlign: "right" }}><b style={{ fontSize: 10 }}>{Math.round(row.accuracyPct)}%</b><div style={{ fontSize: 7, opacity: .42 }}>PRÉC.</div></div>
            <div style={{ minWidth: 38, textAlign: "right" }}><b style={{ fontSize: 11, color: row.success ? "#8cffcb" : "inherit" }}>{row.performanceScore}</b><div style={{ fontSize: 7, opacity: .42 }}>PERF.</div></div>
          </div>)}
        </div>

        <button type="button" onClick={() => { clearTrainingProgramDraft(); onExit(); }} style={{ width: "100%", marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(39,220,255,.45)", background: "linear-gradient(135deg,rgba(39,220,255,.20),rgba(140,90,255,.18))", color: "inherit", fontWeight: 950, cursor: "pointer" }}>TERMINER LA SÉANCE</button>
      </div>
    </div>}
  </>;
}
