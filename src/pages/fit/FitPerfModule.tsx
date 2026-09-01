import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import {
  FIT_TEMPLATES,
  appendFitSession,
  completedSets,
  createSessionFromTemplate,
  defaultSets,
  exerciseById,
  formatDuration,
  formatVolume,
  loadFitSessions,
  fitSessionsForProfile,
  makeId,
  sessionDurationMs,
  sessionVolume,
  totalSets,
  type FitSession,
  type FitSessionExercise,
  type FitSet,
  type FitTemplate,
} from "../../fit/fitStore";
import { freeExerciseImageUrl } from "../../fit/freeExerciseCatalog";
import { getCachedFitCatalog, loadFitCatalog } from "../../fit/fitCatalogEngine";
import { getAwenaPremiumMotion } from "../../fit/awenaPremiumMotions";
import { contentPackAssetUrl } from "../../lib/contentPacks";
import { FIT_MUSCLE_ORDER, exerciseMatchesMuscle } from "../../fit/fitExerciseTaxonomy";
import { FIT_PRACTICES, getFitProgramCatalog, type FitPracticeId } from "../../fit/fitProgramCatalog";
import { FitGlassCard, FitGhostButton, FitIcon, FitIconTabs, FitPill, FitPrimaryButton, FitProgress, FitSectionTitle, FitShell, fitUiCss } from "./FitPerfUi";

type Props = { go: (route: any, params?: any) => void; store?: any; params?: any };
type View = "setup" | "workout" | "history";

const REST_SECONDS_KEY = "mss-fit-perf-rest-seconds-v1";

const TEMPLATE_VISUALS: Record<string, { imageUrl: string; imagePosition?: string }> = {
  free: { imageUrl: contentPackAssetUrl("fit-awena", "tickers/free-awena.webp"), imagePosition: "left center" },
  push: { imageUrl: contentPackAssetUrl("fit-awena", "tickers/push-awena.webp"), imagePosition: "left center" },
  pull: { imageUrl: contentPackAssetUrl("fit-awena", "tickers/pull-awena.webp"), imagePosition: "left center" },
  legs: { imageUrl: contentPackAssetUrl("fit-awena", "tickers/legs-awena.webp"), imagePosition: "left center" },
  full: { imageUrl: contentPackAssetUrl("fit-awena", "tickers/full-awena.webp"), imagePosition: "right center" },
};

function initialRestSeconds() {
  try {
    const n = Number(localStorage.getItem(REST_SECONDS_KEY));
    return Number.isFinite(n) && n >= 15 && n <= 600 ? n : 90;
  } catch {
    return 90;
  }
}

type FitMetricMode = "strength" | "bodyweight" | "interval" | "hold" | "cardio";

function metricModeForPractice(practice?: string): FitMetricMode {
  if (practice === "hiit" || practice === "military" || practice === "functional") return "interval";
  if (practice === "yoga" || practice === "mobility" || practice === "stretching") return "hold";
  if (practice === "cardio") return "cardio";
  if (practice === "calisthenics" || practice === "core") return "bodyweight";
  return "strength";
}

function formatSetPerformance(set: FitSet | undefined, mode: FitMetricMode) {
  if (!set) return "—";
  if (mode === "hold") return `${Math.max(0, Number(set.durationSec) || 0)} s`;
  if (mode === "interval") return `${Math.max(0, Number(set.reps) || 0)} reps · ${Math.max(0, Number(set.durationSec) || 0)} s`;
  if (mode === "cardio") {
    const km = Math.max(0, Number(set.distanceM) || 0) / 1000;
    const min = Math.max(0, Number(set.durationSec) || 0) / 60;
    return `${km.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} km · ${Math.round(min)} min`;
  }
  if (mode === "bodyweight") {
    const load = Math.max(0, Number(set.weightKg) || 0);
    return `${Math.max(0, Number(set.reps) || 0)} reps${load > 0 ? ` · +${load} kg` : ""}`;
  }
  return `${Math.max(0, Number(set.weightKg) || 0)} kg × ${Math.max(0, Number(set.reps) || 0)}`;
}

export default function FitPerfModule({ go, store, params }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const activeProfile = profiles.find((item: any) => String(item?.id || "") === String(store?.activeProfileId || "")) || profiles[0] || null;
  const requestedTemplateId = String(params?.fitTemplateId || "free");
  const requestedTemplate = FIT_TEMPLATES.find((item) => item.id === requestedTemplateId) || null;

  const [view, setView] = React.useState<View>(() => params?.fitView === "history" ? "history" : "setup");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(requestedTemplate?.id || "free");
  const [programExerciseIds, setProgramExerciseIds] = React.useState<Record<string, string[]>>(() => Object.fromEntries(FIT_TEMPLATES.map((template) => [template.id, [...template.exerciseIds]])));
  const [session, setSession] = React.useState<FitSession | null>(null);
  const [restSeconds, setRestSeconds] = React.useState(initialRestSeconds);
  const [restLeft, setRestLeft] = React.useState(0);
  const [exerciseFilter, setExerciseFilter] = React.useState("Tous");
  const [exerciseSearch, setExerciseSearch] = React.useState("");
  const [showExercisePicker, setShowExercisePicker] = React.useState(false);
  const [expandedExerciseRowId, setExpandedExerciseRowId] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(Date.now());
  const [catalog, setCatalog] = React.useState(() => getCachedFitCatalog());
  const [freeCatalogLoading, setFreeCatalogLoading] = React.useState(false);
  const [freeCatalogError, setFreeCatalogError] = React.useState("");
  const pickerExercises = catalog.exercises;
  const externalExercises = React.useMemo(() => catalog.exercises.filter((exercise) => exercise.source === "free-exercise-db" || exercise.source === "wger"), [catalog.exercises]);

  const activateFreeCatalog = async () => {
    if (freeCatalogLoading) return;
    setFreeCatalogLoading(true);
    setFreeCatalogError("");
    try {
      setCatalog(await loadFitCatalog(false));
    } catch (error) {
      setFreeCatalogError(error instanceof Error ? error.message : String(error));
    } finally {
      setFreeCatalogLoading(false);
    }
  };


  React.useEffect(() => {
    if ((view !== "setup" && view !== "workout") || catalog.sources.some((source) => source.id === "wger" && source.available) || freeCatalogLoading) return;
    void activateFreeCatalog();
    // The catalogue resolves thumbnails and enables richer randomized programs in setup/workout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  React.useEffect(() => {
    if (view !== "workout") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [view]);

  React.useEffect(() => {
    if (restLeft <= 0) return;
    const timer = window.setInterval(() => setRestLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restLeft]);

  const effectiveTemplate = React.useCallback((templateId: string): FitTemplate | null => {
    const base = FIT_TEMPLATES.find((item) => item.id === templateId) || null;
    if (!base) return null;
    return { ...base, exerciseIds: programExerciseIds[base.id] || base.exerciseIds };
  }, [programExerciseIds]);

  const shuffle = React.useCallback(<T,>(items: T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, []);

  const randomizeProgram = React.useCallback((templateId: string) => {
    const pool = pickerExercises;
    const byMuscles = (muscles: string[]) => pool.filter((exercise) => muscles.includes(exercise.muscle) || (exercise.secondary || []).some((muscle) => muscles.includes(muscle)));
    let ids: string[] = [];
    if (templateId === "push") ids = shuffle(byMuscles(["Pectoraux", "Épaules", "Triceps"])).slice(0, 6).map((exercise) => exercise.id);
    if (templateId === "pull") ids = shuffle(byMuscles(["Dos", "Biceps", "Lombaires", "Ischios"])).slice(0, 5).map((exercise) => exercise.id);
    if (templateId === "legs") ids = shuffle(byMuscles(["Quadriceps", "Ischios", "Fessiers", "Mollets", "Adducteurs", "Abducteurs"])).slice(0, 5).map((exercise) => exercise.id);
    if (templateId === "full") {
      const buckets = [
        byMuscles(["Pectoraux", "Épaules"]),
        byMuscles(["Dos", "Biceps"]),
        byMuscles(["Quadriceps", "Fessiers"]),
        byMuscles(["Ischios", "Lombaires"]),
        byMuscles(["Abdos"]),
        pool.filter((exercise) => exercise.muscle === "Full body"),
      ];
      const picked: string[] = [];
      buckets.forEach((bucket) => {
        const candidate = shuffle(bucket).find((exercise) => !picked.includes(exercise.id));
        if (candidate) picked.push(candidate.id);
      });
      ids = picked;
      if (ids.length < 6) ids.push(...shuffle(pool.filter((exercise) => !ids.includes(exercise.id))).slice(0, 6 - ids.length).map((exercise) => exercise.id));
    }
    const fallback = FIT_TEMPLATES.find((item) => item.id === templateId)?.exerciseIds || [];
    setProgramExerciseIds((current) => ({ ...current, [templateId]: ids.length >= 4 ? ids : [...fallback] }));
  }, [pickerExercises, shuffle]);

  const startWorkout = (templateId = selectedTemplateId) => {
    const template = effectiveTemplate(templateId);
    const next = createSessionFromTemplate(template, { profileId: activeProfile?.id, profileName: activeProfile?.name });
    const requestedSessionTitle = String(params?.fitSessionTitle || "").trim();
    const requestedProgramId = String(params?.fitProgramId || "").trim();
    const requestedProgram = requestedProgramId ? getFitProgramCatalog().find((item) => item.id === requestedProgramId) || null : null;
    next.programId = requestedProgram?.id || undefined;
    next.practice = String(params?.fitPractice || requestedProgram?.practice || "musculation");
    if (requestedSessionTitle) next.title = requestedSessionTitle;
    if (templateId === "free") {
      next.exercises = [];
      if (!requestedSessionTitle) next.title = t("SÉANCE LIBRE", "FREE WORKOUT", "SESIÓN LIBRE");
      const requestedExerciseId = String(params?.fitExerciseId || "");
      if (requestedExerciseId && exerciseById(requestedExerciseId)) {
        next.exercises = [{ id: makeId("sx"), exerciseId: requestedExerciseId, sets: defaultSets(20, 3, 10) }];
      }
    }
    setSession(next);
    setExpandedExerciseRowId(next.exercises[0]?.id || null);
    setView("workout");
    setNow(Date.now());
  };

  React.useEffect(() => {
    if (params?.fitAutoStart === false) return;
    if (requestedTemplate) startWorkout(requestedTemplate.id);
    else if (requestedTemplateId === "free" && (params?.fitSessionTitle || params?.fitProgramId)) startWorkout("free");
    else return;
    // One-shot navigation params only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const selectedTemplate = effectiveTemplate(selectedTemplateId);
  const selectedTemplateExerciseIds = selectedTemplate?.exerciseIds || [];
  const previewQueryById: Record<string, string[]> = {
    bench: ["bench press"], "incline-db": ["incline dumbbell"], "cable-fly": ["cable crossover", "cable fly"], pullup: ["pullup", "pull-up"], row: ["barbell row"],
    "lat-pulldown": ["lat pulldown"], ohp: ["military press", "overhead press"], "lateral-raise": ["lateral raise"], curl: ["hammer curl", "biceps curl"],
    "triceps-push": ["triceps pushdown"], squat: ["squat"], "leg-press": ["leg press"], rdl: ["romanian deadlift"], "hip-thrust": ["hip thrust"], calf: ["calf raise"], deadlift: ["deadlift"], plank: ["plank"], goblet: ["goblet squat"],
  };
  const exercisePreviewUrl = (exerciseId: string) => {
    const premium = getAwenaPremiumMotion(exerciseId);
    const premiumPoster = premium?.video?.poster || premium?.frameSequence?.poster;
    if (premiumPoster) return premiumPoster;
    const direct = pickerExercises.find((item) => item.id === exerciseId);
    if (direct) return freeExerciseImageUrl(direct);
    const queries = previewQueryById[exerciseId] || [];
    const match = pickerExercises.find((item) => queries.some((query) => item.name.toLowerCase().includes(query)));
    return match ? freeExerciseImageUrl(match) : null;
  };


  const updateExercise = React.useCallback((exerciseRowId: string, updater: (row: FitSessionExercise) => FitSessionExercise) => {
    setSession((current) => current ? { ...current, exercises: current.exercises.map((row) => row.id === exerciseRowId ? updater(row) : row) } : current);
  }, []);

  const updateSet = (exerciseRowId: string, setId: string, patch: Partial<FitSet>) => {
    updateExercise(exerciseRowId, (row) => ({ ...row, sets: row.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }));
  };

  const toggleSet = (exerciseRowId: string, setId: string) => {
    let completedNow = false;
    updateExercise(exerciseRowId, (row) => ({
      ...row,
      sets: row.sets.map((set) => {
        if (set.id !== setId) return set;
        completedNow = !set.completed;
        return { ...set, completed: completedNow };
      }),
    }));
    if (completedNow) {
      const mode = metricModeForPractice(session?.practice);
      if (mode !== "hold" && mode !== "cardio") setRestLeft(restSeconds);
    }
  };

  const addSet = (exerciseRowId: string) => {
    updateExercise(exerciseRowId, (row) => {
      const last = row.sets[row.sets.length - 1];
      const mode = metricModeForPractice(session?.practice);
      const next: FitSet = {
        id: makeId("set"),
        weightKg: mode === "strength" ? Number(last?.weightKg ?? 20) : Number(last?.weightKg ?? 0),
        reps: mode === "hold" || mode === "cardio" ? 0 : Number(last?.reps ?? 10),
        durationSec: Number(last?.durationSec ?? (mode === "hold" ? 30 : mode === "interval" ? 40 : mode === "cardio" ? 600 : 0)),
        distanceM: Number(last?.distanceM ?? (mode === "cardio" ? 1000 : 0)),
        rounds: Number(last?.rounds ?? 1),
        completed: false,
      };
      return { ...row, sets: [...row.sets, next] };
    });
  };

  const removeSet = (exerciseRowId: string, setId: string) => {
    updateExercise(exerciseRowId, (row) => ({ ...row, sets: row.sets.filter((set) => set.id !== setId) }));
  };

  const addExercise = (exerciseId: string) => {
    const rowId = makeId("sx");
    let added = false;
    setSession((current) => {
      if (!current) return current;
      if (current.exercises.some((row) => row.exerciseId === exerciseId)) return current;
      added = true;
      const mode = metricModeForPractice(current.practice);
      const sets = defaultSets(mode === "strength" ? 20 : 0, 3, mode === "hold" || mode === "cardio" ? 0 : 10).map((set) => ({
        ...set,
        durationSec: mode === "hold" ? 30 : mode === "interval" ? 40 : mode === "cardio" ? 600 : 0,
        distanceM: mode === "cardio" ? 1000 : 0,
      }));
      const next: FitSessionExercise = { id: rowId, exerciseId, sets };
      return { ...current, exercises: [...current.exercises, next] };
    });
    if (added) setExpandedExerciseRowId(rowId);
    setShowExercisePicker(false);
  };

  const removeExercise = (exerciseRowId: string) => {
    setSession((current) => current ? { ...current, exercises: current.exercises.filter((row) => row.id !== exerciseRowId) } : current);
  };

  const finishWorkout = () => {
    if (!session) return;
    const done = { ...session, endedAt: Date.now() };
    appendFitSession(done);
    try { window.dispatchEvent(new CustomEvent("dc:fit-session-saved", { detail: { sessionId: done.id } })); } catch {}
    setSession(null);
    setRestLeft(0);
    go("home");
  };

  const changeRestSeconds = (value: number) => {
    const next = Math.max(15, Math.min(600, value));
    setRestSeconds(next);
    try { localStorage.setItem(REST_SECONDS_KEY, String(next)); } catch {}
  };

  if (view === "history") {
    const history = fitSessionsForProfile(loadFitSessions(), activeProfile?.id);
    return (
      <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
        <FitShell>
          <style>{fitUiCss}</style>
          <FitIconTabs<"setup" | "history"> value="history" onChange={(next) => setView(next)} accent={accent} items={[
            { id: "setup", label: t("Démarrer", "Start", "Empezar"), icon: "workout" },
            { id: "history", label: t("Historique", "History", "Historial"), icon: "history", badge: history.length || undefined },
          ]}/>
          <FitGlassCard accent={accent} style={{ padding: 16 }}><FitPill accent={accent}>FIT PERF · {t("HISTORIQUE", "HISTORY", "HISTORIAL")}</FitPill><div style={{ marginTop: 9, fontSize: 23, fontWeight: 1000 }}>{t("Tes séances", "Your workouts", "Tus sesiones")}</div><div style={{ marginTop: 5, color: textSoft, fontSize: 9.5 }}>{activeProfile?.name || t("Profil actif", "Active profile", "Perfil activo")}</div></FitGlassCard>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {history.map((item) => <FitGlassCard key={item.id} accent={accent} style={{ padding: 12, display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center" }}><div style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", color: accent, background: `${accent}12`, border: `1px solid ${accent}35` }}><FitIcon name="history" size={20}/></div><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{item.title}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.5 }}>{new Date(item.endedAt || item.startedAt).toLocaleString()} · {completedSets(item)} {t("séries", "sets", "series")}</div></div><div style={{ textAlign: "right" }}><div style={{ color: accent, fontSize: 11, fontWeight: 1000 }}>{formatVolume(sessionVolume(item))}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8 }}>{formatDuration(sessionDurationMs(item, item.endedAt || item.startedAt))}</div></div></FitGlassCard>)}
            {!history.length ? <FitGlassCard accent={accent} style={{ padding: 24, textAlign: "center", color: textSoft }}>{t("Aucune séance enregistrée pour ce profil.", "No workout saved for this profile.", "No hay sesiones guardadas para este perfil.")}</FitGlassCard> : null}
          </div>
        </FitShell>
      </div>
    );
  }

  if (view === "workout" && session) {
    const doneSets = completedSets(session);
    const allSets = totalSets(session);
    const progress = allSets ? (doneSets / allSets) * 100 : 0;
    const practiceId = (session.practice || "musculation") as FitPracticeId;
    const practiceMeta = FIT_PRACTICES.find((item) => item.id === practiceId) || FIT_PRACTICES[0];
    const metricMode = metricModeForPractice(practiceId);
    const focusedIndexRaw = session.exercises.findIndex((row) => row.id === expandedExerciseRowId);
    const focusedIndex = focusedIndexRaw >= 0 ? focusedIndexRaw : (session.exercises.length ? 0 : -1);
    const focusedRow = focusedIndex >= 0 ? session.exercises[focusedIndex] : null;
    const focusedExercise = focusedRow ? exerciseById(focusedRow.exerciseId) : null;
    const workoutHistory = fitSessionsForProfile(loadFitSessions(), activeProfile?.id).filter((item) => item.id !== session.id);
    const previousSetForExercise = (exerciseId: string) => {
      for (const historicSession of workoutHistory) {
        const historicRow = historicSession.exercises.find((item) => item.exerciseId === exerciseId);
        const completed = historicRow?.sets.filter((set) => set.completed) || [];
        if (completed.length) return completed[completed.length - 1];
      }
      return undefined;
    };
    const focusedPreviousSet = focusedRow ? previousSetForExercise(focusedRow.exerciseId) : undefined;
    const focusedDone = focusedRow?.sets.filter((set) => set.completed).length || 0;
    const focusedTotal = focusedRow?.sets.length || 0;
    const focusedComplete = focusedTotal > 0 && focusedDone === focusedTotal;
    const focusedNextSetIndex = focusedRow ? Math.max(0, focusedRow.sets.findIndex((set) => !set.completed)) : -1;
    const focusedSetLabel =
      metricMode === "strength" ? "KG · REPS" :
      metricMode === "bodyweight" ? "REPS · CHARGE +" :
      metricMode === "interval" ? "TEMPS · REPS" :
      metricMode === "hold" ? "MAINTIEN · RESP." :
      "DISTANCE · TEMPS";
    const focusExerciseAt = (index: number) => {
      if (!session.exercises.length) return;
      const safe = Math.max(0, Math.min(session.exercises.length - 1, index));
      setExpandedExerciseRowId(session.exercises[safe].id);
    };
    const reusePreviousPerformance = () => {
      if (!focusedRow || !focusedPreviousSet) return;
      const target = focusedRow.sets.find((set) => !set.completed) || focusedRow.sets[0];
      if (!target) return;
      updateSet(focusedRow.id, target.id, {
        weightKg: Number(focusedPreviousSet.weightKg || 0),
        reps: Number(focusedPreviousSet.reps || 0),
        durationSec: Number(focusedPreviousSet.durationSec || 0),
        distanceM: Number(focusedPreviousSet.distanceM || 0),
        rounds: Number(focusedPreviousSet.rounds || 0),
      });
    };
    const filteredExercises = pickerExercises.filter((exercise) => {
      const matchesFilter = exerciseMatchesMuscle(exercise, exerciseFilter as any);
      const q = exerciseSearch.trim().toLowerCase();
      const matchesSearch = !q || exercise.name.toLowerCase().includes(q) || exercise.muscle.toLowerCase().includes(q) || exercise.equipment.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });

    return (
      <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
        <FitShell>
          <style>{fitUiCss}</style>
          <FitGlassCard accent={accent} style={{ marginTop: 4, padding: 10, position: "sticky", top: "calc(env(safe-area-inset-top, 0px) + 6px)", zIndex: 30, background: "rgba(6,8,13,.985)", backdropFilter: "blur(18px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <FitPill accent="#75ed9a">● LIVE</FitPill>
                <div style={{ marginTop: 5, fontSize: 15, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.title}</div>
                <div style={{ marginTop: 3, color: textSoft, fontSize: 8 }}>{formatDuration(sessionDurationMs(session, now))} · {doneSets}/{allSets} {t("séries", "sets", "series")} · {formatVolume(sessionVolume(session))}</div>
              </div>
              <div style={{ textAlign: "right" }}><div style={{ color: accent, fontSize: 18, fontWeight: 1000 }}>{Math.round(progress)}%</div><div style={{ color: textSoft, fontSize: 7 }}>PROGRESSION</div></div>
            </div>
            <div style={{ marginTop: 10 }}><FitProgress value={progress} accent={accent} height={8} /></div>
          </FitGlassCard>

          {restLeft > 0 ? <FitGlassCard accent="#75ed9a" style={{ marginTop: 10, padding: 13, background: "linear-gradient(145deg,rgba(25,48,36,.985),rgba(7,11,16,.995))" }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(117,237,154,.10)", border: "1px solid rgba(117,237,154,.28)", color: "#75ed9a", fontSize: 18, fontWeight: 1000 }}>⏱</div>
              <div><div style={{ color: "#75ed9a", fontSize: 9, fontWeight: 1000, letterSpacing: 1 }}>RÉCUPÉRATION</div><div style={{ marginTop: 4, fontSize: 25, lineHeight: 1, fontWeight: 1000 }}>{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")}</div></div>
              <div style={{ display: "grid", gap: 5 }}><FitGhostButton onClick={() => setRestLeft((value) => Math.max(0, value - 15))} style={{ minHeight: 30, fontSize: 10 }}>−15s</FitGhostButton><FitGhostButton onClick={() => setRestLeft((value) => value + 15)} style={{ minHeight: 30, fontSize: 10 }}>+15s</FitGhostButton></div>
            </div>
            <div style={{ marginTop: 9 }}><FitProgress value={(restLeft / Math.max(1, restSeconds)) * 100} accent="#75ed9a" height={6} /></div>
          </FitGlassCard> : null}

          {focusedExercise && focusedRow ? <FitGlassCard accent={focusedExercise.accent} style={{ marginTop: 10, padding: 12, background: `linear-gradient(135deg,${focusedExercise.accent}14,rgba(6,9,14,.995) 38%,rgba(4,6,10,.998))`, borderColor: `${focusedExercise.accent}52` }}>
            <div style={{ display: "grid", gridTemplateColumns: "82px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
              <div style={{ width: 82, height: 82, borderRadius: 18, overflow: "hidden", display: "grid", placeItems: "center", color: focusedExercise.accent, background: `${focusedExercise.accent}12`, border: `1px solid ${focusedExercise.accent}38`, fontSize: 28, fontWeight: 1000 }}>
                {exercisePreviewUrl(focusedExercise.id) ? <img src={exercisePreviewUrl(focusedExercise.id) || undefined} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/> : focusedExercise.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <FitPill accent={practiceMeta.accent}>{practiceMeta.icon} {practiceMeta.label.toUpperCase()}</FitPill>
                  <FitPill accent={focusedExercise.accent}>{focusedIndex + 1}/{session.exercises.length}</FitPill>
                </div>
                <div style={{ marginTop: 7, fontSize: 18, lineHeight: 1.05, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{focusedExercise.name}</div>
                <div style={{ marginTop: 4, color: textSoft, fontSize: 9 }}>{focusedExercise.muscle} · {focusedExercise.equipment}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: textSoft, fontSize: 8, fontWeight: 900 }}>{t("DERNIÈRE FOIS", "LAST TIME", "ÚLTIMA VEZ")}</span>
                  <b style={{ color: focusedPreviousSet ? "#fff" : textSoft, fontSize: 10.5 }}>{formatSetPerformance(focusedPreviousSet, metricMode)}</b>
                  {focusedPreviousSet ? <button type="button" onClick={reusePreviousPerformance} style={{ marginLeft: "auto", minHeight: 27, borderRadius: 9, border: `1px solid ${focusedExercise.accent}38`, background: `${focusedExercise.accent}0c`, color: focusedExercise.accent, padding: "0 8px", fontSize: 7.3, fontWeight: 1000, cursor: "pointer" }}>{t("REPRENDRE", "REUSE", "REUTILIZAR")}</button> : null}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 44px", gap: 7 }}>
              <button type="button" disabled={focusedIndex <= 0} onClick={() => focusExerciseAt(focusedIndex - 1)} aria-label={t("Exercice précédent", "Previous exercise", "Ejercicio anterior")} style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", color: focusedIndex <= 0 ? "rgba(255,255,255,.22)" : "#fff", fontSize: 18 }}>‹</button>
              <div style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${focusedExercise.accent}28`, background: `${focusedExercise.accent}08`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 9px", textAlign: "center" }}>
                <span style={{ color: focusedExercise.accent, fontSize: 8, fontWeight: 1000, letterSpacing: .7 }}>{metricMode === "strength" ? "KG · REPS" : metricMode === "bodyweight" ? "REPS · CHARGE +" : metricMode === "interval" ? "REPS · TEMPS" : metricMode === "hold" ? "MAINTIEN · TEMPS" : "DISTANCE · TEMPS"}</span>
              </div>
              <button type="button" disabled={focusedIndex >= session.exercises.length - 1} onClick={() => focusExerciseAt(focusedIndex + 1)} aria-label={t("Exercice suivant", "Next exercise", "Ejercicio siguiente")} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${focusedExercise.accent}40`, background: `${focusedExercise.accent}0e`, color: focusedIndex >= session.exercises.length - 1 ? "rgba(255,255,255,.22)" : focusedExercise.accent, fontSize: 18 }}>›</button>
            </div>
          </FitGlassCard> : null}

          <FitSectionTitle
            eyebrow={t("EXERCICE ACTUEL", "CURRENT EXERCISE", "EJERCICIO ACTUAL")}
            title={focusedExercise?.name || t("Ajoute un exercice", "Add an exercise", "Añade un ejercicio")}
            right={focusedRow ? <FitPill accent={focusedComplete ? "#75ed9a" : focusedExercise?.accent || accent}>{focusedDone}/{focusedTotal}</FitPill> : null}
          />

          {focusedExercise && focusedRow ? <>
            <FitGlassCard accent={focusedExercise.accent} style={{ padding: 11, borderColor: `${focusedExercise.accent}55`, background: `linear-gradient(160deg,${focusedExercise.accent}11,rgba(6,9,14,.995) 36%,rgba(4,6,10,.998))` }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ color: focusedExercise.accent, fontSize: 7.4, fontWeight: 1000, letterSpacing: .8 }}>{focusedSetLabel}</div>
                  <div style={{ marginTop: 3, color: "#fff", fontSize: 12.5, fontWeight: 1000 }}>
                    {focusedComplete
                      ? t("Exercice terminé", "Exercise complete", "Ejercicio terminado")
                      : t(`Série ${focusedNextSetIndex + 1} sur ${focusedTotal}`, `Set ${focusedNextSetIndex + 1} of ${focusedTotal}`, `Serie ${focusedNextSetIndex + 1} de ${focusedTotal}`)}
                  </div>
                </div>
                <div style={{ minWidth: 74, textAlign: "right" }}>
                  <div style={{ color: textSoft, fontSize: 6.8, fontWeight: 1000, letterSpacing: .55 }}>{t("DERNIÈRE FOIS", "LAST TIME", "ÚLTIMA VEZ")}</div>
                  <div style={{ marginTop: 2, color: focusedPreviousSet ? "#fff" : textSoft, fontSize: 10, fontWeight: 1000 }}>{formatSetPerformance(focusedPreviousSet, metricMode)}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) minmax(0,1fr) 44px", gap: 7, marginTop: 10, padding: "0 2px", color: textSoft, fontSize: 7.3, fontWeight: 1000, letterSpacing: .55, textAlign: "center" }}>
                <span>#</span>
                <span>{metricMode === "strength" || metricMode === "bodyweight" ? "KG" : metricMode === "cardio" ? "KM" : "SEC"}</span>
                <span>{metricMode === "hold" ? t("RESP", "BREATH", "RESP") : metricMode === "cardio" ? "MIN" : "REPS"}</span>
                <span>OK</span>
              </div>
              <div style={{ display: "grid", gap: 7, marginTop: 5 }}>
                {focusedRow.sets.map((set, index) => <SetRow
                  key={set.id}
                  index={index}
                  set={set}
                  accent={focusedExercise.accent}
                  mode={metricMode}
                  onWeight={(weightKg) => updateSet(focusedRow.id, set.id, { weightKg })}
                  onReps={(reps) => updateSet(focusedRow.id, set.id, { reps })}
                  onDuration={(durationSec) => updateSet(focusedRow.id, set.id, { durationSec })}
                  onDistance={(distanceM) => updateSet(focusedRow.id, set.id, { distanceM })}
                  onToggle={() => toggleSet(focusedRow.id, set.id)}
                  onRemove={() => removeSet(focusedRow.id, set.id)}
                />)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7, marginTop: 9 }}>
                <FitGhostButton onClick={() => addSet(focusedRow.id)} accent={focusedExercise.accent} style={{ minHeight: 39, color: focusedExercise.accent, fontSize: 8.8 }}>＋ {t("AJOUTER UNE SÉRIE", "ADD SET", "AÑADIR SERIE")}</FitGhostButton>
                {focusedPreviousSet ? <FitGhostButton onClick={reusePreviousPerformance} accent={focusedExercise.accent} style={{ minHeight: 39, color: focusedExercise.accent, fontSize: 8 }}>{t("REPRENDRE", "REUSE", "REUTILIZAR")}</FitGhostButton> : null}
              </div>

              {focusedComplete && focusedIndex < session.exercises.length - 1 ? <FitPrimaryButton onClick={() => focusExerciseAt(focusedIndex + 1)} accent="#75ed9a" style={{ width: "100%", minHeight: 46, marginTop: 9 }}>
                {t("EXERCICE SUIVANT", "NEXT EXERCISE", "SIGUIENTE EJERCICIO")} →
              </FitPrimaryButton> : null}
            </FitGlassCard>

            <FitSectionTitle eyebrow={t("SÉANCE", "WORKOUT", "SESIÓN")} title={t("File d’exercices", "Exercise queue", "Cola de ejercicios")} right={<FitPill accent={accent}>{focusedIndex + 1}/{session.exercises.length}</FitPill>} />
            <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "1px 1px 5px", scrollSnapType: "x proximity" }}>
              {session.exercises.map((row, exerciseIndex) => {
                const exercise = exerciseById(row.exerciseId);
                if (!exercise) return null;
                const rowDone = row.sets.filter((set) => set.completed).length;
                const complete = row.sets.length > 0 && rowDone === row.sets.length;
                const active = row.id === focusedRow.id;
                return <button
                  key={row.id}
                  type="button"
                  onClick={() => setExpandedExerciseRowId(row.id)}
                  style={{
                    flex: "0 0 118px",
                    minWidth: 0,
                    scrollSnapAlign: "start",
                    borderRadius: 15,
                    border: `1px solid ${active ? exercise.accent + "77" : complete ? "rgba(117,237,154,.38)" : "rgba(255,255,255,.08)"}`,
                    background: active ? `${exercise.accent}12` : "rgba(255,255,255,.025)",
                    color: "#fff",
                    padding: 7,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ height: 62, borderRadius: 11, overflow: "hidden", display: "grid", placeItems: "center", background: `radial-gradient(circle at center,${exercise.accent}16,#05080d 72%)` }}>
                    {exercisePreviewUrl(exercise.id) ? <img src={exercisePreviewUrl(exercise.id) || undefined} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/> : <span style={{ color: exercise.accent, fontSize: 22, fontWeight: 1000 }}>{exercise.icon}</span>}
                  </div>
                  <div style={{ marginTop: 6, color: active ? exercise.accent : "#fff", fontSize: 8.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.name}</div>
                  <div style={{ marginTop: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, color: complete ? "#75ed9a" : textSoft, fontSize: 7.2, fontWeight: 900 }}>
                    <span>{String(exerciseIndex + 1).padStart(2, "0")}</span><span>{complete ? "✓" : `${rowDone}/${row.sets.length}`}</span>
                  </div>
                </button>;
              })}
              <button type="button" onClick={() => setShowExercisePicker(true)} style={{ flex: "0 0 86px", minHeight: 102, borderRadius: 15, border: `1px dashed ${accent}55`, background: `${accent}08`, color: accent, display: "grid", placeItems: "center", alignContent: "center", gap: 4, fontWeight: 1000 }}>
                <span style={{ fontSize: 24 }}>＋</span><span style={{ fontSize: 7.2 }}>{t("AJOUTER", "ADD", "AÑADIR")}</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7, marginTop: 5 }}>
              <FitGhostButton onClick={() => setShowExercisePicker(true)} style={{ minHeight: 40 }}>＋ {t("AJOUTER / REMPLACER", "ADD / REPLACE", "AÑADIR / CAMBIAR")}</FitGhostButton>
              <button type="button" aria-label={t("Supprimer l'exercice", "Remove exercise", "Eliminar ejercicio")} onClick={() => removeExercise(focusedRow.id)} style={{ minWidth: 42, borderRadius: 11, border: "1px solid rgba(255,110,110,.18)", background: "rgba(255,90,90,.055)", color: "#ff8b8b", fontSize: 17 }}>×</button>
            </div>
          </> : <FitGlassCard accent={accent} style={{ padding: "28px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 34 }}>＋</div>
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 1000 }}>{t("Construis ta séance", "Build your workout", "Construye tu sesión")}</div>
            <div style={{ margin: "6px auto 0", maxWidth: 380, color: textSoft, fontSize: 10, lineHeight: 1.5 }}>{t("Ajoute ton premier exercice puis renseigne tes séries.", "Add your first exercise, then enter your sets.", "Añade tu primer ejercicio y registra tus series.")}</div>
            <FitPrimaryButton onClick={() => setShowExercisePicker(true)} accent={accent} style={{ width: "100%", minHeight: 45, marginTop: 12 }}>＋ {t("AJOUTER UN EXERCICE", "ADD EXERCISE", "AÑADIR EJERCICIO")}</FitPrimaryButton>
          </FitGlassCard>}

          {(metricMode === "strength" || metricMode === "bodyweight" || metricMode === "interval") ? <details style={{ marginTop: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(6,9,14,.985)", overflow: "hidden" }}>
            <summary style={{ listStyle: "none", minHeight: 42, padding: "0 11px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 9.5, fontWeight: 1000 }}>
              <span style={{ color: "#75ed9a" }}>⏱</span>{t("Repos automatique", "Automatic rest", "Descanso automático")}
              <span style={{ marginLeft: "auto", color: "#75ed9a" }}>{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")}</span>
            </summary>
            <div style={{ padding: "0 10px 10px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>{[60, 90, 120, 180].map((seconds) => <button key={seconds} type="button" onClick={() => changeRestSeconds(seconds)} style={{ minHeight: 34, borderRadius: 10, border: `1px solid ${restSeconds === seconds ? "rgba(117,237,154,.55)" : "rgba(255,255,255,.07)"}`, background: restSeconds === seconds ? "rgba(117,237,154,.12)" : "rgba(255,255,255,.03)", color: restSeconds === seconds ? "#75ed9a" : "#fff", fontWeight: 900 }}>{seconds / 60}m</button>)}</div>
          </details> : null}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 8, marginTop: 12 }}><FitGhostButton onClick={() => { setSession(null); setView("setup"); }} style={{ minHeight: 52 }}>{t("ANNULER", "CANCEL", "CANCELAR")}</FitGhostButton><FitPrimaryButton onClick={finishWorkout} disabled={doneSets === 0} accent="#75ed9a" style={{ minHeight: 52 }}>✓ {t("TERMINER LA SÉANCE", "FINISH WORKOUT", "TERMINAR SESIÓN")}</FitPrimaryButton></div>

          {showExercisePicker ? <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 10 }} onClick={() => setShowExercisePicker(false)}>
            <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 720, maxHeight: "82vh", overflow: "auto", borderRadius: "24px 24px 16px 16px", padding: 14, background: "#0b0e14", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 -20px 60px rgba(0,0,0,.55)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: 1 }}>BIBLIOTHÈQUE FIT PERF</div><div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000 }}>{t("Choisir un exercice", "Choose exercise", "Elegir ejercicio")}</div></div><button type="button" onClick={() => setShowExercisePicker(false)} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer", fontSize: 19 }}>×</button></div>
              <div style={{ marginTop: 10, padding: 9, borderRadius: 13, border: "1px solid rgba(114,222,244,.18)", background: "rgba(114,222,244,.035)", display: "flex", alignItems: "center", gap: 8 }}><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: "#72def4", fontSize: 8, fontWeight: 1000 }}>FIT CATALOG · MULTI-SOURCES · 0 €</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.5 }}>{externalExercises.length ? `${pickerExercises.length} ${t("exercices dédupliqués disponibles", "deduplicated exercises available", "ejercicios deduplicados disponibles")}` : t("Active le catalogue multi-sources 1 200+", "Enable the 1,200+ multi-source catalogue", "Activa el catálogo multifuente 1.200+")}</div></div>{!externalExercises.length ? <button type="button" disabled={freeCatalogLoading} onClick={() => void activateFreeCatalog()} style={{ minHeight: 32, borderRadius: 10, border: "1px solid rgba(114,222,244,.34)", background: "rgba(114,222,244,.08)", color: "#72def4", padding: "0 9px", fontSize: 7, fontWeight: 1000 }}>{freeCatalogLoading ? "…" : t("ACTIVER", "ENABLE", "ACTIVAR")}</button> : null}</div>
              {freeCatalogError ? <div style={{ marginTop: 5, color: "#ff8b8b", fontSize: 7 }}>{freeCatalogError}</div> : null}
              <input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder={t("Rechercher un exercice, muscle, matériel…", "Search exercise, muscle, equipment…", "Buscar ejercicio, músculo, material…")} style={{ width: "100%", boxSizing: "border-box", marginTop: 10, minHeight: 44, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", padding: "0 12px", outline: "none" }} />
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 9, paddingBottom: 2 }}>{["Tous", ...FIT_MUSCLE_ORDER].map((filter) => <button key={filter} type="button" onClick={() => setExerciseFilter(filter)} style={{ flex: "0 0 auto", minHeight: 32, padding: "0 10px", borderRadius: 999, border: `1px solid ${exerciseFilter === filter ? accent + "66" : "rgba(255,255,255,.07)"}`, background: exerciseFilter === filter ? `${accent}12` : "rgba(255,255,255,.025)", color: exerciseFilter === filter ? accent : "#fff", fontSize: 9.5, fontWeight: 900, cursor: "pointer" }}>{filter}</button>)}</div>
              <div style={{ display: "grid", gap: 7, marginTop: 10 }}>{filteredExercises.slice(0, exerciseSearch.trim() ? 100 : 70).map((exercise) => {
                const exists = session.exercises.some((row) => row.exerciseId === exercise.id);
                return <button key={exercise.id} type="button" disabled={exists} onClick={() => addExercise(exercise.id)} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center", minHeight: 58, borderRadius: 14, padding: "8px 10px", textAlign: "left", border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.028)", color: exists ? "rgba(255,255,255,.35)" : "#fff", cursor: exists ? "default" : "pointer" }}><div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", color: exercise.accent, background: `${exercise.accent}10`, border: `1px solid ${exercise.accent}32`, fontSize: 18, fontWeight: 1000 }}>{exercise.icon}</div><div style={{ minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11.5, fontWeight: 950 }}>{exercise.name}</div>{exercise.source === "free-exercise-db" || exercise.source === "wger" ? <span style={{ flex: "0 0 auto", color: "#72def4", fontSize: 6, border: "1px solid rgba(114,222,244,.25)", borderRadius: 999, padding: "2px 4px" }}>OPEN</span> : null}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{exercise.muscle} · {exercise.equipment}</div></div><b style={{ color: exists ? textSoft : accent, fontSize: 16 }}>{exists ? "✓" : "+"}</b></button>;
              })}</div>
            </div>
          </div> : null}
        </FitShell>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
      <FitShell>
        <style>{fitUiCss}</style>
        <FitIconTabs<"setup" | "history"> value="setup" onChange={(next) => setView(next)} accent={accent} items={[
          { id: "setup", label: t("Démarrer", "Start", "Empezar"), icon: "workout" },
          { id: "history", label: t("Historique", "History", "Historial"), icon: "history", badge: fitSessionsForProfile(loadFitSessions(), activeProfile?.id).length || undefined },
        ]}/>
        <FitGlassCard accent={accent} style={{ marginTop: 2, padding: 12, display: "grid", gridTemplateColumns: "44px 1fr", gap: 11, alignItems: "center", background: "linear-gradient(180deg,rgba(8,11,18,.99),rgba(5,8,13,.995))", borderColor: "rgba(255,255,255,.12)" }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", color: accent, background: `${accent}10`, border: `1px solid ${accent}32` }}><FitIcon name="workout" size={20}/></div>
          <div><div style={{ color: accent, fontSize: 7.8, fontWeight: 1000, letterSpacing: .9 }}>FIT PERF · TRAINING</div><div style={{ marginTop: 2, fontSize: 14, fontWeight: 1000 }}>{t("Prépare ta séance", "Prepare your workout", "Prepara tu sesión")}</div></div>
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("DÉMARRAGE RAPIDE", "QUICK START", "INICIO RÁPIDO")} title={t("Choisis ta séance", "Choose your workout", "Elige tu sesión")} />
        <div style={{ display: "grid", gap: 9 }}>
          <TemplateCard selected={selectedTemplateId === "free"} accent="#72def4" title={t("SÉANCE LIBRE", "FREE WORKOUT", "SESIÓN LIBRE")} onClick={() => setSelectedTemplateId("free")} wide imageUrl={TEMPLATE_VISUALS.free.imageUrl} imagePosition={TEMPLATE_VISUALS.free.imagePosition} contentSide="right" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
            {FIT_TEMPLATES.map((template) => {
              const visual = TEMPLATE_VISUALS[template.id] || null;
              const contentSide = template.id === "full" ? "left" : "right";
              const titleLines = template.id === "full" ? ["FULL", "BODY"] : undefined;
              return <TemplateCard key={template.id} selected={selectedTemplateId === template.id} accent={template.accent} title={template.name} titleLines={titleLines} onClick={() => setSelectedTemplateId(template.id)} imageUrl={visual?.imageUrl} imagePosition={visual?.imagePosition} contentSide={contentSide} />;
            })}
          </div>
        </div>

        {selectedTemplate ? <FitGlassCard accent={selectedTemplate.accent} style={{ marginTop: 11, padding: 12, background: `linear-gradient(145deg,${selectedTemplate.accent}10,rgba(6,9,15,.99) 28%,rgba(3,6,10,.995))`, borderColor: `${selectedTemplate.accent}46`, boxShadow: "0 14px 34px rgba(0,0,0,.48)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><div><div style={{ color: selectedTemplate.accent, fontSize: 8, fontWeight: 1000, letterSpacing: .9 }}>{t("PROGRAMME SÉLECTIONNÉ", "SELECTED PROGRAM", "PROGRAMA SELECCIONADO")}</div><div style={{ marginTop: 3, fontSize: 15, fontWeight: 1000 }}>{selectedTemplate.name}</div><div style={{ marginTop: 3, color: "rgba(255,255,255,.68)", fontSize: 8.4 }}>{selectedTemplate.subtitle}</div></div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><button type="button" onClick={() => randomizeProgram(selectedTemplate.id)} title={t("Générer une autre séance", "Generate another workout", "Generar otra sesión")} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${selectedTemplate.accent}45`, background: `${selectedTemplate.accent}0f`, color: selectedTemplate.accent, display: "grid", placeItems: "center", cursor: "pointer" }}><FitIcon name="shuffle" size={19}/></button><FitPill accent={selectedTemplate.accent}>{selectedTemplate.exerciseIds.length} EXOS</FitPill></div></div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>{selectedTemplateExerciseIds.map((exerciseId) => { const ex = exerciseById(exerciseId); const image = exercisePreviewUrl(exerciseId); if (!ex) return null; return <div key={exerciseId} style={{ minWidth: 0, overflow: "hidden", borderRadius: 12, border: `1px solid ${ex.accent}30`, background: "rgba(12,16,23,.99)" }}><div style={{ height: 72, display: "grid", placeItems: "center", background: `radial-gradient(circle at center,${ex.accent}18,#05080d 72%)`, overflow: "hidden" }}>{image ? <img src={image} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/> : <div style={{ color: ex.accent, fontSize: 26, fontWeight: 1000 }}>{ex.icon}</div>}</div><div style={{ padding: "6px 6px 7px", fontSize: 7.2, lineHeight: 1.15, fontWeight: 950, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.name}</div></div>; })}</div>
          <button type="button" onClick={() => randomizeProgram(selectedTemplate.id)} style={{ width: "100%", minHeight: 38, marginTop: 9, borderRadius: 12, border: `1px solid ${selectedTemplate.accent}3f`, background: `${selectedTemplate.accent}0c`, color: selectedTemplate.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 8.3, fontWeight: 1000, letterSpacing: .5, cursor: "pointer" }}><FitIcon name="shuffle" size={17}/>{t("NOUVEAU TIRAGE", "NEW RANDOM SET", "NUEVO SORTEO")}</button>
        </FitGlassCard> : null}

        <FitPrimaryButton onClick={() => startWorkout()} accent={accent} style={{ width: "100%", marginTop: 11, minHeight: 58, fontSize: 13 }}>▶ {t("DÉMARRER LA SÉANCE", "START WORKOUT", "INICIAR SESIÓN")}</FitPrimaryButton>

        <FitGlassCard accent="#72def4" style={{ marginTop: 12, padding: 12, display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center", background: "linear-gradient(180deg,rgba(7,12,18,.99),rgba(4,8,13,.995))", borderColor: "rgba(114,222,244,.24)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", color: "#72def4", background: "rgba(114,222,244,.10)", border: "1px solid rgba(114,222,244,.30)" }}><FitIcon name="library" size={20}/></div>
          <div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{t("Bibliothèque d’exercices", "Exercise library", "Biblioteca de ejercicios")}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.8 }}>{t("Exercices, favoris, programmes et guides AWENA sont regroupés dans l’onglet EXERCICES.", "Exercises, favorites, programs and AWENA guides are grouped in the EXERCISES tab.", "Ejercicios, favoritos, programas y guías AWENA están en la pestaña EJERCICIOS.")}</div></div>
          <button type="button" onClick={() => go("fit_plan")} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(114,222,244,.35)", background: "rgba(114,222,244,.08)", color: "#72def4" }}>›</button>
        </FitGlassCard>

        <details style={{ marginTop: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(6,9,14,.985)", overflow: "hidden" }}>
          <summary style={{ listStyle: "none", minHeight: 44, padding: "0 11px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 10.5, fontWeight: 1000 }}><span style={{ color: "#72def4", display: "grid" }}><FitIcon name="info" size={17}/></span>{t("Calculs automatiques", "Automatic calculations", "Cálculos automáticos")}<span style={{ marginLeft: "auto", color: textSoft }}>＋</span></summary>
          <div style={{ padding: "0 9px 9px", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>{[{ icon: "∑", title: t("Volume", "Volume", "Volumen"), sub: "charge × reps × séries", accent: "#76e4f7" }, { icon: "1", title: "1RM", sub: t("estimation Epley", "Epley estimate", "estimación Epley"), accent: "#b59cff" }, { icon: "PR", title: t("Records", "Records", "Récords"), sub: t("par exercice", "per exercise", "por ejercicio"), accent }, { icon: "⏱", title: t("Repos", "Rest", "Descanso"), sub: t("automatique", "automatic", "automático"), accent: "#75ed9a" }].map((item) => <div key={item.title} style={{ padding: 9, borderRadius: 11, background: "rgba(255,255,255,.025)" }}><div style={{ color: item.accent, fontSize: 14, fontWeight: 1000 }}>{item.icon}</div><div style={{ marginTop: 4, fontSize: 9.5, fontWeight: 1000 }}>{item.title}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.5 }}>{item.sub}</div></div>)}</div>
        </details>
      </FitShell>
    </div>
  );
}

function TemplateBackdrop({ imageUrl, imagePosition = "center center", selected }: { imageUrl?: string; imagePosition?: string; selected: boolean; contentSide?: "left" | "right" }) {
  if (!imageUrl) return null;
  return <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}>
    <img src={imageUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: imagePosition, filter: "saturate(1) contrast(1.04) brightness(1)", transform: selected ? "scale(1.01)" : "scale(1)", transition: "transform .18s ease" }} />
  </div>;
}

function TemplateCard({ selected, accent, title, titleLines, onClick, wide = false, imageUrl, imagePosition, contentSide = "right" }: { selected: boolean; accent: string; title: string; titleLines?: string[]; onClick: () => void; wide?: boolean; imageUrl?: string; imagePosition?: string; contentSide?: "left" | "right" }) {
  const alignRight = contentSide === "right";
  const lines = titleLines?.length ? titleLines : [title];
  return <button type="button" onClick={onClick} style={{ minHeight: wide ? 104 : 124, borderRadius: 18, textAlign: alignRight ? "right" : "left", color: "#fff", padding: wide ? "16px 16px" : "12px 12px", border: `1px solid ${selected ? accent + "88" : "rgba(255,255,255,.12)"}`, background: "linear-gradient(180deg,rgba(8,12,18,.99),rgba(4,7,12,.995))", boxShadow: selected ? `0 10px 28px ${accent}18` : "0 8px 22px rgba(0,0,0,.34)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: alignRight ? "flex-end" : "flex-start", justifyContent: "center", transition: "border-color .18s ease,background .18s ease,transform .18s ease", position: "relative", overflow: "hidden", isolation: "isolate" }}>
    <TemplateBackdrop imageUrl={imageUrl} imagePosition={imagePosition} selected={selected} />
    <span style={{ position: "relative", zIndex: 2, width: wide ? "min(58%, 320px)" : "58%", minWidth: 0, display: "flex", flexDirection: "column", alignItems: alignRight ? "flex-end" : "flex-start", justifyContent: "center" }}>
      {lines.map((line) => <b key={line} style={{ display: "block", width: "100%", color: accent, fontSize: wide ? 14.5 : 13, lineHeight: lines.length > 1 ? 1.04 : 1.1, fontWeight: 1000, letterSpacing: .28, textShadow: `0 0 14px ${accent}45, 0 2px 10px rgba(0,0,0,.7)` }}>{line}</b>)}
    </span>
  </button>;
}

function SetRow({
  index,
  set,
  accent,
  mode,
  onWeight,
  onReps,
  onDuration,
  onDistance,
  onToggle,
  onRemove,
}: {
  index: number;
  set: FitSet;
  accent: string;
  mode: FitMetricMode;
  onWeight: (value: number) => void;
  onReps: (value: number) => void;
  onDuration: (value: number) => void;
  onDistance: (value: number) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    height: 42,
    borderRadius: 11,
    border: `1px solid ${set.completed ? accent + "55" : "rgba(255,255,255,.08)"}`,
    background: set.completed ? `${accent}14` : "rgba(16,21,29,.98)",
    color: "#fff",
    textAlign: "center",
    fontSize: 14,
    fontWeight: 950,
    outline: "none",
    boxSizing: "border-box",
  };

  const metricA = mode === "cardio"
    ? <input inputMode="decimal" type="number" min="0" step="0.1" value={Math.round((Number(set.distanceM) || 0) / 100) / 10} onChange={(event) => onDistance(Math.max(0, Number(event.target.value) || 0) * 1000)} style={inputStyle}/>
    : mode === "interval" || mode === "hold"
      ? <input inputMode="numeric" type="number" min="0" step="5" value={Math.max(0, Math.round(Number(set.durationSec) || 0))} onChange={(event) => onDuration(Math.max(0, Math.round(Number(event.target.value) || 0)))} style={inputStyle}/>
      : <input inputMode="decimal" type="number" min="0" step="0.5" value={set.weightKg} onChange={(event) => onWeight(Math.max(0, Number(event.target.value) || 0))} style={inputStyle}/>;

  const metricB = mode === "cardio"
    ? <input inputMode="decimal" type="number" min="0" step="1" value={Math.round((Number(set.durationSec) || 0) / 6) / 10} onChange={(event) => onDuration(Math.max(0, Number(event.target.value) || 0) * 60)} style={inputStyle}/>
    : <input inputMode="numeric" type="number" min="0" step="1" value={set.reps} onChange={(event) => onReps(Math.max(0, Math.round(Number(event.target.value) || 0)))} style={inputStyle}/>;

  return <div
    style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) minmax(0,1fr) 40px", gap: 6, alignItems: "center", opacity: set.completed ? .92 : 1 }}
    onContextMenu={(event) => { event.preventDefault(); onRemove(); }}
  >
    <div style={{ width: 32, height: 42, borderRadius: 10, display: "grid", placeItems: "center", color: set.completed ? accent : "rgba(255,255,255,.55)", background: set.completed ? `${accent}12` : "rgba(14,19,27,.98)", border: `1px solid ${set.completed ? accent + "35" : "rgba(255,255,255,.06)"}`, fontWeight: 950, fontSize: 11 }}>{index + 1}</div>
    {metricA}
    {metricB}
    <button type="button" onClick={onToggle} aria-label={set.completed ? "Annuler la série" : "Valider la série"} style={{ width: 40, height: 42, borderRadius: 10, border: `1px solid ${set.completed ? accent + "66" : "rgba(255,255,255,.08)"}`, background: set.completed ? accent : "rgba(255,255,255,.035)", color: set.completed ? "#090b0d" : "#fff", fontWeight: 1000, cursor: "pointer", boxShadow: set.completed ? `0 0 16px ${accent}28` : "none" }}>{set.completed ? "✓" : "○"}</button>
  </div>;
}
