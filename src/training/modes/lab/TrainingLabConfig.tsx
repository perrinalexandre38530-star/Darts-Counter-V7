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
import { buildCoachPrescription, buildTrainingDiagnosis, chooseRecommendedFamily } from "../../coach/trainingDiagnosis";
import {
  TRAINING_EXERCISE_CATALOG,
  TRAINING_FAMILY_META,
  type TrainingExerciseFamily,
} from "../../catalog/trainingExerciseCatalog";
import { buildCoachProgram, TRAINING_PROGRAMS, type TrainingProgramDefinition } from "../../catalog/trainingProgramCatalog";

const familyOrder: TrainingExerciseFamily[] = ["scoring", "doubles", "checkout", "precision", "bull", "regularity"];
type HubTab = "program" | "exercises" | "diagnosis" | "progress";

function pct(value: number) {
  return `${Math.round(Number(value) || 0)}%`;
}

export default function TrainingLabConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart: (cfg: any) => void; onExit: () => void; }) {
  const [participants, setParticipants] = useTrainingParticipantSelection(profiles);
  const [revision, setRevision] = React.useState(0);
  React.useEffect(() => {
    const refresh = () => setRevision((x) => x + 1);
    window.addEventListener("dc-training-stats-updated", refresh);
    window.addEventListener("dc-training-history-updated", refresh);
    return () => {
      window.removeEventListener("dc-training-stats-updated", refresh);
      window.removeEventListener("dc-training-history-updated", refresh);
    };
  }, []);

  const sessions = React.useMemo(() => {
    void revision;
    return getTrainingDetailedSessions({ limit: 300 });
  }, [revision]);
  const diagnosis = React.useMemo(() => buildTrainingDiagnosis(sessions), [sessions]);
  const recommendedFamily = React.useMemo(() => chooseRecommendedFamily(diagnosis), [diagnosis]);
  const prescription = React.useMemo(() => buildCoachPrescription(diagnosis), [diagnosis]);
  const coachProgram = React.useMemo(() => buildCoachProgram(recommendedFamily), [recommendedFamily]);
  const programs = React.useMemo(() => [coachProgram, ...TRAINING_PROGRAMS], [coachProgram]);

  const [tab, setTab] = React.useState<HubTab>("program");
  const [family, setFamily] = React.useState<TrainingExerciseFamily>(recommendedFamily);
  const firstInFamily = React.useMemo(() => TRAINING_EXERCISE_CATALOG.find((e) => e.family === family) || TRAINING_EXERCISE_CATALOG[0], [family]);
  const [exerciseId, setExerciseId] = React.useState(firstInFamily.id);
  const [programId, setProgramId] = React.useState(coachProgram.id);
  const resolved = resolveTrainingParticipants(participants, profiles);

  React.useEffect(() => {
    if (!TRAINING_EXERCISE_CATALOG.some((e) => e.id === exerciseId && e.family === family)) setExerciseId(firstInFamily.id);
  }, [exerciseId, family, firstInFamily.id]);
  React.useEffect(() => {
    if (programId.startsWith("coach_")) setProgramId(coachProgram.id);
  }, [coachProgram.id]);

  const exercises = TRAINING_EXERCISE_CATALOG.filter((e) => e.family === family);
  const selected = TRAINING_EXERCISE_CATALOG.find((e) => e.id === exerciseId) || firstInFamily;
  const selectedProgram = programs.find((p) => p.id === programId) || coachProgram;
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
    family: recommendedFamily,
    sessionKind: "program",
    ...buildTrainingParticipantConfig(participants, profiles),
  });

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
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 12, position: "sticky", top: 0, zIndex: 3, padding: "6px 0", backdropFilter: "blur(10px)" }}>
            {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} style={{ minWidth: 0, padding: "9px 4px", borderRadius: 11, border: tab === item.id ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.10)", background: tab === item.id ? "rgba(39,220,255,.15)" : "rgba(0,0,0,.2)", color: "inherit", fontSize: 9.5, fontWeight: 950, letterSpacing: .5, cursor: "pointer" }}>{item.label}</button>)}
          </div>

          {tab === "program" && <div>
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
            <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid rgba(39,220,255,.17)", background: "rgba(39,220,255,.045)" }}>
              <div style={{ fontSize: 9.5, opacity: .58 }}>PARCOURS SÉLECTIONNÉ</div>
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedProgram.exerciseIds.map((id, index) => {
                  const ex = TRAINING_EXERCISE_CATALOG.find((e) => e.id === id);
                  return <span key={`${id}-${index}`} style={{ fontSize: 9.5, padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.08)" }}>{index + 1}. {ex?.title || id}</span>;
                })}
              </div>
            </div>
            <TrainingStartButton disabled={!resolved.length} label={resolved.length > 1 ? `LANCER LE PROGRAMME — ${resolved.length} JOUEURS` : `LANCER ${selectedProgram.title}`} onClick={() => startProgram(selectedProgram)} />
          </div>}

          {tab === "exercises" && <div>
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
            <div style={{ margin: "10px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>DERNIÈRES SÉANCES DU CENTRE</div>
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
