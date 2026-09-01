import { contentPackAssetUrl } from "../lib/contentPacks";
export type AwenaPremiumVideoSource = {
  src: string;
  type: "video/webm" | "video/mp4";
};

export type AwenaPremiumVideo = {
  sources: AwenaPremiumVideoSource[];
  poster?: string;
};

export type AwenaPremiumFrameSequence = {
  frames: string[];
  poster?: string;
  fps: number;
  /** Optional playback order using zero-based indexes into `frames`. */
  order?: number[];
};

export type AwenaPremiumMotionSlot = {
  exerciseId: string;
  label: string;
  video?: AwenaPremiumVideo;
  frameSequence?: AwenaPremiumFrameSequence;
};

const ROOT = contentPackAssetUrl("fit-awena", "motions/awena/premium");

function frames(exerciseId: string, count: number, fps: number, order?: number[]): AwenaPremiumFrameSequence {
  const dir = `${ROOT}/${exerciseId}`;
  return {
    frames: Array.from({ length: count }, (_, index) => `${dir}/frames/frame-${String(index + 1).padStart(2, "0")}.webp`),
    poster: `${dir}/poster.webp`,
    fps,
    order,
  };
}

/**
 * AWENA PREMIUM MOTION CATALOG
 *
 * Every FIT PERF exercise owns a stable premium slot. A slot may contain:
 *  1. a premium WebM/MP4 loop (highest priority),
 *  2. a frame sequence (second priority),
 *  3. no premium media yet, in which case the procedural AWENA renderer remains the fallback.
 *
 * To upgrade an exercise later, only add its media files and fill the corresponding
 * `video` and/or `frameSequence` field here. FitExerciseMotion does not need to change.
 */
export const AWENA_PREMIUM_MOTION_SLOTS: Record<string, AwenaPremiumMotionSlot> = {
  bench: {
    exerciseId: "bench",
    label: "Développé couché",
    video: {
      sources: [{ src: `${ROOT}/bench/motion.mp4`, type: "video/mp4" }],
      poster: `${ROOT}/bench/poster.webp`,
    },
    frameSequence: frames("bench", 5, 3.6),
  },
  "incline-db": { exerciseId: "incline-db", label: "Développé incliné" },
  "cable-fly": { exerciseId: "cable-fly", label: "Écarté poulie" },
  pullup: { exerciseId: "pullup", label: "Tractions" },
  row: { exerciseId: "row", label: "Rowing barre" },
  "lat-pulldown": { exerciseId: "lat-pulldown", label: "Tirage vertical" },
  ohp: { exerciseId: "ohp", label: "Développé militaire" },
  "lateral-raise": { exerciseId: "lateral-raise", label: "Élévations latérales" },
  curl: {
    exerciseId: "curl",
    label: "Curl biceps",
    frameSequence: frames("curl", 5, 3.6),
  },
  "triceps-push": { exerciseId: "triceps-push", label: "Extension triceps" },
  pushup: {
    exerciseId: "pushup",
    label: "Pompes / Push Up",
    video: {
      sources: [{ src: `${ROOT}/pushup/motion.webm`, type: "video/webm" }],
      poster: `${ROOT}/pushup/poster.webp`,
    },
  },
  burpee: {
    exerciseId: "burpee",
    label: "Burpee",
    video: {
      sources: [{ src: `${ROOT}/burpee/motion.webm`, type: "video/webm" }],
      poster: `${ROOT}/burpee/poster.webp`,
    },
  },
  squat: {
    exerciseId: "squat",
    label: "Squat",
    video: {
      sources: [{ src: `${ROOT}/squat/motion.mp4`, type: "video/mp4" }],
      poster: `${ROOT}/squat/poster.webp`,
    },
  },
  "leg-press": { exerciseId: "leg-press", label: "Presse à cuisses" },
  rdl: { exerciseId: "rdl", label: "Soulevé de terre roumain" },
  "hip-thrust": { exerciseId: "hip-thrust", label: "Hip thrust" },
  calf: { exerciseId: "calf", label: "Mollets debout" },
  plank: { exerciseId: "plank", label: "Gainage" },
  deadlift: { exerciseId: "deadlift", label: "Soulevé de terre" },
  goblet: { exerciseId: "goblet", label: "Goblet squat" },
};

export function getAwenaPremiumMotion(exerciseId: string): AwenaPremiumMotionSlot | undefined {
  const slot = AWENA_PREMIUM_MOTION_SLOTS[exerciseId];
  if (!slot) return undefined;
  if (!slot.video?.sources?.length && !slot.frameSequence?.frames?.length) return undefined;
  return slot;
}

export function hasAwenaPremiumMotion(exerciseId: string): boolean {
  return Boolean(getAwenaPremiumMotion(exerciseId));
}
