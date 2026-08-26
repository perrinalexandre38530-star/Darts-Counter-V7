import {
  FREE_EXERCISE_CACHE_KEY,
  registerExternalFitExercises,
  type FitEquipment,
  type FitExercise,
  type FitMuscle,
} from "./fitStore";

export const FREE_EXERCISE_DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
export const FREE_EXERCISE_IMAGE_ROOT = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
export const FREE_EXERCISE_DB_REPOSITORY = "https://github.com/yuhonas/free-exercise-db";
export const FREE_EXERCISE_DB_LICENSE = "Unlicense / public domain";

const CACHE_VERSION = 1;
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
  abductors: "Fessiers",
  adductors: "Quadriceps",
  biceps: "Biceps",
  calves: "Mollets",
  chest: "Pectoraux",
  forearms: "Biceps",
  glutes: "Fessiers",
  hamstrings: "Ischios",
  lats: "Dos",
  "lower back": "Dos",
  "middle back": "Dos",
  neck: "Épaules",
  quadriceps: "Quadriceps",
  shoulders: "Épaules",
  traps: "Dos",
  triceps: "Triceps",
};

const muscleAccent: Record<FitMuscle, string> = {
  Pectoraux: "#f7c948",
  Dos: "#70def4",
  Épaules: "#b69dff",
  Biceps: "#ff8fb8",
  Triceps: "#ff719f",
  Quadriceps: "#72ed98",
  Ischios: "#61d981",
  Fessiers: "#69eca5",
  Mollets: "#54d58a",
  Abdos: "#ff9b66",
  "Full body": "#f58d62",
};

const muscleIcon: Record<FitMuscle, string> = {
  Pectoraux: "▰",
  Dos: "≋",
  Épaules: "↔",
  Biceps: "◜",
  Triceps: "⇢",
  Quadriceps: "⌄",
  Ischios: "⌁",
  Fessiers: "◓",
  Mollets: "⌃",
  Abdos: "▬",
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
  if (key.includes("barbell") || key.includes("e-z") || key === "other") return "Barre";
  if (key.includes("dumbbell")) return "Haltères";
  if (key.includes("kettlebell")) return "Kettlebell";
  if (key.includes("cable")) return "Poulie";
  if (key.includes("machine") || key.includes("sled")) return "Machine";
  return "Poids du corps";
}

function inferMotionKey(name: string): string | undefined {
  const value = name.toLowerCase();
  if (value.includes("goblet") && value.includes("squat")) return "goblet";
  if (value.includes("squat")) return "squat";
  if (value.includes("romanian") && (value.includes("deadlift") || value.includes("stiff"))) return "rdl";
  if (value.includes("deadlift")) return "deadlift";
  if (value.includes("hip thrust") || value.includes("glute bridge")) return "hip-thrust";
  if (value.includes("leg press")) return "leg-press";
  if (value.includes("calf raise")) return "calf";
  if (value.includes("plank")) return "plank";
  if (value.includes("pull-up") || value.includes("pull up") || value.includes("chin-up") || value.includes("chin up")) return "pullup";
  if (value.includes("pulldown") || value.includes("pull-down")) return "lat-pulldown";
  if (value.includes("row")) return "row";
  if (value.includes("lateral raise") || value.includes("side lateral")) return "lateral-raise";
  if (value.includes("shoulder press") || value.includes("military press") || value.includes("overhead press")) return "ohp";
  if (value.includes("tricep") && (value.includes("pushdown") || value.includes("push-down"))) return "triceps-push";
  if (value.includes("curl")) return "curl";
  if (value.includes("incline") && (value.includes("press") || value.includes("bench"))) return "incline-db";
  if ((value.includes("fly") || value.includes("flye")) && value.includes("cable")) return "cable-fly";
  if (value.includes("bench press") || value === "bench press") return "bench";
  return undefined;
}

function normalizeRow(row: FreeExerciseDbRow): FitExercise | null {
  const sourceId = asString(row.id);
  const name = asString(row.name);
  if (!sourceId || !name) return null;
  const primary = asStringArray(row.primaryMuscles);
  const secondary = asStringArray(row.secondaryMuscles);
  const muscle = primary.length ? mapMuscle(primary[0]) : "Full body";
  const secondaryMapped = Array.from(new Set([...primary.slice(1), ...secondary].map(mapMuscle))).filter((entry) => entry !== muscle).slice(0, 4);
  return {
    id: `fedb:${sourceId}`,
    name,
    muscle,
    secondary: secondaryMapped,
    equipment: mapEquipment(asString(row.equipment)),
    icon: muscleIcon[muscle],
    accent: muscleAccent[muscle],
    source: "free-exercise-db",
    sourceId,
    sourceLicense: FREE_EXERCISE_DB_LICENSE,
    level: asString(row.level) || undefined,
    category: asString(row.category) || undefined,
    instructions: asStringArray(row.instructions).slice(0, 10),
    imagePaths: asStringArray(row.images).slice(0, 4),
    motionKey: inferMotionKey(name),
  };
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
  return `${FREE_EXERCISE_IMAGE_ROOT}${path.split("/").map(encodeURIComponent).join("/")}`;
}
