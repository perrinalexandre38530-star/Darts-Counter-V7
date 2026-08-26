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
  makeId,
  sessionDurationMs,
  sessionVolume,
  totalSets,
  type FitSession,
  type FitSessionExercise,
  type FitSet,
  type FitTemplate,
} from "../../fit/fitStore";
import { FitGlassCard, FitGhostButton, FitPill, FitPrimaryButton, FitProgress, FitSectionTitle, FitShell } from "./FitPerfUi";

type Props = { go: (route: any, params?: any) => void; store?: any; params?: any };
type View = "setup" | "workout" | "history";

const REST_SECONDS_KEY = "mss-fit-perf-rest-seconds-v1";

function initialRestSeconds() {
  try {
    const n = Number(localStorage.getItem(REST_SECONDS_KEY));
    return Number.isFinite(n) && n >= 15 && n <= 600 ? n : 90;
  } catch {
    return 90;
  }
}

export default function FitPerfModule({ go, params }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const requestedTemplateId = String(params?.fitTemplateId || "free");
  const requestedTemplate = FIT_TEMPLATES.find((item) => item.id === requestedTemplateId) || null;

  const [view, setView] = React.useState<View>(() => params?.fitView === "history" ? "history" : "setup");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState(requestedTemplate?.id || "free");
  const [session, setSession] = React.useState<FitSession | null>(null);
  const [restSeconds, setRestSeconds] = React.useState(initialRestSeconds);
  const [restLeft, setRestLeft] = React.useState(0);
  const [exerciseFilter, setExerciseFilter] = React.useState("Tous");
  const [exerciseSearch, setExerciseSearch] = React.useState("");
  const [showExercisePicker, setShowExercisePicker] = React.useState(false);
  const [now, setNow] = React.useState(Date.now());

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

  const startWorkout = (templateId = selectedTemplateId) => {
    const template = FIT_TEMPLATES.find((item) => item.id === templateId) || null;
    const next = createSessionFromTemplate(template);
    if (templateId === "free") {
      next.exercises = [];
      next.title = t("SÉANCE LIBRE", "FREE WORKOUT", "SESIÓN LIBRE");
    }
    setSession(next);
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
    setSession((current) => {
      if (!current) return current;
      if (current.exercises.some((row) => row.exerciseId === exerciseId)) return current;
      const next: FitSessionExercise = { id: makeId("sx"), exerciseId, sets: defaultSets(20, 3, 10) };
      return { ...current, exercises: [...current.exercises, next] };
    });
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

  if (view === "workout" && session) {
    const doneSets = completedSets(session);
    const allSets = totalSets(session);
    const progress = allSets ? (doneSets / allSets) * 100 : 0;
    const filteredExercises = FIT_EXERCISES.filter((exercise) => {
      const matchesFilter = exerciseFilter === "Tous" || exercise.muscle === exerciseFilter;
      const q = exerciseSearch.trim().toLowerCase();
      const matchesSearch = !q || exercise.name.toLowerCase().includes(q) || exercise.muscle.toLowerCase().includes(q) || exercise.equipment.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });

    return (
      <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
        <FitShell>
          <FitGlassCard accent={accent} style={{ marginTop: 8, padding: 14, position: "sticky", top: "calc(env(safe-area-inset-top, 0px) + 6px)", zIndex: 30, background: "rgba(8,10,15,.94)", backdropFilter: "blur(18px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <FitPill accent="#75ed9a">● LIVE</FitPill>
                <div style={{ marginTop: 7, fontSize: 19, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.title}</div>
                <div style={{ marginTop: 4, color: textSoft, fontSize: 9.5 }}>{formatDuration(sessionDurationMs(session, now))} · {doneSets}/{allSets} {t("séries", "sets", "series")} · {formatVolume(sessionVolume(session))}</div>
              </div>
              <div style={{ textAlign: "right" }}><div style={{ color: accent, fontSize: 22, fontWeight: 1000 }}>{Math.round(progress)}%</div><div style={{ color: textSoft, fontSize: 8.5 }}>PROGRESSION</div></div>
            </div>
            <div style={{ marginTop: 10 }}><FitProgress value={progress} accent={accent} height={8} /></div>
          </FitGlassCard>

          {restLeft > 0 ? <FitGlassCard accent="#75ed9a" style={{ marginTop: 10, padding: 13, background: "linear-gradient(145deg,rgba(117,237,154,.08),rgba(255,255,255,.02))" }}>
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
              return <FitGlassCard key={row.id} accent={exercise.accent} style={{ padding: 13 }}>
                <div style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", color: exercise.accent, background: `${exercise.accent}12`, border: `1px solid ${exercise.accent}38`, fontSize: 18, fontWeight: 1000 }}>{exercise.icon}</div>
                  <div style={{ minWidth: 0 }}><div style={{ color: exercise.accent, fontSize: 8.5, fontWeight: 1000, letterSpacing: .9 }}>{String(exerciseIndex + 1).padStart(2, "0")} · {exercise.muscle.toUpperCase()}</div><div style={{ marginTop: 3, fontSize: 13, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.name}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{exercise.equipment} · {rowDone}/{row.sets.length} {t("validées", "completed", "completadas")}</div></div>
                  <button type="button" aria-label={t("Supprimer l'exercice", "Remove exercise", "Eliminar ejercicio")} onClick={() => removeExercise(row.id)} style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.035)", color: textSoft, cursor: "pointer" }}>×</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) minmax(0,1fr) 40px", gap: 6, marginTop: 12, padding: "0 2px", color: textSoft, fontSize: 8.5, fontWeight: 900, letterSpacing: .6, textAlign: "center" }}><span>#</span><span>KG</span><span>REPS</span><span>OK</span></div>
                <div style={{ display: "grid", gap: 6, marginTop: 5 }}>
                  {row.sets.map((set, index) => <SetRow key={set.id} index={index} set={set} accent={exercise.accent} onWeight={(weightKg) => updateSet(row.id, set.id, { weightKg })} onReps={(reps) => updateSet(row.id, set.id, { reps })} onToggle={() => toggleSet(row.id, set.id)} onRemove={() => removeSet(row.id, set.id)} />)}
                </div>
                <FitGhostButton onClick={() => addSet(row.id)} accent={exercise.accent} style={{ width: "100%", marginTop: 8, minHeight: 38, color: exercise.accent }}>＋ {t("AJOUTER UNE SÉRIE", "ADD SET", "AÑADIR SERIE")}</FitGhostButton>
              </FitGlassCard>;
            })}
          </div>

          {!session.exercises.length ? <FitGlassCard accent={accent} style={{ padding: "28px 18px", textAlign: "center" }}><div style={{ fontSize: 34 }}>＋</div><div style={{ marginTop: 8, fontSize: 14, fontWeight: 1000 }}>{t("Construis ta séance", "Build your workout", "Construye tu sesión")}</div><div style={{ margin: "6px auto 0", maxWidth: 380, color: textSoft, fontSize: 10, lineHeight: 1.5 }}>{t("Ajoute ton premier exercice puis renseigne tes charges et tes répétitions série par série.", "Add your first exercise, then enter loads and reps set by set.", "Añade tu primer ejercicio e introduce cargas y repeticiones serie por serie.")}</div></FitGlassCard> : null}

          <FitPrimaryButton onClick={() => setShowExercisePicker(true)} accent={accent} style={{ width: "100%", marginTop: 10 }}>＋ {t("AJOUTER UN EXERCICE", "ADD EXERCISE", "AÑADIR EJERCICIO")}</FitPrimaryButton>

          <FitSectionTitle eyebrow={t("RÉCUPÉRATION", "RECOVERY", "RECUPERACIÓN")} title={t("Chronomètre automatique", "Automatic rest timer", "Temporizador automático")} />
          <FitGlassCard accent="#75ed9a" style={{ padding: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{t("Repos après chaque série validée", "Rest after each completed set", "Descanso tras cada serie completada")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 9.5 }}>{t("Réglage mémorisé pour les prochaines séances.", "Setting is saved for future workouts.", "Ajuste guardado para futuras sesiones.")}</div></div><b style={{ color: "#75ed9a", fontSize: 18 }}>{Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")}</b></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 10 }}>{[60, 90, 120, 180].map((seconds) => <button key={seconds} type="button" onClick={() => changeRestSeconds(seconds)} style={{ minHeight: 36, borderRadius: 11, border: `1px solid ${restSeconds === seconds ? "rgba(117,237,154,.55)" : "rgba(255,255,255,.07)"}`, background: restSeconds === seconds ? "rgba(117,237,154,.12)" : "rgba(255,255,255,.03)", color: restSeconds === seconds ? "#75ed9a" : "#fff", fontWeight: 900, cursor: "pointer" }}>{seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}</button>)}</div>
          </FitGlassCard>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 8, marginTop: 12 }}><FitGhostButton onClick={() => { setSession(null); setView("setup"); }} style={{ minHeight: 52 }}>{t("ANNULER", "CANCEL", "CANCELAR")}</FitGhostButton><FitPrimaryButton onClick={finishWorkout} disabled={doneSets === 0} accent="#75ed9a" style={{ minHeight: 52 }}>✓ {t("TERMINER LA SÉANCE", "FINISH WORKOUT", "TERMINAR SESIÓN")}</FitPrimaryButton></div>

          {showExercisePicker ? <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 10 }} onClick={() => setShowExercisePicker(false)}>
            <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 720, maxHeight: "82vh", overflow: "auto", borderRadius: "24px 24px 16px 16px", padding: 14, background: "#0b0e14", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 -20px 60px rgba(0,0,0,.55)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: 1 }}>BIBLIOTHÈQUE FIT PERF</div><div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000 }}>{t("Choisir un exercice", "Choose exercise", "Elegir ejercicio")}</div></div><button type="button" onClick={() => setShowExercisePicker(false)} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer", fontSize: 19 }}>×</button></div>
              <input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder={t("Rechercher un exercice, muscle, matériel…", "Search exercise, muscle, equipment…", "Buscar ejercicio, músculo, material…")} style={{ width: "100%", boxSizing: "border-box", marginTop: 12, minHeight: 44, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", padding: "0 12px", outline: "none" }} />
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 9, paddingBottom: 2 }}>{["Tous","Pectoraux","Dos","Épaules","Biceps","Triceps","Quadriceps","Ischios","Fessiers","Abdos"].map((filter) => <button key={filter} type="button" onClick={() => setExerciseFilter(filter)} style={{ flex: "0 0 auto", minHeight: 32, padding: "0 10px", borderRadius: 999, border: `1px solid ${exerciseFilter === filter ? accent + "66" : "rgba(255,255,255,.07)"}`, background: exerciseFilter === filter ? `${accent}12` : "rgba(255,255,255,.025)", color: exerciseFilter === filter ? accent : "#fff", fontSize: 9.5, fontWeight: 900, cursor: "pointer" }}>{filter}</button>)}</div>
              <div style={{ display: "grid", gap: 7, marginTop: 10 }}>{filteredExercises.map((exercise) => {
                const exists = session.exercises.some((row) => row.exerciseId === exercise.id);
                return <button key={exercise.id} type="button" disabled={exists} onClick={() => addExercise(exercise.id)} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center", minHeight: 58, borderRadius: 14, padding: "8px 10px", textAlign: "left", border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.028)", color: exists ? "rgba(255,255,255,.35)" : "#fff", cursor: exists ? "default" : "pointer" }}><div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", color: exercise.accent, background: `${exercise.accent}10`, border: `1px solid ${exercise.accent}32`, fontSize: 18, fontWeight: 1000 }}>{exercise.icon}</div><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{exercise.name}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{exercise.muscle} · {exercise.equipment}</div></div><b style={{ color: exists ? textSoft : accent, fontSize: 16 }}>{exists ? "✓" : "+"}</b></button>;
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
        <FitGlassCard accent={accent} style={{ marginTop: 8, padding: 18, borderRadius: 26, background: "linear-gradient(145deg, rgba(8,11,17,.98), rgba(16,19,29,.97))" }}>
          <FitPill accent={accent}>FIT PERF · TRAINING</FitPill>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 1000, letterSpacing: -1 }}>{t("Prépare ta séance", "Prepare your workout", "Prepara tu sesión")}</div>
          <div style={{ marginTop: 6, color: textSoft, fontSize: 10.5, lineHeight: 1.45 }}>{t("Choisis un format ou démarre librement. Chaque série sera enregistrée individuellement pour alimenter tes statistiques et records.", "Choose a format or start freely. Every set is stored individually to power your stats and records.", "Elige un formato o empieza libremente. Cada serie se guarda individualmente para alimentar estadísticas y récords.")}</div>
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("DÉMARRAGE RAPIDE", "QUICK START", "INICIO RÁPIDO")} title={t("Choisis ta séance", "Choose your workout", "Elige tu sesión")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
          <TemplateCard template={null} selected={selectedTemplateId === "free"} accent={accent} title={t("SÉANCE LIBRE", "FREE WORKOUT", "SESIÓN LIBRE")} subtitle={t("Tu choisis les exercices", "You choose the exercises", "Tú eliges los ejercicios")} onClick={() => setSelectedTemplateId("free")} />
          {FIT_TEMPLATES.map((template) => <TemplateCard key={template.id} template={template} selected={selectedTemplateId === template.id} accent={template.accent} title={template.name} subtitle={template.subtitle} onClick={() => setSelectedTemplateId(template.id)} />)}
        </div>

        <FitPrimaryButton onClick={() => startWorkout()} accent={accent} style={{ width: "100%", marginTop: 11, minHeight: 58, fontSize: 13 }}>▶ {t("DÉMARRER LA SÉANCE", "START WORKOUT", "INICIAR SESIÓN")}</FitPrimaryButton>

        <FitSectionTitle eyebrow={t("BIBLIOTHÈQUE", "LIBRARY", "BIBLIOTECA")} title={t("Exercices intégrés", "Built-in exercises", "Ejercicios integrados")} right={<FitPill accent="#76e4f7">{FIT_EXERCISES.length} EXOS</FitPill>} />
        <FitGlassCard accent="#76e4f7" style={{ padding: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
            {FIT_EXERCISES.slice(0, 8).map((exercise) => <div key={exercise.id} style={{ minHeight: 58, borderRadius: 13, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)", padding: 9, display: "grid", gridTemplateColumns: "32px 1fr", gap: 8, alignItems: "center" }}><div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", color: exercise.accent, background: `${exercise.accent}10`, border: `1px solid ${exercise.accent}28`, fontWeight: 1000 }}>{exercise.icon}</div><div style={{ minWidth: 0 }}><div style={{ fontSize: 9.5, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.name}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.5 }}>{exercise.muscle}</div></div></div>)}
          </div>
          <div style={{ marginTop: 9, color: textSoft, fontSize: 9.5, lineHeight: 1.45 }}>{t("La bibliothèque complète devient accessible pendant la séance via “Ajouter un exercice”.", "The full library is available during workouts via “Add exercise”.", "La biblioteca completa está disponible durante la sesión mediante “Añadir ejercicio”.")}</div>
        </FitGlassCard>

        <FitSectionTitle eyebrow={t("SUIVI INTELLIGENT", "SMART TRACKING", "SEGUIMIENTO INTELIGENTE")} title={t("Ce que FIT PERF calcule déjà", "What FIT PERF already calculates", "Lo que FIT PERF ya calcula")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          {[{ icon: "∑", title: t("Volume", "Volume", "Volumen"), sub: "charge × reps × séries", accent: "#76e4f7" }, { icon: "1", title: "1RM", sub: t("estimation Epley", "Epley estimate", "estimación Epley"), accent: "#b59cff" }, { icon: "PR", title: t("Records", "Records", "Récords"), sub: t("par exercice", "per exercise", "por ejercicio"), accent }, { icon: "⏱", title: t("Repos", "Rest", "Descanso"), sub: t("chrono automatique", "automatic timer", "temporizador automático"), accent: "#75ed9a" }].map((item) => <FitGlassCard key={item.title} accent={item.accent} style={{ padding: 12 }}><div style={{ color: item.accent, fontSize: 18, fontWeight: 1000 }}>{item.icon}</div><div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 950 }}>{item.title}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 9 }}>{item.sub}</div></FitGlassCard>)}
        </div>
      </FitShell>
    </div>
  );
}

function TemplateCard({ template, selected, accent, title, subtitle, onClick }: { template: FitTemplate | null; selected: boolean; accent: string; title: string; subtitle: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ minHeight: 126, borderRadius: 18, textAlign: "left", color: "#fff", padding: 12, border: `1px solid ${selected ? accent + "88" : "rgba(255,255,255,.08)"}`, background: selected ? `linear-gradient(145deg,${accent}1d,rgba(255,255,255,.025))` : "linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018))", boxShadow: selected ? `0 10px 30px ${accent}15` : "none", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10 }}><span style={{ width: 36, height: 36, borderRadius: 11, display: "grid", placeItems: "center", color: accent, background: `${accent}12`, border: `1px solid ${accent}40`, fontSize: 16, fontWeight: 1000 }}>{template?.icon || "+"}</span><span><b style={{ display: "block", color: selected ? accent : "#fff", fontSize: 12.5 }}>{title}</b><small style={{ display: "block", marginTop: 5, color: "rgba(255,255,255,.53)", fontSize: 9.3, lineHeight: 1.35 }}>{subtitle}</small></span></button>;
}

function SetRow({ index, set, accent, onWeight, onReps, onToggle, onRemove }: { index: number; set: FitSet; accent: string; onWeight: (value: number) => void; onReps: (value: number) => void; onToggle: () => void; onRemove: () => void }) {
  const inputStyle: React.CSSProperties = { width: "100%", minWidth: 0, height: 38, borderRadius: 10, border: `1px solid ${set.completed ? accent + "55" : "rgba(255,255,255,.07)"}`, background: set.completed ? `${accent}0c` : "rgba(255,255,255,.035)", color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 900, outline: "none", boxSizing: "border-box" };
  return <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) minmax(0,1fr) 40px", gap: 6, alignItems: "center", opacity: set.completed ? .92 : 1 }} onContextMenu={(event) => { event.preventDefault(); onRemove(); }}><div style={{ width: 32, height: 38, borderRadius: 10, display: "grid", placeItems: "center", color: set.completed ? accent : "rgba(255,255,255,.55)", background: set.completed ? `${accent}10` : "rgba(255,255,255,.025)", border: `1px solid ${set.completed ? accent + "35" : "rgba(255,255,255,.06)"}`, fontWeight: 950, fontSize: 11 }}>{index + 1}</div><input inputMode="decimal" type="number" min="0" step="0.5" value={set.weightKg} onChange={(event) => onWeight(Math.max(0, Number(event.target.value) || 0))} style={inputStyle}/><input inputMode="numeric" type="number" min="0" step="1" value={set.reps} onChange={(event) => onReps(Math.max(0, Math.round(Number(event.target.value) || 0)))} style={inputStyle}/><button type="button" onClick={onToggle} aria-label={set.completed ? "Annuler la série" : "Valider la série"} style={{ width: 40, height: 38, borderRadius: 10, border: `1px solid ${set.completed ? accent + "66" : "rgba(255,255,255,.08)"}`, background: set.completed ? accent : "rgba(255,255,255,.035)", color: set.completed ? "#090b0d" : "#fff", fontWeight: 1000, cursor: "pointer", boxShadow: set.completed ? `0 0 16px ${accent}28` : "none" }}>{set.completed ? "✓" : "○"}</button></div>;
}
