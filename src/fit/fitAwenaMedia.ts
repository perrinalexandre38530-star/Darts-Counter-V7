import type { FitExercise } from "./fitStore";

/**
 * Generated media is never consumed from the raw/review area. Only files that
 * have been explicitly promoted to /approved are visible to the application.
 */
export const FIT_AWENA_LIBRARY_ROOT = "/fit/awena-library";
export const FIT_AWENA_APPROVED_ROOT = `${FIT_AWENA_LIBRARY_ROOT}/approved`;
export const FIT_AWENA_STEP_COUNT_DEFAULT = 4;

export type FitAwenaMedia = {
  assetKey: string;
  videoUrl: string;
  posterUrl: string;
  stepImages: string[];
  transparent: true;
  generated: boolean;
  status: "APPROVED";
};

function cleanAssetPart(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}

export function fitAwenaAssetKey(exercise: Pick<FitExercise, "id" | "name">): string {
  const id = cleanAssetPart(exercise.id);
  const name = cleanAssetPart(exercise.name);
  return id || name || "exercise";
}

/**
 * Deterministic paths for a HUMAN-APPROVED generated AWENA pack.
 * REVIEW/REJECTED folders deliberately have no runtime resolver.
 */
export function fitAwenaGeneratedMedia(exercise: Pick<FitExercise, "id" | "name">, stepCount = FIT_AWENA_STEP_COUNT_DEFAULT): FitAwenaMedia {
  const assetKey = fitAwenaAssetKey(exercise);
  const root = `${FIT_AWENA_APPROVED_ROOT}/${assetKey}`;
  return {
    assetKey,
    videoUrl: `${root}/awena-preview.webm`,
    posterUrl: `${root}/awena-poster.webp`,
    stepImages: Array.from({ length: Math.max(2, Math.min(8, stepCount)) }, (_, index) => `${root}/awena-step-${String(index + 1).padStart(2, "0")}.webp`),
    transparent: true,
    generated: true,
    status: "APPROVED",
  };
}

function motionKey(exercise: FitExercise) {
  const explicit = String(exercise.motionKey || "").toLowerCase().trim();
  if (explicit) return explicit;
  const compact = String(exercise.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (["push up", "push ups", "pushup", "pushups", "standard push up", "standard pushup", "pompes"].includes(compact)) return "pushup";
  if (["bench press", "barbell bench press", "flat barbell bench press", "developpe couche"].includes(compact)) return "bench";
  if (["burpee", "burpees"].includes(compact)) return "burpee";
  if (["squat", "back squat", "barbell back squat"].includes(compact)) return "squat";
  if (["curl biceps", "biceps curl", "barbell curl"].includes(compact)) return "curl";
  return "";
}

/** Existing hand-authored AWENA step images are authoritative. */
export function fitAwenaStepImages(exercise: FitExercise, requestedCount = FIT_AWENA_STEP_COUNT_DEFAULT): string[] {
  const key = motionKey(exercise);
  if (key === "pushup") {
    return [
      "/fit/exercise-media/pushup/awena-step-01-start.webp",
      "/fit/exercise-media/pushup/awena-step-02-descent.webp",
      "/fit/exercise-media/pushup/awena-step-03-bottom.webp",
      "/fit/exercise-media/pushup/awena-step-04-press.webp",
    ];
  }
  if (key === "bench") {
    return [
      "/fit/exercise-media/bench/awena-step-00-setup.webp",
      "/fit/exercise-media/bench/awena-step-02-descent.webp",
      "/fit/exercise-media/bench/awena-step-03-bottom.webp",
      "/fit/exercise-media/bench/awena-step-04-press.webp",
    ];
  }
  if (key === "burpee") {
    return [
      "/fit/exercise-media/burpee/awena-01.webp",
      "/fit/exercise-media/burpee/awena-02.webp",
      "/fit/exercise-media/burpee/awena-03.webp",
      "/fit/exercise-media/burpee/awena-04.webp",
    ];
  }
  // Squat/Curl legacy premium frames are useful motion references/posters, but
  // they are NOT considered final pedagogical step illustrations anymore.
  // Their dedicated APPROVED generated step pack fills this missing component.
  if (key === "squat" || key === "curl") return fitAwenaGeneratedMedia(exercise, requestedCount).stepImages;
  return fitAwenaGeneratedMedia(exercise, requestedCount).stepImages;
}

export function fitAwenaKnownPoster(exercise: FitExercise): string | null {
  const key = motionKey(exercise);
  if (["pushup", "bench", "squat", "curl", "burpee"].includes(key)) return `/fit/motions/awena/premium/${key}/poster.webp`;
  return null;
}

export function fitAwenaKnownVideo(exercise: FitExercise): string | null {
  const key = motionKey(exercise);
  if (key === "pushup" || key === "burpee") return `/fit/motions/awena/premium/${key}/motion.webm`;
  if (key === "bench" || key === "squat") return `/fit/motions/awena/premium/${key}/motion.mp4`;
  return null;
}

export function fitAwenaManualKey(exercise: FitExercise): string {
  return motionKey(exercise);
}
