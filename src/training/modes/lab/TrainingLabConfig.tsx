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
import { buildTrainingDiagnosis, chooseRecommendedFamily } from "../../coach/trainingDiagnosis";
import {
  TRAINING_EXERCISE_CATALOG,
  TRAINING_FAMILY_META,
  type TrainingExerciseFamily,
} from "../../catalog/trainingExerciseCatalog";

const familyOrder: TrainingExerciseFamily[] = ["scoring", "doubles", "checkout", "precision", "bull", "regularity"];

export default function TrainingLabConfig({ profiles, onStart, onExit }: { profiles?: Profile[]; onStart: (cfg: any) => void; onExit: () => void; }) {
  const [participants, setParticipants] = useTrainingParticipantSelection(profiles);
  const sessions = React.useMemo(() => getTrainingDetailedSessions({ limit: 250 }), []);
  const diagnosis = React.useMemo(() => buildTrainingDiagnosis(sessions), [sessions]);
  const recommendedFamily = React.useMemo(() => chooseRecommendedFamily(diagnosis), [diagnosis]);
  const [family, setFamily] = React.useState<TrainingExerciseFamily>(recommendedFamily);
  const firstInFamily = React.useMemo(() => TRAINING_EXERCISE_CATALOG.find((e) => e.family === family) || TRAINING_EXERCISE_CATALOG[0], [family]);
  const [exerciseId, setExerciseId] = React.useState(firstInFamily.id);
  const resolved = resolveTrainingParticipants(participants, profiles);

  React.useEffect(() => {
    if (!TRAINING_EXERCISE_CATALOG.some((e) => e.id === exerciseId && e.family === family)) setExerciseId(firstInFamily.id);
  }, [exerciseId, family, firstInFamily.id]);

  const exercises = TRAINING_EXERCISE_CATALOG.filter((e) => e.family === family);
  const selected = TRAINING_EXERCISE_CATALOG.find((e) => e.id === exerciseId) || firstInFamily;

  return (
    <TrainingShell
      header={<TrainingHeader title="Centre d'entraînement" tickerId="training_challenges" onBack={onExit} rules={<><p>Choisis une compétence puis un exercice. Le moteur générique enregistre précision, réussite, progression et télémétrie de chaque fléchette.</p><p>La recommandation s'appuie sur tes séances Training enregistrées localement.</p></>} />}
      body={
        <div style={{ width: "min(880px,100%)", margin: "0 auto", paddingBottom: 24 }}>
          <TrainingParticipantsSelector profiles={profiles} value={participants} onChange={setParticipants} />

          <div style={{ margin: "14px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>PROGRAMME / COMPÉTENCE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(138px,1fr))", gap: 8 }}>
            {familyOrder.map((id) => {
              const row = diagnosis.find((x) => x.family === id);
              const active = family === id;
              const recommended = id === recommendedFamily;
              return (
                <button key={id} type="button" onClick={() => setFamily(id)} style={{ textAlign: "left", padding: 11, borderRadius: 14, border: active ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.12)", background: active ? "rgba(39,220,255,.13)" : "rgba(255,255,255,.035)", color: "inherit", cursor: "pointer" }}>
                  <div style={{ fontSize: 11, fontWeight: 950 }}>{TRAINING_FAMILY_META[id].label}{recommended ? " ★" : ""}</div>
                  <div style={{ marginTop: 5, fontSize: 10, opacity: .68 }}>{row?.sessions ? `${row.sessions} séances • ${Math.round(row.accuracyPct)}% précision` : "À découvrir"}</div>
                </button>
              );
            })}
          </div>

          <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>EXERCICES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 9 }}>
            {exercises.map((exercise) => {
              const active = exercise.id === exerciseId;
              return (
                <button key={exercise.id} type="button" onClick={() => setExerciseId(exercise.id)} style={{ textAlign: "left", padding: 13, borderRadius: 15, border: active ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.12)", background: active ? "linear-gradient(135deg,rgba(39,220,255,.14),rgba(39,220,255,.04))" : "rgba(255,255,255,.035)", color: "inherit", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 12 }}>{exercise.title}</b><span style={{ fontSize: 10, opacity: .62 }}>{"★".repeat(exercise.difficulty)}</span></div>
                  <div style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.35, opacity: .72 }}>{exercise.subtitle}</div>
                  <div style={{ marginTop: 8, fontSize: 9.5, opacity: .55 }}>{exercise.maxDarts} fléchettes max</div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: "1px solid rgba(39,220,255,.18)", background: "rgba(39,220,255,.055)" }}>
            <div style={{ fontSize: 10, opacity: .62 }}>SÉLECTION</div>
            <div style={{ marginTop: 3, fontWeight: 950 }}>{selected.title}</div>
            <div style={{ marginTop: 4, fontSize: 11, opacity: .72 }}>{selected.subtitle}</div>
          </div>

          <TrainingStartButton disabled={!resolved.length} label={resolved.length > 1 ? `LANCER — ${resolved.length} JOUEURS` : "LANCER L'EXERCICE"} onClick={() => onStart({ exerciseId: selected.id, family: selected.family, ...buildTrainingParticipantConfig(participants, profiles) })} />
        </div>
      }
    />
  );
}
