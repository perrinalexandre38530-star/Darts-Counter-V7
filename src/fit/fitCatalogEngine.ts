import { FIT_EXERCISES, registerExternalFitExercises, type FitExercise } from "./fitStore";
import { getCachedFreeExerciseCatalog, loadFreeExerciseCatalog } from "./freeExerciseCatalog";
import { getCachedWgerExerciseCatalog, loadWgerExerciseCatalog } from "./wgerExerciseCatalog";

export type FitCatalogSourceId = "mss" | "free-exercise-db" | "wger";
export type FitCatalogSourceSummary = { id: FitCatalogSourceId; label: string; count: number; available: boolean };
export type FitCatalogSnapshot = { exercises: FitExercise[]; sources: FitCatalogSourceSummary[]; rawCount: number; duplicateCount: number };

const REDUNDANT_VARIANT_WORDS = new Set([
  "exercise", "movement", "version", "variation", "variant",
  "powerlifting", "bodybuilding", "strength", "fitness",
  "beginner", "intermediate", "advanced", "male", "female",
  "medium", "standard", "classic", "regular",
]);

function normalizeName(value: string): string {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(push[ -]?ups?)\b/g, "push up")
    .replace(/\b(pull[ -]?ups?)\b/g, "pull up")
    .replace(/\b(lat pulldowns?)\b/g, "lat pulldown")
    .replace(/\b(bicep curls?)\b/g, "biceps curl")
    .replace(/\b(tricep pushdowns?)\b/g, "triceps pushdown")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function equipmentNoiseWords(exercise: FitExercise): Set<string> {
  const out = new Set<string>();
  if (exercise.equipment === "Barre") ["barbell", "bar", "barre"].forEach((word) => out.add(word));
  if (exercise.equipment === "Haltères") ["dumbbell", "dumbbells"].forEach((word) => out.add(word));
  if (exercise.equipment === "Kettlebell") ["kettlebell", "kettlebells"].forEach((word) => out.add(word));
  if (exercise.equipment === "Poulie") ["cable", "cables", "pulley"].forEach((word) => out.add(word));
  if (exercise.equipment === "Machine") ["machine"].forEach((word) => out.add(word));
  if (exercise.equipment === "Élastique") ["band", "bands", "resistance"].forEach((word) => out.add(word));
  return out;
}

/**
 * Collapse only cosmetic/redundant naming differences.
 * Meaningful variants (incline/decline/close-grip/bands/smith/etc.) remain separate.
 */
function canonicalVariantName(exercise: FitExercise): string {
  const normalized = normalizeName(exercise.name);
  if (!normalized) return "";
  const equipmentNoise = equipmentNoiseWords(exercise);
  const tokens = normalized.split(" ").filter(Boolean);
  const cleaned = tokens.filter((token, index) => {
    if (REDUNDANT_VARIANT_WORDS.has(token)) return false;
    if (equipmentNoise.has(token)) return false;
    // "grip" alone is catalog noise, but preserve close/wide/reverse grip modifiers.
    if (token === "grip") {
      const previous = tokens[index - 1];
      if (["close", "wide", "reverse", "neutral", "narrow"].includes(previous)) return true;
      return false;
    }
    return true;
  });
  return cleaned.join(" ").replace(/\s+/g, " ").trim();
}

function richness(exercise: FitExercise): number {
  let score = 0;
  if (exercise.source === "free-exercise-db") score += 28;
  else if (exercise.source === "wger") score += 24;
  else score += 18;
  score += Math.min(30, (exercise.instructions?.length || 0) * 3);
  score += Math.min(28, (exercise.imagePaths?.length || 0) * 7);
  score += Math.min(12, (exercise.videoUrls?.length || 0) * 4);
  if (exercise.motionKey) score += 8;
  if (exercise.muscle !== "Full body") score += 4;
  if (exercise.equipment !== "Autre") score += 3;
  if (exercise.rawPrimaryMuscles?.length) score += 2;
  return score;
}

function signature(exercise: FitExercise): string {
  const name = canonicalVariantName(exercise) || normalizeName(exercise.name);
  if (!name) return `id:${exercise.id}`;
  return `${name}|${exercise.muscle}|${exercise.equipment}`;
}

function preferExercise(current: FitExercise | undefined, candidate: FitExercise): FitExercise {
  if (!current) return candidate;
  const currentScore = richness(current);
  const candidateScore = richness(candidate);
  if (candidateScore !== currentScore) return candidateScore > currentScore ? candidate : current;
  // Stable tie-break: Free Exercise DB > wger > MSS, then shorter/cleaner English title.
  const sourceRank = (exercise: FitExercise) => exercise.source === "free-exercise-db" ? 3 : exercise.source === "wger" ? 2 : 1;
  if (sourceRank(candidate) !== sourceRank(current)) return sourceRank(candidate) > sourceRank(current) ? candidate : current;
  if (candidate.name.length !== current.name.length) return candidate.name.length < current.name.length ? candidate : current;
  return candidate.name.localeCompare(current.name, "en", { sensitivity: "base" }) < 0 ? candidate : current;
}

export function mergeFitExerciseCatalogs(catalogs: FitExercise[][]): FitExercise[] {
  const byId = new Map<string, FitExercise>();
  for (const catalogue of catalogs) {
    for (const exercise of catalogue) {
      if (!exercise?.id || !exercise?.name) continue;
      byId.set(exercise.id, preferExercise(byId.get(exercise.id), exercise));
    }
  }

  const bySignature = new Map<string, FitExercise>();
  for (const exercise of byId.values()) {
    const key = signature(exercise);
    bySignature.set(key, preferExercise(bySignature.get(key), exercise));
  }

  return [...bySignature.values()].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
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
