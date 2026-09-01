import type { FitExercise } from "./fitStore";
import { contentPackAssetUrl } from "../lib/contentPacks";

export type FitMocapSource = "cmu" | "mocapflow" | "procedural";
export type FitMocapFormat = "bvh" | "glb" | "fbx";

export type FitMocapBinding = {
  motionKey: string;
  source: FitMocapSource;
  sourceMotionId?: string;
  localAsset?: string;
  remoteAsset?: string;
  format?: FitMocapFormat;
  license: string;
  note?: string;
};

/**
 * Legal/source registry for FIT PERF motion assets.
 *
 * Only verified source IDs belong here. A motion must NOT be marked as CMU or
 * MocapFlow simply because it looks similar. Until the source file is imported
 * and checked, the procedural driver remains the safe fallback.
 */
export const FIT_MOCAP_BINDINGS: Record<string, FitMocapBinding> = {
  squat: {
    motionKey: "squat",
    source: "cmu",
    sourceMotionId: "22_14",
    format: "bvh",
    localAsset: contentPackAssetUrl("fit-awena", "mocap/cmu/22_14.bvh"),
    remoteAsset: "https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/022/22_14.bvh",
    license: "CMU Graphics Lab Motion Capture Database usage terms + Bruce Hahne BVH conversion (no additional restrictions)",
    note: "Verified source: CMU subject 22 trial 14 = alternating squats (subject A). FIT PERF now loads the checked BVH through a local-first/cache-first runtime, with the procedural motion as a non-blocking fallback.",
  },
  bench: { motionKey: "bench", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  "incline-db": { motionKey: "incline-db", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  "cable-fly": { motionKey: "cable-fly", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  pullup: { motionKey: "pullup", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  row: { motionKey: "row", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  "lat-pulldown": { motionKey: "lat-pulldown", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  ohp: { motionKey: "ohp", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  "lateral-raise": { motionKey: "lateral-raise", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  curl: { motionKey: "curl", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  "triceps-push": { motionKey: "triceps-push", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  "leg-press": { motionKey: "leg-press", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  rdl: { motionKey: "rdl", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  "hip-thrust": { motionKey: "hip-thrust", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  calf: { motionKey: "calf", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  plank: { motionKey: "plank", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  deadlift: { motionKey: "deadlift", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
  goblet: { motionKey: "goblet", source: "procedural", license: "MULTISPORTS SCORING original procedural animation" },
};

export function resolveFitMotionKey(exercise: FitExercise): string | null {
  const explicit = String(exercise.motionKey || "").trim();
  if (explicit && FIT_MOCAP_BINDINGS[explicit]) return explicit;
  if (FIT_MOCAP_BINDINGS[exercise.id]) return exercise.id;
  return explicit || null;
}

export function getFitMocapBinding(exercise: FitExercise): FitMocapBinding | null {
  const key = resolveFitMotionKey(exercise);
  return key ? FIT_MOCAP_BINDINGS[key] || null : null;
}
