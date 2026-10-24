import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingStartButton from "../../ui/TrainingStartButton";
import TrainingParticipantsSelector, {
  buildTrainingParticipantConfig,
  resolveTrainingParticipants,
  useTrainingParticipantSelection,
} from "../../ui/TrainingParticipantsSelector";
import { getTrainingDetailedSessions } from "../../stats/trainingStatsHub";
import { buildGoalAwareCoachPrescription, buildTrainingDiagnosis, buildTrainingGoalStatuses, buildTrainingProgression, chooseGoalPriorityFamily } from "../../coach/trainingDiagnosis";
import {
  TRAINING_EXERCISE_CATALOG,
  TRAINING_FAMILY_META,
  type TrainingExerciseFamily,
} from "../../catalog/trainingExerciseCatalog";
import { buildCoachProgram, buildCustomProgram, TRAINING_PROGRAMS, type TrainingProgramDefinition, type TrainingProgramBuildOptions } from "../../catalog/trainingProgramCatalog";
import { loadTrainingLabPreferences, setTrainingFamilyGoal, setTrainingFamilyGoalDeadline, setTrainingWeeklySessionTarget, toggleFavoriteExercise, toggleFavoriteProgram, type TrainingLabPreferences } from "../../preferences/trainingLabPreferences";
import { buildTrainingWeeklyPlanStats, loadTrainingProgramSessions } from "../../profile/trainingPlanTracker";
import { buildTrainingLoadSummary } from "../../profile/trainingLoadCoach";
import { buildTrainingWeekCoachPlan, loadTrainingNextRecommendation } from "../../profile/trainingWeeklyCoach";

const familyOrder: TrainingExerciseFamily[] = ["scoring", "doubles", "checkout", "precision", "bull", "regularity"];
type HubTab = "program" | "exercises" | "diagnosis" | "progress";

function pct(value: number) {
  return `${Math.round(Number(value) || 0)}%`;
}

export default function TrainingLabConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart: (cfg: any) => void; onExit: () => void; }) {
  const [participants, setParticipants] = useTrainingParticipantSelection(profiles);
  const [preferences, setPreferences] = React.useState<TrainingLabPreferences>(() => loadTrainingLabPreferences());
  const [revision, setRevision] = React.useState(0);
  React.useEffect(() => {
    const refresh = () => setRevision((x) => x + 1);
    window.addEventListener("dc-training-stats-updated", refresh);
    window.addEventListener("dc-training-history-updated", refresh);
    window.addEventListener("dc-training-plan-updated", refresh);
    window.addEventListener("dc-training-next-recommendation-updated", refresh);
    return () => {
      window.removeEventListener("dc-training-stats-updated", refresh);
      window.removeEventListener("dc-training-history-updated", refresh);
      window.removeEventListener("dc-training-plan-updated", refresh);
      window.removeEventListener("dc-training-next-recommendation-updated", refresh);
    };
  }, []);
  React.useEffect(() => {
    const refreshPreferences = () => setPreferences(loadTrainingLabPreferences());
    window.addEventListener("dc-training-lab-preferences-updated", refreshPreferences);
    return () => window.removeEventListener("dc-training-lab-preferences-updated", refreshPreferences);
  }, []);

  const sessions = React.useMemo(() => {
    void revision;
    return getTrainingDetailedSessions({ limit: 300 });
  }, [revision]);
  const programSessions = React.useMemo(() => {
    void revision;
    return loadTrainingProgramSessions();
  }, [revision]);
  const weeklyPlan = React.useMemo(() => buildTrainingWeeklyPlanStats(programSessions, preferences.weeklySessionTarget), [programSessions, preferences.weeklySessionTarget]);
  const loadSummary = React.useMemo(() => buildTrainingLoadSummary(programSessions, preferences.weeklySessionTarget), [programSessions, preferences.weeklySessionTarget]);
  const diagnosis = React.useMemo(() => buildTrainingDiagnosis(sessions), [sessions]);
  const recommendedFamily = React.useMemo(() => chooseGoalPriorityFamily(diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines), [diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines]);
  const weekCoachPlan = React.useMemo(() => buildTrainingWeekCoachPlan(programSessions, preferences.weeklySessionTarget, recommendedFamily, loadSummary), [programSessions, preferences.weeklySessionTarget, recommendedFamily, loadSummary]);
  const nextRecommendation = React.useMemo(() => { void revision; return loadTrainingNextRecommendation(); }, [revision]);
  const progression = React.useMemo(() => buildTrainingProgression(sessions), [sessions]);
  const goalStatuses = React.useMemo(() => buildTrainingGoalStatuses(diagnosis, preferences.familyGoals), [diagnosis, preferences.familyGoals]);
  const prescription = React.useMemo(() => buildGoalAwareCoachPrescription(diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines), [diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines]);
  const coachProgram = React.useMemo(() => buildCoachProgram(recommendedFamily), [recommendedFamily]);
  const programs = React.useMemo(() => {
    const base = [coachProgram, ...TRAINING_PROGRAMS];
    const baseIds = new Set(base.map((program) => program.id));
    return [...base, ...preferences.favoritePrograms.filter((program) => !baseIds.has(program.id))];
  }, [coachProgram, preferences.favoritePrograms]);

  const [tab, setTab] = React.useState<HubTab>("program");
  const [family, setFamily] = React.useState<TrainingExerciseFamily>(recommendedFamily);
  const firstInFamily = React.useMemo(() => TRAINING_EXERCISE_CATALOG.find((e) => e.family === family) || TRAINING_EXERCISE_CATALOG[0], [family]);
  const [exerciseId, setExerciseId] = React.useState(firstInFamily.id);
  const [programId, setProgramId] = React.useState(coachProgram.id);
  const [customDuration, setCustomDuration] = React.useState<15 | 30 | 45>(30);
  const [customFocus, setCustomFocus] = React.useState<TrainingExerciseFamily | "balanced">("balanced");
  const [customIntensity, setCustomIntensity] = React.useState<TrainingProgramBuildOptions["intensity"]>("standard");
  const customProgram = React.useMemo(() => buildCustomProgram({ durationMin: customDuration, focusFamily: customFocus, intensity: customIntensity }), [customDuration, customFocus, customIntensity]);
  const resolved = resolveTrainingParticipants(participants, profiles);

  React.useEffect(() => {
    if (!TRAINING_EXERCISE_CATALOG.some((e) => e.id === exerciseId && e.family === family)) setExerciseId(firstInFamily.id);
  }, [exerciseId, family, firstInFamily.id]);
  React.useEffect(() => {
    if (programId.startsWith("coach_")) setProgramId(coachProgram.id);
  }, [coachProgram.id]);

  const exercises = TRAINING_EXERCISE_CATALOG.filter((e) => e.family === family);
  const selected = TRAINING_EXERCISE_CATALOG.find((e) => e.id === exerciseId) || firstInFamily;
  const selectedProgram = programs.find((p) => p.id === programId) || (programId.startsWith("custom_") ? customProgram : coachProgram);
  const labSessions = sessions.filter((row) => row.modeId === "training_lab").slice(0, 12);

  const startExercise = () => onStart({
    exerciseId: selected.id,
    family: selected.family,
    sessionKind: "exercise",
    ...buildTrainingParticipantConfig(participants, profiles),
  });

  const startProgram = (program: TrainingProgramDefinition) => onStart({
    programId: program.id,
    programTitle: program.title,
    programDurationMin: program.durationMin,
    programExerciseIds: program.exerciseIds,
    exerciseId: program.exerciseIds[0],
    family: program.focusFamily && program.focusFamily !== "balanced" ? program.focusFamily : recommendedFamily,
    programFocusFamily: program.focusFamily || "balanced",
    sessionKind: "program",
    ...buildTrainingParticipantConfig(participants, profiles),
  });

  const favoriteExerciseIds = new Set(preferences.favoriteExerciseIds);
  const favoriteProgramIds = new Set(preferences.favoritePrograms.map((program) => program.id));
  const favoriteExercises = preferences.favoriteExerciseIds
    .map((id) => TRAINING_EXERCISE_CATALOG.find((exercise) => exercise.id === id))
    .filter(Boolean);

  const toggleExerciseFavorite = (id: string) => {
    setPreferences(toggleFavoriteExercise(preferences, id));
  };

  const toggleProgramFavorite = (program: TrainingProgramDefinition) => {
    const snapshot = program.id === customProgram.id
      ? { ...program, id: `saved_${Date.now()}`, title: `${program.title} ★` }
      : program;
    const next = toggleFavoriteProgram(preferences, snapshot);
    setPreferences(next);
    if (snapshot.id !== program.id) setProgramId(snapshot.id);
  };

  const updateGoal = (familyId: TrainingExerciseFamily, value: number) => {
    setPreferences(setTrainingFamilyGoal(preferences, familyId, value));
  };

  const updateGoalDeadline = (familyId: TrainingExerciseFamily, value: string) => {
    setPreferences(setTrainingFamilyGoalDeadline(preferences, familyId, value || null));
  };

  const updateWeeklyTarget = (value: number) => {
    setPreferences(setTrainingWeeklySessionTarget(preferences, value));
  };

  const prepareRecommendedSession = (duration: 15 | 30 | 45, focus: TrainingExerciseFamily | "balanced") => {
    setCustomDuration(duration);
    setCustomFocus(focus);
    setCustomIntensity(loadSummary.status === "high" || loadSummary.status === "recovery" ? "accessible" : "standard");
    setProgramId(`custom_${duration}_${focus}_${loadSummary.status === "high" || loadSummary.status === "recovery" ? "accessible" : "standard"}`);
  };

  const tabs: Array<{ id: HubTab; label: string }> = [
    { id: "program", label: "PROGRAMME" },
    { id: "exercises", label: "EXERCICES" },
    { id: "diagnosis", label: "DIAGNOSTIC" },
    { id: "progress", label: "PROGRESSION" },
  ];

  return (
    <TrainingShell
      header={<TrainingHeader title="Centre d'entraînement" tickerId="training_challenges" onBack={onExit} rules={<><p>Le centre regroupe programmes guidés, exercices unitaires, diagnostic et progression.</p><p>Awena utilise tes résultats Training enregistrés pour déterminer le prochain axe à travailler.</p></>} />}
      body={
        <div style={{ width: "min(940px,100%)", margin: "0 auto", paddingBottom: 26 }}>
          <TrainingParticipantsSelector profiles={profiles} value={participants} onChange={setParticipants} />

          <div style={{ marginTop: 12, padding: 13, borderRadius: 16, border: "1px solid rgba(39,220,255,.28)", background: "linear-gradient(135deg,rgba(39,220,255,.12),rgba(140,90,255,.07))" }}>
            <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1.2, color: "#27dcff" }}>COACH AWENA</div>
            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950 }}>{prescription.title}</div>
            <div style={{ marginTop: 5, fontSize: 10.5, lineHeight: 1.45, opacity: .72 }}>{prescription.body}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, padding: "4px 7px", borderRadius: 999, background: "rgba(39,220,255,.10)", border: "1px solid rgba(39,220,255,.18)" }}>ACTUEL {Math.round(prescription.current)}/100</span>
              <span style={{ fontSize: 9, padding: "4px 7px", borderRadius: 999, background: "rgba(140,90,255,.10)", border: "1px solid rgba(140,90,255,.18)" }}>OBJECTIF {prescription.goal}/100</span>
              <span style={{ fontSize: 9, padding: "4px 7px", borderRadius: 999, background: prescription.gap <= 0 ? "rgba(80,255,174,.10)" : "rgba(255,184,76,.08)", border: prescription.gap <= 0 ? "1px solid rgba(80,255,174,.20)" : "1px solid rgba(255,184,76,.16)" }}>{prescription.gap <= 0 ? "OBJECTIF ATTEINT" : `ÉCART ${Math.ceil(prescription.gap)} PTS`}</span>
            </div>
          </div>

          {nextRecommendation && <div style={{ marginTop: 10, padding: 11, borderRadius: 14, border: "1px solid rgba(185,156,255,.20)", background: "rgba(140,90,255,.055)", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: "1 1 260px" }}>
              <div style={{ fontSize: 8, fontWeight: 950, color: "#b99cff", letterSpacing: 1 }}>SUITE DE LA DERNIÈRE SÉANCE</div>
              <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 950 }}>{nextRecommendation.headline}</div>
              <div style={{ marginTop: 3, fontSize: 8.8, opacity: .58 }}>{nextRecommendation.durationMin} min • {nextRecommendation.familyLabel} • {nextRecommendation.body}</div>
            </div>
            <button type="button" onClick={() => { setTab("program"); prepareRecommendedSession(nextRecommendation.durationMin, nextRecommendation.family); }} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(185,156,255,.28)", background: "rgba(140,90,255,.10)", color: "inherit", fontSize: 8.5, fontWeight: 950, cursor: "pointer" }}>REPRENDRE LE FIL</button>
          </div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 12, position: "sticky", top: 0, zIndex: 3, padding: "6px 0", backdropFilter: "blur(10px)" }}>
            {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} style={{ minWidth: 0, padding: "9px 4px", borderRadius: 11, border: tab === item.id ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.10)", background: tab === item.id ? "rgba(39,220,255,.15)" : "rgba(0,0,0,.2)", color: "inherit", fontSize: 9.5, fontWeight: 950, letterSpacing: .5, cursor: "pointer" }}>{item.label}</button>)}
          </div>

          {tab === "program" && <div>
            <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: "1px solid rgba(80,255,174,.24)", background: "linear-gradient(135deg,rgba(80,255,174,.09),rgba(39,220,255,.045))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#8cffcb" }}>PLAN HEBDOMADAIRE</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{weeklyPlan.completed}/{weeklyPlan.target} séances complètes cette semaine</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, opacity: .62 }}>{weeklyPlan.remaining ? `Encore ${weeklyPlan.remaining} séance${weeklyPlan.remaining > 1 ? "s" : ""} pour tenir le rythme.` : "Objectif hebdomadaire atteint. Awena peut maintenir ou augmenter progressivement la charge."}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <button type="button" onClick={() => updateWeeklyTarget(preferences.weeklySessionTarget - 1)} style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "inherit", cursor: "pointer" }}>−</button>
                  <b style={{ minWidth: 58, textAlign: "center", fontSize: 10 }}>{preferences.weeklySessionTarget}/SEM.</b>
                  <button type="button" onClick={() => updateWeeklyTarget(preferences.weeklySessionTarget + 1)} style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "inherit", cursor: "pointer" }}>+</button>
                </div>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 10 }}><div style={{ width: `${Math.max(2, weeklyPlan.completionPct)}%`, height: "100%", background: "linear-gradient(90deg,#8cffcb,#27dcff)" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 9, textAlign: "center" }}>
                <div style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 12 }}>{weeklyPlan.streakWeeks}</b><div style={{ fontSize: 7.5, opacity: .48 }}>SEMAINES DE SÉRIE</div></div>
                <div style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 12 }}>{weeklyPlan.bestSession ? Math.round(weeklyPlan.bestSession.performanceScore) : 0}</b><div style={{ fontSize: 7.5, opacity: .48 }}>MEILLEURE SÉANCE</div></div>
                <div style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 12 }}>{programSessions.length}</b><div style={{ fontSize: 7.5, opacity: .48 }}>SÉANCES SUIVIES</div></div>
              </div>
              <button type="button" onClick={() => { setProgramId(coachProgram.id); }} style={{ width: "100%", marginTop: 9, padding: 9, borderRadius: 10, border: "1px solid rgba(80,255,174,.28)", background: "rgba(80,255,174,.08)", color: "inherit", fontSize: 9.5, fontWeight: 950, cursor: "pointer" }}>PROCHAINE SÉANCE AWENA • {coachProgram.title}</button>
            </div>

            <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: loadSummary.status === "recovery" || loadSummary.status === "high" ? "1px solid rgba(255,184,76,.28)" : "1px solid rgba(39,220,255,.20)", background: loadSummary.status === "recovery" || loadSummary.status === "high" ? "linear-gradient(135deg,rgba(255,184,76,.08),rgba(255,255,255,.02))" : "linear-gradient(135deg,rgba(39,220,255,.07),rgba(140,90,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: loadSummary.status === "recovery" || loadSummary.status === "high" ? "#ffd86b" : "#27dcff" }}>CHARGE & FORME</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{loadSummary.statusLabel}</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .64 }}>{loadSummary.statusMessage} {loadSummary.recommendedAction}</div>
                </div>
                <div style={{ padding: "8px 10px", borderRadius: 11, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)", textAlign: "center" }}>
                  <div style={{ fontSize: 7.5, opacity: .5 }}>PROCHAINE DURÉE</div>
                  <b style={{ display: "block", marginTop: 2, fontSize: 17 }}>{loadSummary.recommendedDurationMin}<span style={{ fontSize: 9, opacity: .55 }}> MIN</span></b>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10, textAlign: "center" }}>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{loadSummary.last7Sessions}</b><div style={{ fontSize: 7, opacity: .45 }}>SÉANCES / 7J</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{loadSummary.last7Minutes}</b><div style={{ fontSize: 7, opacity: .45 }}>MINUTES / 7J</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{loadSummary.activeDays7}</b><div style={{ fontSize: 7, opacity: .45 }}>JOURS ACTIFS</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11, color: loadSummary.formDelta > 5 ? "#8cffcb" : loadSummary.formDelta < -5 ? "#ffd86b" : "inherit" }}>{loadSummary.formDelta > 0 ? "+" : ""}{Math.round(loadSummary.formDelta)}</b><div style={{ fontSize: 7, opacity: .45 }}>FORME</div></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, marginTop: 10 }}>
                {loadSummary.calendar.map((day) => <div key={day.dayStart} title={`${day.sessions} séance(s) • ${day.minutes} min`} style={{ textAlign: "center", padding: "6px 2px", borderRadius: 8, border: day.sessions ? "1px solid rgba(39,220,255,.18)" : "1px solid rgba(255,255,255,.055)", background: day.sessions ? "rgba(39,220,255,.07)" : "rgba(255,255,255,.018)" }}>
                  <div style={{ fontSize: 6.5, opacity: .45 }}>{day.label}</div>
                  <div style={{ marginTop: 3, fontSize: 10, fontWeight: 950 }}>{day.sessions || "·"}</div>
                  <div style={{ marginTop: 1, fontSize: 6.5, opacity: .42 }}>{day.minutes ? `${day.minutes}m` : "—"}</div>
                </div>)}
              </div>
              <button type="button" onClick={() => prepareRecommendedSession(loadSummary.recommendedDurationMin, recommendedFamily)} style={{ width: "100%", marginTop: 9, padding: 9, borderRadius: 10, border: "1px solid rgba(39,220,255,.20)", background: "rgba(39,220,255,.06)", color: "inherit", fontSize: 9, fontWeight: 950, cursor: "pointer" }}>PRÉPARER LA SÉANCE CONSEILLÉE • {loadSummary.recommendedDurationMin} MIN • {TRAINING_FAMILY_META[recommendedFamily].label.toUpperCase()}</button>
            </div>

            <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: "1px solid rgba(140,90,255,.22)", background: "linear-gradient(135deg,rgba(140,90,255,.08),rgba(39,220,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#b99cff" }}>FIL CONDUCTEUR AWENA</div>
                  <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 950 }}>{weekCoachPlan.cadenceLabel}</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .62 }}>{weekCoachPlan.summary}</div>
                </div>
                {weekCoachPlan.nextSlot && <button type="button" onClick={() => prepareRecommendedSession(weekCoachPlan.nextSlot!.durationMin as 15 | 30 | 45, weekCoachPlan.nextSlot!.focusFamily)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(140,90,255,.28)", background: "rgba(140,90,255,.09)", color: "inherit", fontSize: 8.5, fontWeight: 950, cursor: "pointer" }}>PRÉPARER {weekCoachPlan.nextSlot.label}</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 5, marginTop: 10 }}>
                {weekCoachPlan.slots.map((slot) => <div key={slot.dayStart} title={`${slot.focusLabel}${slot.durationMin ? ` • ${slot.durationMin} min` : ""}`} style={{ minWidth: 0, padding: "7px 3px", borderRadius: 9, textAlign: "center", border: slot.state === "done" ? "1px solid rgba(80,255,174,.22)" : slot.state === "planned" ? "1px solid rgba(140,90,255,.24)" : "1px solid rgba(255,255,255,.055)", background: slot.state === "done" ? "rgba(80,255,174,.07)" : slot.state === "planned" ? "rgba(140,90,255,.07)" : "rgba(255,255,255,.018)" }}>
                  <div style={{ fontSize: 7.5, opacity: .48 }}>{slot.label}</div>
                  <div style={{ marginTop: 4, fontSize: 11, fontWeight: 950, color: slot.state === "done" ? "#8cffcb" : slot.state === "planned" ? "#b99cff" : "inherit" }}>{slot.state === "done" ? "✓" : slot.state === "planned" ? `${slot.durationMin}'` : "—"}</div>
                  <div style={{ marginTop: 3, fontSize: 6.5, opacity: .44, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slot.state === "done" && slot.performanceScore != null ? `${Math.round(slot.performanceScore)}/100` : slot.focusLabel}</div>
                </div>)}
              </div>
            </div>
            {!!preferences.favoritePrograms.length && <>
              <div style={{ margin: "10px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#ffd86b" }}>★ MES SÉANCES FAVORITES</div>
              <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 3 }}>
                {preferences.favoritePrograms.map((favorite) => <button key={favorite.id} type="button" onClick={() => setProgramId(favorite.id)} style={{ flex: "0 0 auto", minWidth: 170, maxWidth: 230, textAlign: "left", padding: 10, borderRadius: 12, border: selectedProgram.id === favorite.id ? "1px solid #ffd86b" : "1px solid rgba(255,216,107,.18)", background: selectedProgram.id === favorite.id ? "rgba(255,216,107,.10)" : "rgba(255,255,255,.03)", color: "inherit", cursor: "pointer" }}>
                  <b style={{ fontSize: 10 }}>{favorite.title}</b>
                  <div style={{ marginTop: 4, fontSize: 8.5, opacity: .55 }}>{favorite.durationMin} min • {favorite.exerciseIds.length} étapes</div>
                </button>)}
              </div>
            </>}
            <div style={{ margin: "10px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>SÉANCES GUIDÉES</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 9 }}>
              {programs.map((program) => {
                const active = selectedProgram.id === program.id;
                const coach = program.level === "Coach";
                return <button key={program.id} type="button" onClick={() => setProgramId(program.id)} style={{ textAlign: "left", padding: 13, borderRadius: 15, border: active ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.11)", background: active ? "rgba(39,220,255,.12)" : coach ? "rgba(140,90,255,.08)" : "rgba(255,255,255,.035)", color: "inherit", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b style={{ fontSize: 12 }}>{program.title}</b><span style={{ fontSize: 9, padding: "3px 7px", borderRadius: 999, background: "rgba(255,255,255,.08)" }}>{program.durationMin} MIN</span></div>
                  <div style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.35, opacity: .7 }}>{program.subtitle}</div>
                  <div style={{ marginTop: 9, fontSize: 9.5, opacity: .55 }}>{program.exerciseIds.length} étapes • {program.level}</div>
                </button>;
              })}
            </div>

            <div style={{ marginTop: 12, padding: 13, borderRadius: 15, border: "1px solid rgba(140,90,255,.28)", background: "linear-gradient(135deg,rgba(140,90,255,.10),rgba(39,220,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#b49cff" }}>PROGRAMME SUR MESURE</div>
                  <div style={{ marginTop: 4, fontSize: 10, opacity: .64 }}>Choisis durée, axe de travail et intensité. Le parcours est construit automatiquement.</div>
                </div>
                <button type="button" onClick={() => setProgramId(customProgram.id)} style={{ padding: "7px 10px", borderRadius: 10, border: programId === customProgram.id ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.12)", background: programId === customProgram.id ? "rgba(39,220,255,.14)" : "rgba(255,255,255,.05)", color: "inherit", fontWeight: 900, fontSize: 9, cursor: "pointer" }}>UTILISER CE PROGRAMME</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 11 }}>
                <div>
                  <div style={{ fontSize: 8, opacity: .5, marginBottom: 5 }}>DURÉE</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {([15,30,45] as const).map((duration) => <button key={duration} type="button" onClick={() => { setCustomDuration(duration); setProgramId(`custom_${duration}_${customFocus}_${customIntensity}`); }} style={{ flex: 1, padding: "7px 4px", borderRadius: 9, border: customDuration === duration ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.09)", background: customDuration === duration ? "rgba(39,220,255,.12)" : "rgba(0,0,0,.15)", color: "inherit", fontSize: 9, fontWeight: 900, cursor: "pointer" }}>{duration}m</button>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 8, opacity: .5, marginBottom: 5 }}>FOCUS</div>
                  <select value={customFocus} onChange={(e) => { const value = e.target.value as TrainingExerciseFamily | "balanced"; setCustomFocus(value); setProgramId(`custom_${customDuration}_${value}_${customIntensity}`); }} style={{ width: "100%", padding: "7px 8px", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.22)", color: "inherit", fontSize: 9, fontWeight: 850 }}>
                    <option value="balanced">ÉQUILIBRÉ</option>
                    {familyOrder.map((id) => <option key={id} value={id}>{TRAINING_FAMILY_META[id].label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 8, opacity: .5, marginBottom: 5 }}>INTENSITÉ</div>
                  <select value={customIntensity} onChange={(e) => { const value = e.target.value as TrainingProgramBuildOptions["intensity"]; setCustomIntensity(value); setProgramId(`custom_${customDuration}_${customFocus}_${value}`); }} style={{ width: "100%", padding: "7px 8px", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.22)", color: "inherit", fontSize: 9, fontWeight: 850 }}>
                    <option value="accessible">ACCESSIBLE</option>
                    <option value="standard">STANDARD</option>
                    <option value="intense">INTENSE</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 5 }}>
                {customProgram.exerciseIds.map((id, index) => { const ex = TRAINING_EXERCISE_CATALOG.find((e) => e.id === id); return <span key={`${id}-${index}`} style={{ fontSize: 8.5, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.07)" }}>{index + 1}. {ex?.title || id}</span>; })}
              </div>
            </div>

            <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid rgba(39,220,255,.17)", background: "rgba(39,220,255,.045)" }}>
              <div style={{ fontSize: 9.5, opacity: .58 }}>PARCOURS SÉLECTIONNÉ</div>
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedProgram.exerciseIds.map((id, index) => {
                  const ex = TRAINING_EXERCISE_CATALOG.find((e) => e.id === id);
                  return <span key={`${id}-${index}`} style={{ fontSize: 9.5, padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.08)" }}>{index + 1}. {ex?.title || id}</span>;
                })}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button type="button" onClick={() => toggleProgramFavorite(selectedProgram)} style={{ padding: "8px 11px", borderRadius: 10, border: favoriteProgramIds.has(selectedProgram.id) ? "1px solid rgba(255,216,107,.55)" : "1px solid rgba(255,255,255,.12)", background: favoriteProgramIds.has(selectedProgram.id) ? "rgba(255,216,107,.10)" : "rgba(255,255,255,.04)", color: "inherit", fontSize: 9, fontWeight: 900, cursor: "pointer" }}>{favoriteProgramIds.has(selectedProgram.id) ? "★ RETIRER DES FAVORIS" : selectedProgram.id.startsWith("custom_") ? "★ ENREGISTRER CETTE SÉANCE" : "☆ AJOUTER AUX FAVORIS"}</button>
            </div>
            <TrainingStartButton disabled={!resolved.length} label={resolved.length > 1 ? `LANCER LE PROGRAMME — ${resolved.length} JOUEURS` : `LANCER ${selectedProgram.title}`} onClick={() => startProgram(selectedProgram)} />
          </div>}

          {tab === "exercises" && <div>
            {!!favoriteExercises.length && <>
              <div style={{ margin: "10px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#ffd86b" }}>★ MES EXERCICES FAVORIS</div>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                {favoriteExercises.map((favorite: any) => <button key={favorite.id} type="button" onClick={() => { setFamily(favorite.family); setExerciseId(favorite.id); }} style={{ flex: "0 0 auto", padding: "7px 9px", borderRadius: 999, border: exerciseId === favorite.id ? "1px solid #ffd86b" : "1px solid rgba(255,216,107,.18)", background: exerciseId === favorite.id ? "rgba(255,216,107,.10)" : "rgba(255,255,255,.035)", color: "inherit", fontSize: 9, fontWeight: 850, cursor: "pointer" }}>{favorite.title}</button>)}
              </div>
            </>}
            <div style={{ margin: "10px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>COMPÉTENCE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(138px,1fr))", gap: 8 }}>
              {familyOrder.map((id) => {
                const row = diagnosis.find((x) => x.family === id);
                const active = family === id;
                const recommended = id === recommendedFamily;
                return <button key={id} type="button" onClick={() => setFamily(id)} style={{ textAlign: "left", padding: 11, borderRadius: 14, border: active ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.12)", background: active ? "rgba(39,220,255,.13)" : "rgba(255,255,255,.035)", color: "inherit", cursor: "pointer" }}>
                  <div style={{ fontSize: 11, fontWeight: 950 }}>{TRAINING_FAMILY_META[id].label}{recommended ? " ★" : ""}</div>
                  <div style={{ marginTop: 5, fontSize: 10, opacity: .68 }}>{row?.sessions ? `${row.sessions} séances • ${pct(row.accuracyPct)}` : "À découvrir"}</div>
                </button>;
              })}
            </div>

            <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>EXERCICES — {exercises.length}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 9 }}>
              {exercises.map((exercise) => {
                const active = exercise.id === exerciseId;
                return <button key={exercise.id} type="button" onClick={() => setExerciseId(exercise.id)} style={{ textAlign: "left", padding: 13, borderRadius: 15, border: active ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.12)", background: active ? "linear-gradient(135deg,rgba(39,220,255,.14),rgba(39,220,255,.04))" : "rgba(255,255,255,.035)", color: "inherit", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 12 }}>{exercise.title}</b><span style={{ fontSize: 10, opacity: .62 }}>{"★".repeat(exercise.difficulty)}</span></div>
                  <div style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.35, opacity: .72 }}>{exercise.subtitle}</div>
                  <div style={{ marginTop: 8, fontSize: 9.5, opacity: .55 }}>{exercise.maxDarts} fléchettes max</div>
                </button>;
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button type="button" onClick={() => toggleExerciseFavorite(selected.id)} style={{ padding: "8px 11px", borderRadius: 10, border: favoriteExerciseIds.has(selected.id) ? "1px solid rgba(255,216,107,.55)" : "1px solid rgba(255,255,255,.12)", background: favoriteExerciseIds.has(selected.id) ? "rgba(255,216,107,.10)" : "rgba(255,255,255,.04)", color: "inherit", fontSize: 9, fontWeight: 900, cursor: "pointer" }}>{favoriteExerciseIds.has(selected.id) ? "★ FAVORI" : "☆ AJOUTER AUX FAVORIS"}</button>
            </div>
            <TrainingStartButton disabled={!resolved.length} label={resolved.length > 1 ? `LANCER — ${resolved.length} JOUEURS` : "LANCER L'EXERCICE"} onClick={startExercise} />
          </div>}

          {tab === "diagnosis" && <div>
            <div style={{ margin: "10px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>PROFIL DE COMPÉTENCES</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 9 }}>
              {diagnosis.map((row) => {
                const recommended = row.family === recommendedFamily;
                const trend = row.trend > 3 ? `↗ +${Math.round(row.trend)}` : row.trend < -3 ? `↘ ${Math.round(row.trend)}` : "→ stable";
                return <div key={row.family} style={{ padding: 13, borderRadius: 15, border: recommended ? "1px solid rgba(39,220,255,.5)" : "1px solid rgba(255,255,255,.1)", background: recommended ? "rgba(39,220,255,.08)" : "rgba(255,255,255,.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b style={{ fontSize: 11.5 }}>{row.label}{recommended ? " ★" : ""}</b><span style={{ fontSize: 10, opacity: .65 }}>{trend}</span></div>
                  <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 10 }}><div style={{ width: `${Math.max(2, Math.min(100, row.recentScore))}%`, height: "100%", background: "linear-gradient(90deg,#27dcff,#8c5aff)" }} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 9, textAlign: "center" }}>
                    <div><b style={{ fontSize: 12 }}>{Math.round(row.recentScore)}</b><div style={{ fontSize: 8, opacity: .5 }}>INDICE</div></div>
                    <div><b style={{ fontSize: 12 }}>{pct(row.accuracyPct)}</b><div style={{ fontSize: 8, opacity: .5 }}>PRÉCISION</div></div>
                    <div><b style={{ fontSize: 12 }}>{pct(row.successPct)}</b><div style={{ fontSize: 8, opacity: .5 }}>RÉUSSITE</div></div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 9, opacity: .5 }}>{row.sessions} séance{row.sessions > 1 ? "s" : ""} analysée{row.sessions > 1 ? "s" : ""}</div>
                </div>;
              })}
            </div>
            <button type="button" onClick={() => { setProgramId(coachProgram.id); setTab("program"); }} style={{ width: "100%", marginTop: 13, padding: 12, borderRadius: 13, border: "1px solid rgba(39,220,255,.4)", background: "rgba(39,220,255,.12)", color: "inherit", fontWeight: 950, cursor: "pointer" }}>UTILISER LE PROGRAMME RECOMMANDÉ</button>
          </div>}

          {tab === "progress" && <div>
            <div style={{ margin: "10px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>PROGRESSION PAR COMPÉTENCE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
              {progression.map((row) => {
                const deltaLabel = row.delta > 2 ? `+${Math.round(row.delta)}` : row.delta < -2 ? `${Math.round(row.delta)}` : "stable";
                const points = row.points;
                const maxScore = Math.max(100, ...points.map((point) => point.score));
                return <div key={row.family} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}><b style={{ fontSize: 10.5 }}>{row.label}</b><span style={{ fontSize: 9, opacity: .58 }}>{deltaLabel}</span></div>
                  <div style={{ marginTop: 9, height: 44, display: "flex", gap: 3, alignItems: "end" }}>
                    {points.length ? points.map((point, index) => <div key={`${point.endedAt}-${index}`} title={`${Math.round(point.score)}/100`} style={{ flex: 1, minWidth: 4, height: `${Math.max(5, (point.score / maxScore) * 100)}%`, borderRadius: "4px 4px 2px 2px", background: point.success ? "linear-gradient(180deg,#27dcff,#8c5aff)" : "rgba(255,255,255,.18)" }} />) : <div style={{ fontSize: 9, opacity: .45, alignSelf: "center" }}>Pas encore de données</div>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginTop: 9, textAlign: "center" }}>
                    <div><b style={{ fontSize: 11 }}>{Math.round(row.recentAverage)}</b><div style={{ fontSize: 7, opacity: .45 }}>RÉCENT</div></div>
                    <div><b style={{ fontSize: 11 }}>{Math.round(row.bestScore)}</b><div style={{ fontSize: 7, opacity: .45 }}>RECORD</div></div>
                    <div><b style={{ fontSize: 11 }}>{row.streak}</b><div style={{ fontSize: 7, opacity: .45 }}>SÉRIE</div></div>
                  </div>
                  {(() => {
                    const goal = goalStatuses.find((status) => status.family === row.family);
                    const target = goal?.goal || preferences.familyGoals[row.family];
                    const current = goal?.current || row.recentAverage;
                    const reached = current >= target;
                    return <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 8.5, opacity: .58 }}>OBJECTIF PERSONNEL</span>
                        <b style={{ fontSize: 10, color: reached ? "#8cffcb" : "#ffd86b" }}>{target}/100</b>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 6 }}>
                        <div style={{ height: "100%", width: `${Math.max(2, Math.min(100, (current / Math.max(1, target)) * 100))}%`, background: reached ? "linear-gradient(90deg,#8cffcb,#27dcff)" : "linear-gradient(90deg,#ffd86b,#27dcff)" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, marginTop: 7 }}>
                        <button type="button" onClick={() => updateGoal(row.family, target - 5)} style={{ width: 28, height: 26, borderRadius: 8, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "inherit", cursor: "pointer" }}>−</button>
                        <button type="button" onClick={() => updateGoal(row.family, target + 5)} style={{ width: 28, height: 26, borderRadius: 8, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "inherit", cursor: "pointer" }}>+</button>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 7.5, opacity: .45, marginBottom: 4 }}>DATE CIBLE</div>
                        <input type="date" value={preferences.familyGoalDeadlines[row.family] || ""} onChange={(event) => updateGoalDeadline(row.family, event.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "6px 7px", borderRadius: 8, border: "1px solid rgba(255,255,255,.09)", background: "rgba(0,0,0,.18)", color: "inherit", fontSize: 8.5 }} />
                      </div>
                    </div>;
                  })()}
                </div>;
              })}
            </div>

            <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#ffd86b" }}>RECORDS PERSONNELS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 7 }}>
              {progression.map((row) => <div key={`record-${row.family}`} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,216,107,.12)", background: "rgba(255,216,107,.035)" }}>
                <div style={{ fontSize: 8.5, opacity: .55 }}>{row.label.toUpperCase()}</div>
                <div style={{ marginTop: 3, fontSize: 18, fontWeight: 950 }}>{Math.round(row.bestScore)}<span style={{ fontSize: 9, opacity: .5 }}>/100</span></div>
                <div style={{ marginTop: 3, fontSize: 8, opacity: .45 }}>{row.sessions} séance{row.sessions > 1 ? "s" : ""} • série {row.streak}</div>
              </div>)}
            </div>

            <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>DERNIÈRES SÉANCES DU CENTRE</div>
            {!labSessions.length ? <div style={{ padding: 18, borderRadius: 15, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.03)", fontSize: 11, opacity: .7 }}>Aucune séance du Centre enregistrée pour le moment. Lance un exercice ou un programme pour créer ta courbe de progression.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {labSessions.map((row) => {
                const exerciseId = String(row.metrics?.exerciseId || row.config?.exerciseId || "");
                const ex = TRAINING_EXERCISE_CATALOG.find((item) => item.id === exerciseId);
                const performance = Number(row.metrics?.performanceScore || row.metrics?.score || 0);
                return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", padding: 11, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}>
                  <div><b style={{ fontSize: 10.5 }}>{ex?.title || String(row.metrics?.exerciseTitle || "Centre d'entraînement")}</b><div style={{ marginTop: 3, fontSize: 8.5, opacity: .48 }}>{new Date(row.endedAt).toLocaleDateString()} • {row.darts} darts</div></div>
                  <div style={{ textAlign: "center" }}><b style={{ fontSize: 11 }}>{pct(row.accuracyPct)}</b><div style={{ fontSize: 7.5, opacity: .45 }}>PRÉC.</div></div>
                  <div style={{ textAlign: "center", minWidth: 42 }}><b style={{ fontSize: 12, color: row.success ? "#8cffcb" : "inherit" }}>{Math.round(performance)}</b><div style={{ fontSize: 7.5, opacity: .45 }}>PERF.</div></div>
                </div>;
              })}
            </div>}
          </div>}
        </div>
      }
    />
  );
}
