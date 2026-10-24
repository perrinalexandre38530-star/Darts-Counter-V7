import type { TrainingExerciseFamily } from "./trainingExerciseCatalog";

export type TrainingProgramDefinition = {
  id: string;
  title: string;
  subtitle: string;
  durationMin: 15 | 30 | 45;
  level: "Express" | "Progression" | "Compétition" | "Coach";
  exerciseIds: string[];
  accent?: string;
};

export const TRAINING_PROGRAMS: TrainingProgramDefinition[] = [
  {
    id: "express_15",
    title: "EXPRESS 15",
    subtitle: "Échauffement rapide : précision, scoring, double et finish.",
    durationMin: 15,
    level: "Express",
    exerciseIds: ["s20_12_hits", "score_300_18", "d16_8_hits", "checkout_32"],
  },
  {
    id: "progression_30",
    title: "PROGRESSION 30",
    subtitle: "Séance équilibrée pour travailler toutes les phases d'un leg.",
    durationMin: 30,
    level: "Progression",
    exerciseIds: ["precision_20_19_18", "score_450_21", "t19_10_hits", "d20_8_hits", "checkout_61", "bull_10_hits"],
  },
  {
    id: "competition_45",
    title: "COMPÉTITION 45",
    subtitle: "Volume, switches, doubles et checkouts sous pression.",
    durationMin: 45,
    level: "Compétition",
    exerciseIds: ["score_600_30", "t20_10_hits", "power_triplets", "d20_8_hits", "d16_8_hits", "checkout_81", "checkout_100", "dbull_3_hits"],
  },
];

const FAMILY_POOLS: Record<TrainingExerciseFamily, string[]> = {
  scoring: ["t20_10_hits", "score_450_21", "score_600_30"],
  doubles: ["d16_8_hits", "d20_8_hits", "double_core_route"],
  checkout: ["checkout_40", "checkout_61", "checkout_81"],
  precision: ["s20_12_hits", "precision_20_19_18", "bull_t20_d20"],
  bull: ["bull_10_hits", "dbull_3_hits", "bull_dbull_chain"],
  regularity: ["repeat_t20_6", "power_triplets", "switch_20_19_18"],
};

export function buildCoachProgram(family: TrainingExerciseFamily): TrainingProgramDefinition {
  const focus = FAMILY_POOLS[family] || FAMILY_POOLS.precision;
  return {
    id: `coach_${family}`,
    title: `AWENA — ${family.toUpperCase()}`,
    subtitle: "Programme adaptatif construit autour de ta compétence la plus fragile.",
    durationMin: 30,
    level: "Coach",
    exerciseIds: ["s20_12_hits", focus[0], focus[1], "score_300_18", focus[2], "checkout_40"],
  };
}
