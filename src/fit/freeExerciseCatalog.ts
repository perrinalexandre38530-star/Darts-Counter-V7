import {
  FREE_EXERCISE_CACHE_KEY,
  registerExternalFitExercises,
  type FitEquipment,
  type FitExercise,
  type FitMuscle,
} from "./fitStore";
import { FIT_MUSCLE_COLORS, inferGoalTags, inferMovementPattern } from "./fitExerciseTaxonomy";

export const FREE_EXERCISE_DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
export const FREE_EXERCISE_IMAGE_ROOT = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
export const FREE_EXERCISE_DB_REPOSITORY = "https://github.com/yuhonas/free-exercise-db";
export const FREE_EXERCISE_DB_LICENSE = "Unlicense / public domain";

const CACHE_VERSION = 5;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type FreeExerciseDbRow = {
  id?: unknown;
  name?: unknown;
  force?: unknown;
  level?: unknown;
  mechanic?: unknown;
  equipment?: unknown;
  primaryMuscles?: unknown;
  secondaryMuscles?: unknown;
  instructions?: unknown;
  category?: unknown;
  images?: unknown;
};

type FreeExerciseCache = {
  version: number;
  savedAt: number;
  exercises: FitExercise[];
};

const muscleMap: Record<string, FitMuscle> = {
  abdominals: "Abdos",
  abductors: "Abducteurs",
  adductors: "Adducteurs",
  biceps: "Biceps",
  calves: "Mollets",
  chest: "Pectoraux",
  forearms: "Avant-bras",
  glutes: "Fessiers",
  hamstrings: "Ischios",
  lats: "Dos",
  "lower back": "Lombaires",
  "middle back": "Dos",
  neck: "Cou",
  quadriceps: "Quadriceps",
  shoulders: "Épaules",
  traps: "Dos",
  triceps: "Triceps",
};

const muscleIcon: Record<FitMuscle, string> = {
  Pectoraux: "▰",
  Dos: "≋",
  Lombaires: "⌁",
  Épaules: "↔",
  Biceps: "◜",
  Triceps: "⇢",
  "Avant-bras": "⌇",
  Quadriceps: "⌄",
  Ischios: "⌁",
  Fessiers: "◓",
  Adducteurs: "◢",
  Abducteurs: "◣",
  Mollets: "⌃",
  Abdos: "▬",
  Cou: "◇",
  "Full body": "◆",
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asString).filter(Boolean) : [];
}

function mapMuscle(value: string): FitMuscle {
  return muscleMap[value.trim().toLowerCase()] || "Full body";
}

function mapEquipment(value: string): FitEquipment {
  const key = value.trim().toLowerCase();
  if (!key || key === "body only" || key === "bodyweight" || key === "none") return "Poids du corps";
  if (key.includes("barbell") || key.includes("e-z")) return "Barre";
  if (key.includes("dumbbell")) return "Haltères";
  if (key.includes("kettlebell")) return "Kettlebell";
  if (key.includes("cable")) return "Poulie";
  if (key.includes("machine") || key.includes("sled")) return "Machine";
  if (key.includes("band")) return "Élastique";
  if (key.includes("trx") || key.includes("suspension")) return "TRX";
  if (key.includes("bench")) return "Banc";
  if (key.includes("medicine ball") || key.includes("med ball")) return "Médecine ball";
  return "Autre";
}

function cleanEnglishTitle(value: string): string {
  return value
    .replace(/[_]+/g, " ")
    .replace(/\s*[-–—]\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferMotionKey(name: string): string | undefined {
  const compact = cleanEnglishTitle(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (["push up", "push ups", "pushup", "pushups", "standard push up", "standard pushup"].includes(compact)) return "pushup";
  if (["burpee", "burpees", "standard burpee"].includes(compact)) return "burpee";
  if (["bench press", "barbell bench press", "flat barbell bench press", "barbell bench press medium grip"].includes(compact)) return "bench";
  if (["squat", "barbell squat", "back squat", "barbell back squat"].includes(compact)) return "squat";
  if (["goblet squat", "kettlebell goblet squat"].includes(compact)) return "goblet";
  if (["romanian deadlift", "barbell romanian deadlift"].includes(compact)) return "rdl";
  if (["deadlift", "barbell deadlift", "conventional deadlift"].includes(compact)) return "deadlift";
  if (["hip thrust", "barbell hip thrust"].includes(compact)) return "hip-thrust";
  if (["leg press", "machine leg press"].includes(compact)) return "leg-press";
  if (["standing calf raise", "calf raise", "machine calf raise"].includes(compact)) return "calf";
  if (["plank", "front plank"].includes(compact)) return "plank";
  if (["pull up", "pullup", "pull ups", "pullups"].includes(compact)) return "pullup";
  if (["lat pulldown", "wide grip lat pulldown"].includes(compact)) return "lat-pulldown";
  if (["barbell row", "bent over barbell row", "bent over row"].includes(compact)) return "row";
  if (["lateral raise", "dumbbell lateral raise", "side lateral raise"].includes(compact)) return "lateral-raise";
  if (["overhead press", "military press", "barbell overhead press", "shoulder press"].includes(compact)) return "ohp";
  if (["triceps pushdown", "tricep pushdown", "cable triceps pushdown"].includes(compact)) return "triceps-push";
  if (["biceps curl", "dumbbell biceps curl", "dumbbell curl"].includes(compact)) return "curl";
  if (["incline dumbbell press", "incline dumbbell bench press"].includes(compact)) return "incline-db";
  if (["cable fly", "cable chest fly", "cable crossover"].includes(compact)) return "cable-fly";
  return undefined;
}

function normalizeRow(row: FreeExerciseDbRow): FitExercise | null {
  const sourceId = asString(row.id);
  const sourceName = cleanEnglishTitle(asString(row.name));
  const name = sourceName.toLowerCase() === "barbell bench press - medium grip" ? "Bench Press" : sourceName;
  if (!sourceId || !name) return null;
  const primary = asStringArray(row.primaryMuscles);
  const secondary = asStringArray(row.secondaryMuscles);
  const muscle = primary.length ? mapMuscle(primary[0]) : "Full body";
  const secondaryMapped = Array.from(new Set([...primary.slice(1), ...secondary].map(mapMuscle))).filter((entry) => entry !== muscle).slice(0, 4);
  const exercise: FitExercise = {
    id: `fedb:${sourceId}`,
    name,
    muscle,
    secondary: secondaryMapped,
    equipment: mapEquipment(asString(row.equipment)),
    icon: muscleIcon[muscle],
    accent: FIT_MUSCLE_COLORS[muscle],
    source: "free-exercise-db",
    sourceId,
    sourceLicense: FREE_EXERCISE_DB_LICENSE,
    sourceUrl: `${FREE_EXERCISE_DB_REPOSITORY}/blob/main/exercises/${encodeURIComponent(sourceId)}`,
    level: asString(row.level) || undefined,
    category: asString(row.category) || undefined,
    force: asString(row.force) || undefined,
    mechanic: asString(row.mechanic) || undefined,
    rawPrimaryMuscles: primary,
    rawSecondaryMuscles: secondary,
    instructions: asStringArray(row.instructions).slice(0, 10),
    imagePaths: asStringArray(row.images).slice(0, 4),
    motionKey: inferMotionKey(name),
  };
  exercise.movementPattern = inferMovementPattern(exercise);
  exercise.goalTags = inferGoalTags(exercise);
  return exercise;
}

function readCacheEnvelope(): FreeExerciseCache | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FREE_EXERCISE_CACHE_KEY) || "null") as FreeExerciseCache | null;
    if (!parsed || parsed.version !== CACHE_VERSION || !Array.isArray(parsed.exercises)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(exercises: FitExercise[]) {
  if (typeof window === "undefined") return;
  try {
    const cache: FreeExerciseCache = { version: CACHE_VERSION, savedAt: Date.now(), exercises };
    window.localStorage.setItem(FREE_EXERCISE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // The library stays usable in memory even when a browser blocks/quota-limits localStorage.
  }
}

export function getCachedFreeExerciseCatalog(): FitExercise[] {
  const cached = readCacheEnvelope();
  if (!cached) return [];
  registerExternalFitExercises(cached.exercises);
  return cached.exercises;
}

export async function loadFreeExerciseCatalog(force = false): Promise<FitExercise[]> {
  const cached = readCacheEnvelope();
  if (!force && cached?.exercises?.length && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    registerExternalFitExercises(cached.exercises);
    return cached.exercises;
  }

  const response = await fetch(FREE_EXERCISE_DB_URL, { cache: force ? "reload" : "default" });
  if (!response.ok) throw new Error(`Free Exercise DB HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error("Free Exercise DB: format JSON inattendu");
  const exercises = payload.map((row) => normalizeRow((row || {}) as FreeExerciseDbRow)).filter((row): row is FitExercise => Boolean(row));
  if (!exercises.length) throw new Error("Free Exercise DB: aucun exercice exploitable");
  exercises.sort((a, b) => a.name.localeCompare(b.name, "en"));
  writeCache(exercises);
  registerExternalFitExercises(exercises);
  return exercises;
}

export function freeExerciseImageUrl(exercise: FitExercise, index = 0): string | null {
  const path = exercise.imagePaths?.[index];
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${FREE_EXERCISE_IMAGE_ROOT}${path.split("/").map(encodeURIComponent).join("/")}`;
}
