import {
  TRAINING_EXERCISE_CATALOG,
  type TrainingExerciseFamily,
} from "./trainingExerciseCatalog";

export type TrainingProgramDefinition = {
  id: string;
  title: string;
  subtitle: string;
  durationMin: 15 | 30 | 45;
  level: "Express" | "Progression" | "Compétition" | "Coach" | "Personnalisé" | "Évaluation";
  exerciseIds: string[];
  accent?: string;
  focusFamily?: TrainingExerciseFamily | "balanced";
};

export type TrainingProgramBuildOptions = {
  durationMin: 15 | 30 | 45;
  focusFamily: TrainingExerciseFamily | "balanced";
  intensity: "accessible" | "standard" | "intense";
};

export const TRAINING_ASSESSMENT_PROGRAM: TrainingProgramDefinition = {
  id: "assessment_30",
  title: "BILAN DE NIVEAU",
  subtitle: "6 tests standardisés • une référence par compétence • à rejouer pour mesurer la progression réelle.",
  durationMin: 30,
  level: "Évaluation",
  exerciseIds: ["score_300_18", "d16_8_hits", "checkout_61", "precision_20_19_18", "bull_10_hits", "repeat_t20_6"],
  focusFamily: "balanced",
  accent: "#ffd86b",
};

export const TRAINING_PROGRAMS: TrainingProgramDefinition[] = [
  TRAINING_ASSESSMENT_PROGRAM,
  {
    id: "express_15",
    title: "EXPRESS 15",
    subtitle: "Échauffement rapide : précision, scoring, double et finish.",
    durationMin: 15,
    level: "Express",
    exerciseIds: ["s20_12_hits", "score_300_18", "d16_8_hits", "checkout_32"],
    focusFamily: "balanced",
  },
  {
    id: "progression_30",
    title: "PROGRESSION 30",
    subtitle: "Séance équilibrée pour travailler toutes les phases d'un leg.",
    durationMin: 30,
    level: "Progression",
    exerciseIds: ["precision_20_19_18", "score_450_21", "t19_10_hits", "d20_8_hits", "checkout_61", "bull_10_hits"],
    focusFamily: "balanced",
  },
  {
    id: "competition_45",
    title: "COMPÉTITION 45",
    subtitle: "Volume, switches, doubles et checkouts sous pression.",
    durationMin: 45,
    level: "Compétition",
    exerciseIds: ["score_600_30", "t20_10_hits", "power_triplets", "d20_8_hits", "d16_8_hits", "checkout_81", "checkout_100", "dbull_3_hits"],
    focusFamily: "balanced",
  },
];

const FAMILY_POOLS: Record<TrainingExerciseFamily, string[]> = {
  scoring: ["t20_10_hits", "score_450_21", "score_600_30", "t19_10_hits"],
  doubles: ["d16_8_hits", "d20_8_hits", "double_core_route", "repeat_d16_5"],
  checkout: ["checkout_40", "checkout_61", "checkout_81", "checkout_100"],
  precision: ["s20_12_hits", "precision_20_19_18", "bull_t20_d20", "clock_singles"],
  bull: ["bull_10_hits", "dbull_3_hits", "bull_dbull_chain", "bull_15_hits"],
  regularity: ["repeat_t20_6", "power_triplets", "switch_20_19_18", "repeat_d16_5"],
};

const BALANCED_ORDER: TrainingExerciseFamily[] = [
  "precision",
  "scoring",
  "regularity",
  "doubles",
  "checkout",
  "bull",
];

function exerciseDifficulty(id: string) {
  return TRAINING_EXERCISE_CATALOG.find((item) => item.id === id)?.difficulty || 3;
}

function uniqueExisting(ids: string[]) {
  const known = new Set(TRAINING_EXERCISE_CATALOG.map((item) => item.id));
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (!known.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function targetSteps(durationMin: 15 | 30 | 45) {
  return durationMin === 15 ? 4 : durationMin === 30 ? 6 : 8;
}

function difficultyRange(intensity: TrainingProgramBuildOptions["intensity"]): [number, number] {
  if (intensity === "accessible") return [1, 3];
  if (intensity === "intense") return [3, 5];
  return [2, 4];
}

function sortPoolForIntensity(ids: string[], intensity: TrainingProgramBuildOptions["intensity"]) {
  const [min, max] = difficultyRange(intensity);
  const preferred = ids.filter((id) => {
    const difficulty = exerciseDifficulty(id);
    return difficulty >= min && difficulty <= max;
  });
  const fallback = ids.filter((id) => !preferred.includes(id));
  return [...preferred, ...fallback];
}

export function buildCustomProgram(options: TrainingProgramBuildOptions): TrainingProgramDefinition {
  const steps = targetSteps(options.durationMin);
  const ids: string[] = [];

  if (options.focusFamily === "balanced") {
    let cursor = 0;
    while (ids.length < steps && cursor < steps * 4) {
      const family = BALANCED_ORDER[cursor % BALANCED_ORDER.length];
      const pool = sortPoolForIntensity(FAMILY_POOLS[family], options.intensity);
      const candidate = pool[Math.floor(cursor / BALANCED_ORDER.length) % pool.length];
      if (candidate && !ids.includes(candidate)) ids.push(candidate);
      cursor += 1;
    }
  } else {
    const focusPool = sortPoolForIntensity(FAMILY_POOLS[options.focusFamily], options.intensity);
    const supportFamilies = BALANCED_ORDER.filter((family) => family !== options.focusFamily);
    const focusTarget = Math.max(2, Math.ceil(steps * 0.6));

    for (const id of focusPool) {
      if (ids.length >= focusTarget) break;
      if (!ids.includes(id)) ids.push(id);
    }

    let supportIndex = 0;
    while (ids.length < steps && supportIndex < supportFamilies.length * 4) {
      const family = supportFamilies[supportIndex % supportFamilies.length];
      const pool = sortPoolForIntensity(FAMILY_POOLS[family], options.intensity);
      const candidate = pool[Math.floor(supportIndex / supportFamilies.length) % pool.length];
      if (candidate && !ids.includes(candidate)) ids.push(candidate);
      supportIndex += 1;
    }
  }

  const exerciseIds = uniqueExisting(ids).slice(0, steps);
  const focusLabel = options.focusFamily === "balanced" ? "ÉQUILIBRÉ" : options.focusFamily.toUpperCase();
  const intensityLabel = options.intensity === "accessible" ? "accessible" : options.intensity === "intense" ? "intense" : "standard";

  return {
    id: `custom_${options.durationMin}_${options.focusFamily}_${options.intensity}`,
    title: `SUR MESURE ${options.durationMin}`,
    subtitle: `${focusLabel} • intensité ${intensityLabel} • ${exerciseIds.length} étapes générées automatiquement.`,
    durationMin: options.durationMin,
    level: "Personnalisé",
    exerciseIds,
    focusFamily: options.focusFamily,
  };
}

export function buildCoachProgram(family: TrainingExerciseFamily): TrainingProgramDefinition {
  const focus = FAMILY_POOLS[family] || FAMILY_POOLS.precision;
  return {
    id: `coach_${family}`,
    title: `AWENA — ${family.toUpperCase()}`,
    subtitle: "Programme adaptatif construit autour de ta compétence la plus fragile.",
    durationMin: 30,
    level: "Coach",
    exerciseIds: ["s20_12_hits", focus[0], focus[1], "score_300_18", focus[2], "checkout_40"],
    focusFamily: family,
  };
}
