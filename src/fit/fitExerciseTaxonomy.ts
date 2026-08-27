import type { FitEquipment, FitExercise, FitMuscle } from "./fitStore";

export const FIT_MUSCLE_ORDER: FitMuscle[] = [
  "Pectoraux", "Dos", "Lombaires", "Épaules", "Biceps", "Triceps", "Avant-bras",
  "Abdos", "Fessiers", "Quadriceps", "Ischios", "Adducteurs", "Abducteurs", "Mollets", "Cou", "Full body",
];

export const FIT_MUSCLE_COLORS: Record<FitMuscle, string> = {
  Pectoraux: "#ff6868",
  Dos: "#64d9ff",
  Lombaires: "#42bfff",
  Épaules: "#b79aff",
  Biceps: "#ff8db8",
  Triceps: "#ff6f9e",
  "Avant-bras": "#ffadcc",
  Quadriceps: "#72ed98",
  Ischios: "#58d57d",
  Fessiers: "#63e3a1",
  Adducteurs: "#9be96e",
  Abducteurs: "#55d6ae",
  Mollets: "#49ce83",
  Abdos: "#ff9b66",
  Cou: "#e0c37a",
  "Full body": "#f6c256",
};

export const FIT_MUSCLE_LABELS: Record<FitMuscle, { fr: string; en: string; es: string }> = {
  Pectoraux: { fr: "Pectoraux", en: "Chest", es: "Pectorales" },
  Dos: { fr: "Dos", en: "Back", es: "Espalda" },
  Lombaires: { fr: "Lombaires", en: "Lower back", es: "Lumbares" },
  Épaules: { fr: "Épaules", en: "Shoulders", es: "Hombros" },
  Biceps: { fr: "Biceps", en: "Biceps", es: "Bíceps" },
  Triceps: { fr: "Triceps", en: "Triceps", es: "Tríceps" },
  "Avant-bras": { fr: "Avant-bras", en: "Forearms", es: "Antebrazos" },
  Quadriceps: { fr: "Quadriceps", en: "Quadriceps", es: "Cuádriceps" },
  Ischios: { fr: "Ischios", en: "Hamstrings", es: "Isquiotibiales" },
  Fessiers: { fr: "Fessiers", en: "Glutes", es: "Glúteos" },
  Adducteurs: { fr: "Adducteurs", en: "Adductors", es: "Aductores" },
  Abducteurs: { fr: "Abducteurs", en: "Abductors", es: "Abductores" },
  Mollets: { fr: "Mollets", en: "Calves", es: "Gemelos" },
  Abdos: { fr: "Abdos", en: "Abs", es: "Abdominales" },
  Cou: { fr: "Cou", en: "Neck", es: "Cuello" },
  "Full body": { fr: "Corps entier", en: "Full body", es: "Cuerpo completo" },
};

export const FIT_EQUIPMENT_ORDER: FitEquipment[] = [
  "Poids du corps", "Haltères", "Barre", "Poulie", "Machine", "Kettlebell", "Élastique", "TRX", "Banc", "Médecine ball", "Autre",
];

export type FitLevelFilter = "Tous" | "Débutant" | "Intermédiaire" | "Avancé";
export type FitMovementFilter = "Tous" | "Poussée" | "Tirage" | "Squat" | "Charnière" | "Isolation" | "Gainage" | "Mobilité" | "Cardio" | "Autre";
export type FitGoalFilter = "Tous" | "Force" | "Hypertrophie" | "Endurance" | "Mobilité" | "Explosivité" | "Cardio";

export function normalizeLevel(level?: string): Exclude<FitLevelFilter, "Tous"> | "" {
  const key = String(level || "").trim().toLowerCase();
  if (!key) return "";
  if (["beginner", "novice", "débutant", "debutant"].includes(key)) return "Débutant";
  if (["intermediate", "intermédiaire", "intermediaire"].includes(key)) return "Intermédiaire";
  if (["expert", "advanced", "avancé", "avance"].includes(key)) return "Avancé";
  return "";
}

export function inferMovementPattern(exercise: Pick<FitExercise, "name" | "category" | "force" | "mechanic" | "movementPattern">): Exclude<FitMovementFilter, "Tous"> {
  if (exercise.movementPattern) return exercise.movementPattern as Exclude<FitMovementFilter, "Tous">;
  const value = `${exercise.name} ${exercise.category || ""} ${exercise.force || ""} ${exercise.mechanic || ""}`.toLowerCase();
  if (/stretch|mobility|mobilit|foam roll|dynamic/.test(value)) return "Mobilité";
  if (/cardio|running|run |jog|jump rope|burpee|mountain climber|jumping jack/.test(value)) return "Cardio";
  if (/plank|crunch|sit.?up|ab wheel|core|gainage|leg raise/.test(value)) return "Gainage";
  if (/deadlift|romanian|stiff|good morning|hip hinge|pull through|swing/.test(value)) return "Charnière";
  if (/squat|lunge|split squat|step.?up|leg press/.test(value)) return "Squat";
  if (/row|pull.?up|chin.?up|pulldown|pull down|face pull/.test(value)) return "Tirage";
  if (/press|push.?up|dip|pushdown|push down/.test(value)) return "Poussée";
  if (/curl|extension|raise|fly|flye|kickback|calf|adductor|abductor/.test(value)) return "Isolation";
  return "Autre";
}


export function inferGoalTags(exercise: Pick<FitExercise, "name" | "category" | "force" | "mechanic" | "goalTags">): Exclude<FitGoalFilter, "Tous">[] {
  if (exercise.goalTags?.length) return exercise.goalTags as Exclude<FitGoalFilter, "Tous">[];
  const value = `${exercise.name} ${exercise.category || ""} ${exercise.force || ""} ${exercise.mechanic || ""}`.toLowerCase();
  const tags = new Set<Exclude<FitGoalFilter, "Tous">>();
  if (/stretch|mobility|mobilit|foam roll/.test(value)) tags.add("Mobilité");
  if (/cardio|running|jog|cycling|rope|elliptical/.test(value)) { tags.add("Cardio"); tags.add("Endurance"); }
  if (/plyometric|olympic|jump|snatch|clean|jerk|sprint|explosive/.test(value)) tags.add("Explosivité");
  if (/strength|powerlifting|strongman|olympic|compound|press|squat|deadlift|row|pull|curl|extension|raise|fly/.test(value)) { tags.add("Force"); tags.add("Hypertrophie"); }
  if (!tags.size) tags.add("Hypertrophie");
  return [...tags];
}

export function exerciseMatchesMuscle(exercise: FitExercise, muscle: FitMuscle | "Tous"): boolean {
  if (muscle === "Tous") return true;
  return exercise.muscle === muscle || Boolean(exercise.secondary?.includes(muscle));
}

export function muscleExerciseCount(exercises: FitExercise[], muscle: FitMuscle): number {
  return exercises.reduce((count, exercise) => count + (exerciseMatchesMuscle(exercise, muscle) ? 1 : 0), 0);
}
