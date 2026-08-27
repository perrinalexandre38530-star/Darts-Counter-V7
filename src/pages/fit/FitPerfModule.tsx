import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import {
  FIT_EXERCISES,
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
import { freeExerciseImageUrl, getCachedFreeExerciseCatalog, loadFreeExerciseCatalog } from "../../fit/freeExerciseCatalog";
import { getAwenaPremiumMotion } from "../../fit/awenaPremiumMotions";
import { FIT_MUSCLE_ORDER, exerciseMatchesMuscle } from "../../fit/fitExerciseTaxonomy";
import { FitGlassCard, FitGhostButton, FitIcon, FitIconTabs, FitPill, FitPrimaryButton, FitProgress, FitSectionTitle, FitShell, fitUiCss } from "./FitPerfUi";

type Props = { go: (route: any, params?: any) => void; store?: any; params?: any };
type View = "setup" | "workout" | "history";

const REST_SECONDS_KEY = "mss-fit-perf-rest-seconds-v1";

const TEMPLATE_VISUALS: Record<string, { imageUrl: string; imagePosition?: string }> = {
  free: { imageUrl: "/fit/tickers/free-awena.png", imagePosition: "left center" },
  push: { imageUrl: "/fit/tickers/push-awena.png", imagePosition: "left center" },
  pull: { imageUrl: "/fit/tickers/pull-awena.png", imagePosition: "left center" },
  legs: { imageUrl: "/fit/tickers/legs-awena.png", imagePosition: "left center" },
  full: { imageUrl: "/fit/tickers/full-awena.png", imagePosition: "right center" },
};

function initialRestSeconds() {
  try {
    const n = Number(localStorage.getItem(REST_SECONDS_KEY));
    return Number.isFinite(n) && n >= 15 && n <= 600 ? n : 90;
  } catch {
    return 90;
  }
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
  const [freeExercises, setFreeExercises] = React.useState(() => getCachedFreeExerciseCatalog());
  const [freeCatalogLoading, setFreeCatalogLoading] = React.useState(false);
  const [freeCatalogError, setFreeCatalogError] = React.useState("");
  const pickerExercises = React.useMemo(() => [...FIT_EXERCISES, ...freeExercises], [freeExercises]);

  const activateFreeCatalog = async () => {
    if (freeCatalogLoading) return;
    setFreeCatalogLoading(true);
    setFreeCatalogError("");
    try {
      setFreeExercises(await loadFreeExerciseCatalog(false));
    } catch (error) {
      setFreeCatalogError(error instanceof Error ? error.message : String(error));
    } finally {
      setFreeCatalogLoading(false);
    }
  };


  React.useEffect(() => {
    if ((view !== "setup" && view !== "workout") || freeExercises.length || freeCatalogLoading) return;
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
    const pool = [...FIT_EXERCISES, ...freeExercises];
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
  }, [freeExercises, shuffle]);

  const startWorkout = (templateId = selectedTemplateId) => {
    const template = effectiveTemplate(templateId);
    const next = createSessionFromTemplate(template, { profileId: activeProfile?.id, profileName: activeProfile?.name });
    if (templateId === "free") {
      next.exercises = [];
      next.title = t("SÉANCE LIBRE", "FREE WORKOUT", "SESIÓN LIBRE");
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
    if (!requestedTemplate) return;
    if (params?.fitAutoStart === false) return;
    startWorkout(requestedTemplate.id);
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
    const direct = freeExercises.find((item) => item.id === exerciseId);
    if (direct) return freeExerciseImageUrl(direct);
    const queries = previewQueryById[exerciseId] || [];
    const match = freeExercises.find((item) => queries.some((query) => item.name.toLowerCase().includes(query)));
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
    if (completedNow) setRestLeft(restSeconds);
  };

  const addSet = (exerciseRowId: string) => {
    updateExercise(exerciseRowId, (row) => {
      const last = row.sets[row.sets.length - 1];
      const next: FitSet = { id: makeId("set"), weightKg: Number(last?.weightKg || 20), reps: Number(last?.reps || 10), completed: false };
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
      const next: FitSessionExercise = { id: rowId, exerciseId, sets: defaultSets(20, 3, 10) };
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

          <FitSectionTitle eyebrow={t("SÉANCE EN COURS", "WORKOUT IN PROGRESS", "SESIÓN EN CURSO")} title={t("Séries & charges", "Sets & loads", "Series y cargas")} right={<FitPill accent={accent}>{session.exercises.length} EXOS</FitPill>} />

          <div style={{ display: "grid", gap: 10 }}>
            {session.exercises.map((row, exerciseIndex) => {
              const exercise = exerciseById(row.exerciseId);
              if (!exercise) return null;
              const rowDone = row.sets.filter((set) => set.completed).length;
              const expanded = expandedExerciseRowId === row.id;
              return <FitGlassCard key={row.id} accent={exercise.accent} style={{ overflow: "hidden", borderColor: expanded ? `${exercise.accent}66` : "rgba(255,255,255,.13)", background: expanded ? `linear-gradient(145deg,${exercise.accent}12,rgba(7,10,16,.99) 28%,rgba(4,6,11,.995))` : "linear-gradient(180deg,rgba(9,12,18,.985),rgba(5,8,13,.995))", boxShadow: "0 10px 28px rgba(0,0,0,.48)" }}>
                <div role="button" tabIndex={0} onClick={() => setExpandedExerciseRowId(expanded ? null : row.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setExpandedExerciseRowId(expanded ? null : row.id); }} style={{ display: "grid", gridTemplateColumns: "54px 1fr auto auto", gap: 8, alignItems: "center", padding: 9, cursor: "pointer" }}>
                  <div style={{ width: 52, height: 46, borderRadius: 11, display: "grid", placeItems: "center", color: exercise.accent, background: `${exercise.accent}10`, border: `1px solid ${exercise.accent}30`, fontSize: 16, fontWeight: 1000, overflow: "hidden" }}>{exercisePreviewUrl(exercise.id) ? <img src={exercisePreviewUrl(exercise.id) || undefined} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/> : exercise.icon}</div>
                  <div style={{ minWidth: 0 }}><div style={{ color: exercise.accent, fontSize: 7.4, fontWeight: 1000, letterSpacing: .7 }}>{String(exerciseIndex + 1).padStart(2, "0")} · {exercise.muscle.toUpperCase()}</div><div style={{ marginTop: 2, fontSize: 11.2, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.name}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.8 }}>{rowDone}/{row.sets.length} {t("séries", "sets", "series")}</div></div>
                  <FitPill accent={rowDone === row.sets.length && row.sets.length ? "#75ed9a" : exercise.accent}>{rowDone}/{row.sets.length}</FitPill>
                  <span style={{ color: expanded ? exercise.accent : textSoft, display: "grid", transform: expanded ? "rotate(90deg)" : "none", transition: "transform .18s ease" }}><FitIcon name="chevron" size={16}/></span>
                </div>
                {expanded ? <div style={{ padding: "0 9px 9px", animation: "fitTabLabelIn .18s ease both" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) minmax(0,1fr) 40px", gap: 6, padding: "6px 2px 0", color: textSoft, fontSize: 7.6, fontWeight: 950, letterSpacing: .55, textAlign: "center" }}><span>#</span><span>KG</span><span>REPS</span><span>OK</span></div>
                  <div style={{ display: "grid", gap: 5, marginTop: 4 }}>{row.sets.map((set, index) => <SetRow key={set.id} index={index} set={set} accent={exercise.accent} onWeight={(weightKg) => updateSet(row.id, set.id, { weightKg })} onReps={(reps) => updateSet(row.id, set.id, { reps })} onToggle={() => toggleSet(row.id, set.id)} onRemove={() => removeSet(row.id, set.id)} />)}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 38px", gap: 6, marginTop: 7 }}><FitGhostButton onClick={() => addSet(row.id)} accent={exercise.accent} style={{ minHeight: 36, color: exercise.accent, fontSize: 8.8 }}>＋ {t("AJOUTER UNE SÉRIE", "ADD SET", "AÑADIR SERIE")}</FitGhostButton><button type="button" aria-label={t("Supprimer l'exercice", "Remove exercise", "Eliminar ejercicio")} onClick={() => removeExercise(row.id)} style={{ borderRadius: 11, border: "1px solid rgba(255,110,110,.18)", background: "rgba(255,90,90,.055)", color: "#ff8b8b", fontSize: 17 }}>×</button></div>
                </div> : null}
              </FitGlassCard>;
            })}
          </div>

          {!session.exercises.length ? <FitGlassCard accent={accent} style={{ padding: "28px 18px", textAlign: "center" }}><div style={{ fontSize: 34 }}>＋</div><div style={{ marginTop: 8, fontSize: 14, fontWeight: 1000 }}>{t("Construis ta séance", "Build your workout", "Construye tu sesión")}</div><div style={{ margin: "6px auto 0", maxWidth: 380, color: textSoft, fontSize: 10, lineHeight: 1.5 }}>{t("Ajoute ton premier exercice puis renseigne tes charges et tes répétitions série par série.", "Add your first exercise, then enter loads and reps set by set.", "Añade tu primer ejercicio e introduce cargas y repeticiones serie por serie.")}</div></FitGlassCard> : null}

          <FitPrimaryButton onClick={() => setShowExercisePicker(true)} accent={accent} style={{ width: "100%", marginTop: 10 }}>＋ {t("AJOUTER UN EXERCICE", "ADD EXERCISE", "AÑADIR EJERCICIO")}</FitPrimaryButton>

          <FitSectionTitle eyebrow={t("RÉCUPÉRATION", "RECOVERY", "RECUPERACIÓN")} title={t("Chronomètre automatique", "Automatic rest timer", "Temporizador automático")} />
          <FitGlassCard accent="#75ed9a" style={{ padding: 13, background: "linear-gradient(180deg,rgba(8,14,13,.99),rgba(5,8,12,.995))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{t("Repos après chaque série validée", "Rest after each completed set", "Descanso tras cada serie completada")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 9.5 }}>{t("Réglage mémorisé pour les prochaines séances.", "Setting is saved for future workouts.", "Ajuste guardado para futuras sesiones.")}</div></div><b style={{ color: "#75ed9a", fontSize: 18 }}>{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")}</b></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 10 }}>{[60, 90, 120, 180].map((seconds) => <button key={seconds} type="button" onClick={() => changeRestSeconds(seconds)} style={{ minHeight: 36, borderRadius: 11, border: `1px solid ${restSeconds === seconds ? "rgba(117,237,154,.55)" : "rgba(255,255,255,.07)"}`, background: restSeconds === seconds ? "rgba(117,237,154,.12)" : "rgba(255,255,255,.03)", color: restSeconds === seconds ? "#75ed9a" : "#fff", fontWeight: 900, cursor: "pointer" }}>{seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}</button>)}</div>
          </FitGlassCard>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 8, marginTop: 12 }}><FitGhostButton onClick={() => { setSession(null); setView("setup"); }} style={{ minHeight: 52 }}>{t("ANNULER", "CANCEL", "CANCELAR")}</FitGhostButton><FitPrimaryButton onClick={finishWorkout} disabled={doneSets === 0} accent="#75ed9a" style={{ minHeight: 52 }}>✓ {t("TERMINER LA SÉANCE", "FINISH WORKOUT", "TERMINAR SESIÓN")}</FitPrimaryButton></div>

          {showExercisePicker ? <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 10 }} onClick={() => setShowExercisePicker(false)}>
            <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 720, maxHeight: "82vh", overflow: "auto", borderRadius: "24px 24px 16px 16px", padding: 14, background: "#0b0e14", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 -20px 60px rgba(0,0,0,.55)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: 1 }}>BIBLIOTHÈQUE FIT PERF</div><div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000 }}>{t("Choisir un exercice", "Choose exercise", "Elegir ejercicio")}</div></div><button type="button" onClick={() => setShowExercisePicker(false)} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer", fontSize: 19 }}>×</button></div>
              <div style={{ marginTop: 10, padding: 9, borderRadius: 13, border: "1px solid rgba(114,222,244,.18)", background: "rgba(114,222,244,.035)", display: "flex", alignItems: "center", gap: 8 }}><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: "#72def4", fontSize: 8, fontWeight: 1000 }}>OPEN EXERCISE DB · 0 €</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.5 }}>{freeExercises.length ? `${freeExercises.length} ${t("exercices libres disponibles", "open exercises available", "ejercicios libres disponibles")}` : t("Active la bibliothèque publique de 800+ exercices", "Enable the public 800+ exercise library", "Activa la biblioteca pública de 800+ ejercicios")}</div></div>{!freeExercises.length ? <button type="button" disabled={freeCatalogLoading} onClick={() => void activateFreeCatalog()} style={{ minHeight: 32, borderRadius: 10, border: "1px solid rgba(114,222,244,.34)", background: "rgba(114,222,244,.08)", color: "#72def4", padding: "0 9px", fontSize: 7, fontWeight: 1000 }}>{freeCatalogLoading ? "…" : t("ACTIVER", "ENABLE", "ACTIVAR")}</button> : null}</div>
              {freeCatalogError ? <div style={{ marginTop: 5, color: "#ff8b8b", fontSize: 7 }}>{freeCatalogError}</div> : null}
              <input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder={t("Rechercher un exercice, muscle, matériel…", "Search exercise, muscle, equipment…", "Buscar ejercicio, músculo, material…")} style={{ width: "100%", boxSizing: "border-box", marginTop: 10, minHeight: 44, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", padding: "0 12px", outline: "none" }} />
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 9, paddingBottom: 2 }}>{["Tous", ...FIT_MUSCLE_ORDER].map((filter) => <button key={filter} type="button" onClick={() => setExerciseFilter(filter)} style={{ flex: "0 0 auto", minHeight: 32, padding: "0 10px", borderRadius: 999, border: `1px solid ${exerciseFilter === filter ? accent + "66" : "rgba(255,255,255,.07)"}`, background: exerciseFilter === filter ? `${accent}12` : "rgba(255,255,255,.025)", color: exerciseFilter === filter ? accent : "#fff", fontSize: 9.5, fontWeight: 900, cursor: "pointer" }}>{filter}</button>)}</div>
              <div style={{ display: "grid", gap: 7, marginTop: 10 }}>{filteredExercises.slice(0, exerciseSearch.trim() ? 100 : 70).map((exercise) => {
                const exists = session.exercises.some((row) => row.exerciseId === exercise.id);
                return <button key={exercise.id} type="button" disabled={exists} onClick={() => addExercise(exercise.id)} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center", minHeight: 58, borderRadius: 14, padding: "8px 10px", textAlign: "left", border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.028)", color: exists ? "rgba(255,255,255,.35)" : "#fff", cursor: exists ? "default" : "pointer" }}><div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", color: exercise.accent, background: `${exercise.accent}10`, border: `1px solid ${exercise.accent}32`, fontSize: 18, fontWeight: 1000 }}>{exercise.icon}</div><div style={{ minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11.5, fontWeight: 950 }}>{exercise.name}</div>{exercise.source === "free-exercise-db" ? <span style={{ flex: "0 0 auto", color: "#72def4", fontSize: 6, border: "1px solid rgba(114,222,244,.25)", borderRadius: 999, padding: "2px 4px" }}>OPEN</span> : null}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{exercise.muscle} · {exercise.equipment}</div></div><b style={{ color: exists ? textSoft : accent, fontSize: 16 }}>{exists ? "✓" : "+"}</b></button>;
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
          <TemplateCard selected={selectedTemplateId === "free"} accent={accent} title={t("SÉANCE LIBRE", "FREE WORKOUT", "SESIÓN LIBRE")} subtitle={t("Construis ta séance exercice par exercice", "Build your workout exercise by exercise", "Construye tu sesión ejercicio por ejercicio")} onClick={() => setSelectedTemplateId("free")} wide imageUrl={TEMPLATE_VISUALS.free.imageUrl} imagePosition={TEMPLATE_VISUALS.free.imagePosition} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
            {FIT_TEMPLATES.map((template) => {
              const visual = TEMPLATE_VISUALS[template.id] || null;
              return <TemplateCard key={template.id} selected={selectedTemplateId === template.id} accent={template.accent} title={template.name} subtitle={template.subtitle} onClick={() => setSelectedTemplateId(template.id)} imageUrl={visual?.imageUrl} imagePosition={visual?.imagePosition} />;
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

function TemplateBackdrop({ imageUrl, imagePosition = "center center", selected }: { imageUrl?: string; imagePosition?: string; selected: boolean }) {
  if (!imageUrl) return null;
  return <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}>
    <img src={imageUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: imagePosition, filter: `saturate(${selected ? 1 : .95}) contrast(1.05) brightness(${selected ? .88 : .74})`, transform: selected ? "scale(1.02)" : "scale(1)", transition: "transform .18s ease, filter .18s ease" }} />
    <div style={{ position: "absolute", inset: 0, background: selected ? "linear-gradient(180deg,rgba(4,7,12,.20),rgba(4,7,12,.78)),linear-gradient(90deg,rgba(4,7,12,.18),rgba(4,7,12,.08) 42%,rgba(4,7,12,.82))" : "linear-gradient(180deg,rgba(4,7,12,.34),rgba(4,7,12,.88)),linear-gradient(90deg,rgba(4,7,12,.26),rgba(4,7,12,.10) 42%,rgba(4,7,12,.88))" }} />
  </div>;
}

function TemplateCard({ selected, accent, title, subtitle, onClick, wide = false, imageUrl, imagePosition }: { selected: boolean; accent: string; title: string; subtitle: string; onClick: () => void; wide?: boolean; imageUrl?: string; imagePosition?: string }) {
  return <button type="button" onClick={onClick} style={{ minHeight: wide ? 104 : 124, borderRadius: 18, textAlign: "left", color: "#fff", padding: wide ? "16px 16px" : "12px 12px", border: `1px solid ${selected ? accent + "88" : "rgba(255,255,255,.12)"}`, background: "linear-gradient(180deg,rgba(8,12,18,.99),rgba(4,7,12,.995))", boxShadow: selected ? `0 10px 28px ${accent}18` : "0 8px 22px rgba(0,0,0,.34)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: wide ? "flex-start" : "center", justifyContent: wide ? "center" : "flex-end", gap: 6, transition: "border-color .18s ease,background .18s ease,transform .18s ease", position: "relative", overflow: "hidden", isolation: "isolate" }}>
    <TemplateBackdrop imageUrl={imageUrl} imagePosition={imagePosition} selected={selected} />
    <span style={{ position: "relative", zIndex: 2, minWidth: 0, width: wide ? "min(68%, 360px)" : "100%", textAlign: wide ? "left" : "center", padding: wide ? "10px 12px" : "8px 7px", borderRadius: 13, background: wide ? "rgba(4,7,12,.58)" : "rgba(4,7,12,.72)", backdropFilter: "blur(5px)", border: `1px solid ${selected ? accent + "44" : accent + "22"}` }}>
      <b style={{ display: "block", color: selected ? accent : "#fff", fontSize: wide ? 13 : 12, lineHeight: 1.05 }}>{title}</b>
      <small style={{ display: "block", marginTop: 5, color: "rgba(255,255,255,.76)", fontSize: 7.8, lineHeight: 1.25 }}>{subtitle}</small>
    </span>
  </button>;
}

function SetRow({ index, set, accent, onWeight, onReps, onToggle, onRemove }: { index: number; set: FitSet; accent: string; onWeight: (value: number) => void; onReps: (value: number) => void; onToggle: () => void; onRemove: () => void }) {
  const inputStyle: React.CSSProperties = { width: "100%", minWidth: 0, height: 38, borderRadius: 10, border: `1px solid ${set.completed ? accent + "55" : "rgba(255,255,255,.07)"}`, background: set.completed ? `${accent}14` : "rgba(16,21,29,.98)", color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 900, outline: "none", boxSizing: "border-box" };
  return <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) minmax(0,1fr) 40px", gap: 6, alignItems: "center", opacity: set.completed ? .92 : 1 }} onContextMenu={(event) => { event.preventDefault(); onRemove(); }}><div style={{ width: 32, height: 38, borderRadius: 10, display: "grid", placeItems: "center", color: set.completed ? accent : "rgba(255,255,255,.55)", background: set.completed ? `${accent}12` : "rgba(14,19,27,.98)", border: `1px solid ${set.completed ? accent + "35" : "rgba(255,255,255,.06)"}`, fontWeight: 950, fontSize: 11 }}>{index + 1}</div><input inputMode="decimal" type="number" min="0" step="0.5" value={set.weightKg} onChange={(event) => onWeight(Math.max(0, Number(event.target.value) || 0))} style={inputStyle}/><input inputMode="numeric" type="number" min="0" step="1" value={set.reps} onChange={(event) => onReps(Math.max(0, Math.round(Number(event.target.value) || 0)))} style={inputStyle}/><button type="button" onClick={onToggle} aria-label={set.completed ? "Annuler la série" : "Valider la série"} style={{ width: 40, height: 38, borderRadius: 10, border: `1px solid ${set.completed ? accent + "66" : "rgba(255,255,255,.08)"}`, background: set.completed ? accent : "rgba(255,255,255,.035)", color: set.completed ? "#090b0d" : "#fff", fontWeight: 1000, cursor: "pointer", boxShadow: set.completed ? `0 0 16px ${accent}28` : "none" }}>{set.completed ? "✓" : "○"}</button></div>;
}
