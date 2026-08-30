import type { FitExercise } from "./fitStore";

export const FIT_AWENA_LIBRARY_ROOT = "/fit/awena-library";
export const FIT_AWENA_STEP_COUNT_DEFAULT = 4;

export type FitAwenaMedia = {
  assetKey: string;
  videoUrl: string;
  posterUrl: string;
  stepImages: string[];
  transparent: true;
  generated: boolean;
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

export function fitAwenaGeneratedMedia(exercise: Pick<FitExercise, "id" | "name">, stepCount = FIT_AWENA_STEP_COUNT_DEFAULT): FitAwenaMedia {
  const assetKey = fitAwenaAssetKey(exercise);
  const root = `${FIT_AWENA_LIBRARY_ROOT}/${assetKey}`;
  return {
    assetKey,
    videoUrl: `${root}/awena-preview.webm`,
    posterUrl: `${root}/awena-poster.webp`,
    stepImages: Array.from({ length: Math.max(2, Math.min(8, stepCount)) }, (_, index) => `${root}/awena-step-${String(index + 1).padStart(2, "0")}.webp`),
    transparent: true,
    generated: true,
  };
}

function motionKey(exercise: FitExercise) {
  const explicit = String(exercise.motionKey || "").toLowerCase().trim();
  if (explicit) return explicit;
  const compact = String(exercise.name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (["push up", "push ups", "pushup", "pushups", "standard push up", "standard pushup"].includes(compact)) return "pushup";
  if (["bench press", "barbell bench press", "flat barbell bench press", "developpe couche"].includes(compact)) return "bench";
  if (compact.includes("burpee")) return "burpee";
  return "";
}

/**
 * Existing hand-authored AWENA step images stay authoritative. New catalogue
 * entries follow the generated /fit/awena-library/<exercise-id>/ convention.
 */
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
      "/fit/exercise-media/burpee/awena-03.webp",
      "/fit/exercise-media/burpee/awena-05.webp",
      "/fit/exercise-media/burpee/awena-02.webp",
    ];
  }
  return fitAwenaGeneratedMedia(exercise, requestedCount).stepImages;
}

export function fitAwenaKnownPoster(exercise: FitExercise): string | null {
  const key = motionKey(exercise);
  if (["pushup", "bench", "squat", "curl", "burpee", "deadlift"].includes(key)) return `/fit/motions/awena/premium/${key}/poster.webp`;
  return null;
}

export function fitAwenaKnownVideo(exercise: FitExercise): string | null {
  const key = motionKey(exercise);
  if (key === "pushup" || key === "burpee") return `/fit/motions/awena/premium/${key}/motion.webm`;
  if (key === "bench" || key === "squat") return `/fit/motions/awena/premium/${key}/motion.mp4`;
  return null;
}
