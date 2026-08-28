import { FIT_EXERCISES, registerExternalFitExercises, type FitExercise } from "./fitStore";
import { getCachedFreeExerciseCatalog, loadFreeExerciseCatalog } from "./freeExerciseCatalog";
import { getCachedWgerExerciseCatalog, loadWgerExerciseCatalog } from "./wgerExerciseCatalog";

export type FitCatalogSourceId = "mss" | "free-exercise-db" | "wger";
export type FitCatalogSourceSummary = { id: FitCatalogSourceId; label: string; count: number; available: boolean };
export type FitCatalogSnapshot = { exercises: FitExercise[]; sources: FitCatalogSourceSummary[]; rawCount: number; duplicateCount: number };

function normalizeName(value: string): string {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(the|a|an|exercise|movement)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function richness(exercise: FitExercise): number {
  let score = exercise.source === "mss" ? 1000 : 0;
  if (exercise.source === "free-exercise-db") score += 30;
  if (exercise.source === "wger") score += 20;
  score += Math.min(20, (exercise.instructions?.length || 0) * 2);
  score += Math.min(12, (exercise.imagePaths?.length || 0) * 4);
  score += Math.min(6, (exercise.videoUrls?.length || 0) * 3);
  if (exercise.muscle !== "Full body") score += 4;
  if (exercise.equipment !== "Autre") score += 2;
  if (exercise.rawPrimaryMuscles?.length) score += 2;
  return score;
}

function signature(exercise: FitExercise): string {
  const name = normalizeName(exercise.name);
  if (!name) return `id:${exercise.id}`;
  return `${name}|${exercise.muscle}|${exercise.equipment}`;
}

export function mergeFitExerciseCatalogs(catalogs: FitExercise[][]): FitExercise[] {
  const byId = new Map<string, FitExercise>();
  for (const catalogue of catalogs) {
    for (const exercise of catalogue) {
      if (!exercise?.id || !exercise?.name) continue;
      const current = byId.get(exercise.id);
      if (!current || richness(exercise) > richness(current)) byId.set(exercise.id, exercise);
    }
  }

  const bySignature = new Map<string, FitExercise>();
  for (const exercise of byId.values()) {
    const key = signature(exercise);
    const current = bySignature.get(key);
    if (!current || richness(exercise) > richness(current)) bySignature.set(key, exercise);
  }
  return [...bySignature.values()].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}

function snapshot(freeExercises: FitExercise[], wgerExercises: FitExercise[]): FitCatalogSnapshot {
  registerExternalFitExercises([...freeExercises, ...wgerExercises]);
  const nativeExercises = FIT_EXERCISES.map((exercise) => ({ ...exercise, source: exercise.source || "mss" as const }));
  const rawCount = nativeExercises.length + freeExercises.length + wgerExercises.length;
  const exercises = mergeFitExerciseCatalogs([nativeExercises, freeExercises, wgerExercises]);
  return {
    exercises,
    rawCount,
    duplicateCount: Math.max(0, rawCount - exercises.length),
    sources: [
      { id: "mss", label: "FIT PERF", count: FIT_EXERCISES.length, available: true },
      { id: "free-exercise-db", label: "Free Exercise DB", count: freeExercises.length, available: freeExercises.length > 0 },
      { id: "wger", label: "wger", count: wgerExercises.length, available: wgerExercises.length > 0 },
    ],
  };
}

export function getCachedFitCatalog(): FitCatalogSnapshot {
  return snapshot(getCachedFreeExerciseCatalog(), getCachedWgerExerciseCatalog());
}

export async function loadFitCatalog(force = false): Promise<FitCatalogSnapshot> {
  const cachedFree = getCachedFreeExerciseCatalog();
  const cachedWger = getCachedWgerExerciseCatalog();
  const [freeResult, wgerResult] = await Promise.allSettled([
    loadFreeExerciseCatalog(force),
    loadWgerExerciseCatalog(force),
  ]);
  const freeExercises = freeResult.status === "fulfilled" ? freeResult.value : cachedFree;
  const wgerExercises = wgerResult.status === "fulfilled" ? wgerResult.value : cachedWger;
  if (!freeExercises.length && !wgerExercises.length && freeResult.status === "rejected" && wgerResult.status === "rejected") {
    throw new Error(`Catalogues externes indisponibles : ${String(freeResult.reason)} / ${String(wgerResult.reason)}`);
  }
  return snapshot(freeExercises, wgerExercises);
}
